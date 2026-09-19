import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_SECTION_COLORS,
  parseColorSpec,
  readColorOverrides,
  type ColorSpec,
} from "./colors.ts";
import { oneLine } from "./format.ts";

export const DEFAULT_ORDER = [
  "model",
  "reasoning",
  "cost",
  "tokens",
  "cache",
] as const;

export interface SectionConfig {
  enabled?: boolean;
  priority?: number;
}

export interface PiFootSettings {
  order?: string[];
  colors?: Record<string, ColorSpec>;
  separator?: string;
  sections?: Record<string, SectionConfig>;
}

export interface ResolvedPiFootConfig {
  order: readonly string[];
  colors: ReadonlyMap<string, ColorSpec>;
  separator: string;
  sections: ReadonlyMap<string, SectionConfig>;
}

export function defaultPiFootConfig(): ResolvedPiFootConfig {
  return resolvePiFootConfig();
}

export function loadPiFootConfig(
  cwd: string,
  projectConfigDirName = ".pi",
  env: Record<string, string | undefined> = process.env,
): ResolvedPiFootConfig {
  const globalDir = env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
  const global = readPiFootSettings(join(globalDir, "settings.json"));
  const project = readPiFootSettings(join(cwd, projectConfigDirName, "settings.json"));
  return resolvePiFootConfig(global, project, readColorOverrides(env));
}

export function resolvePiFootConfig(
  global: PiFootSettings = {},
  project: PiFootSettings = {},
  environment = new Map<string, ColorSpec>(),
): ResolvedPiFootConfig {
  const colors = new Map<string, ColorSpec>(
    Object.entries(DEFAULT_SECTION_COLORS),
  );
  for (const [section, color] of environment) colors.set(section, color);
  for (const [section, color] of objectColors(global.colors)) colors.set(section, color);
  for (const [section, color] of objectColors(project.colors)) colors.set(section, color);

  const sections = new Map<string, SectionConfig>();
  for (const [section, config] of Object.entries(global.sections ?? {})) {
    if (isSectionConfig(config)) sections.set(section, config);
  }
  for (const [section, config] of Object.entries(project.sections ?? {})) {
    if (isSectionConfig(config)) sections.set(section, config);
  }

  const requestedOrder = project.order ?? global.order;
  const order = normalizeOrder(requestedOrder);

  return {
    order,
    colors,
    separator: oneLine(
      typeof project.separator === "string"
        ? project.separator
        : typeof global.separator === "string"
          ? global.separator
          : " │ ",
    ),
    sections,
  };
}

function readPiFootSettings(path: string): PiFootSettings {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!isRecord(parsed) || !isRecord(parsed.piFoot)) return {};

    const raw = parsed.piFoot;
    const settings: PiFootSettings = {};
    if (Array.isArray(raw.order)) {
      settings.order = raw.order.filter((value): value is string => typeof value === "string");
    }
    if (typeof raw.separator === "string") settings.separator = raw.separator;

    if (isRecord(raw.colors)) {
      const colors: Record<string, ColorSpec> = {};
      for (const [section, value] of Object.entries(raw.colors)) {
        const color = parseColorSpec(value);
        if (color !== undefined) colors[section] = color;
      }
      settings.colors = colors;
    }

    if (isRecord(raw.sections)) {
      const sections: Record<string, SectionConfig> = {};
      for (const [section, value] of Object.entries(raw.sections)) {
        if (isSectionConfig(value)) sections[section] = value;
      }
      settings.sections = sections;
    }
    return settings;
  } catch {
    return {};
  }
}

function objectColors(value: Record<string, ColorSpec> | undefined): Map<string, ColorSpec> {
  const colors = new Map<string, ColorSpec>();
  if (!value) return colors;
  for (const [section, color] of Object.entries(value)) {
    const parsed = parseColorSpec(color);
    if (parsed !== undefined) colors.set(section, parsed);
  }
  return colors;
}

function normalizeOrder(order: string[] | undefined): string[] {
  const values = Array.isArray(order) ? order : [...DEFAULT_ORDER];
  const unique = values.filter(
    (value, index): value is string =>
      typeof value === "string" && value.trim().length > 0 && values.indexOf(value) === index,
  );
  for (const section of DEFAULT_ORDER) {
    if (!unique.includes(section)) unique.push(section);
  }
  return unique;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSectionConfig(value: unknown): value is SectionConfig {
  if (!isRecord(value)) return false;
  return (value.enabled === undefined || typeof value.enabled === "boolean")
    && (value.priority === undefined || typeof value.priority === "number");
}
