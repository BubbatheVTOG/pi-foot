import { stripAnsi } from "./format.ts";
import type { FooterTheme } from "./registry.ts";

export type ColorSpec = string | number;

const THEME_COLORS = new Set([
  "accent",
  "border",
  "borderAccent",
  "borderMuted",
  "success",
  "error",
  "warning",
  "muted",
  "dim",
  "text",
  "thinkingText",
  "scrollbarTrack",
  "scrollbarThumb",
  "searchMatchText",
  "userMessageText",
  "customMessageText",
  "customMessageLabel",
  "toolTitle",
  "toolOutput",
  "mdHeading",
  "mdLink",
  "mdLinkUrl",
  "mdCode",
  "mdCodeBlock",
  "mdCodeBlockBorder",
  "mdQuote",
  "mdQuoteBorder",
  "mdHr",
  "mdListBullet",
  "toolDiffAdded",
  "toolDiffRemoved",
  "toolDiffContext",
  "syntaxComment",
  "syntaxKeyword",
  "syntaxFunction",
  "syntaxVariable",
  "syntaxString",
  "syntaxNumber",
  "syntaxType",
  "syntaxOperator",
  "syntaxPunctuation",
  "thinkingOff",
  "thinkingMinimal",
  "thinkingLow",
  "thinkingMedium",
  "thinkingHigh",
  "thinkingXhigh",
  "thinkingMax",
  "bashMode",
]);

const SECTION_NAMES = [
  "model",
  "thinking",
  "tokens",
  "cache",
  "cost",
  "branch",
  "status",
  "registry",
];

export const DEFAULT_SECTION_COLORS: Readonly<Record<string, ColorSpec>> = {
  model: "accent",
  thinking: "muted",
  tokens: "muted",
  cache: "muted",
  cost: "muted",
  branch: "muted",
  status: "muted",
};

export function readColorOverrides(
  env: Record<string, string | undefined> = process.env,
): Map<string, ColorSpec> {
  const overrides = new Map<string, ColorSpec>();
  const json = env.PI_FOOT_COLORS?.trim();

  if (json) {
    try {
      const parsed: unknown = JSON.parse(json);
      if (isRecord(parsed)) {
        for (const [section, value] of Object.entries(parsed)) {
          const color = parseColorSpec(value);
          if (color !== undefined) overrides.set(section, color);
        }
      }
    } catch {
      // Invalid optional environment configuration falls back to theme defaults.
    }
  }

  for (const section of SECTION_NAMES) {
    const variable = `PI_FOOT_COLOR_${section.toUpperCase()}`;
    const color = parseColorSpec(env[variable]);
    if (color !== undefined) overrides.set(section, color);
  }

  return overrides;
}

export function parseColorSpec(value: unknown): ColorSpec | undefined {
  if (typeof value === "number") return isXtermColor(value) ? value : undefined;
  if (typeof value !== "string") return undefined;

  const color = value.trim();
  if (!color) return undefined;
  if (THEME_COLORS.has(color)) return color;
  if (color.startsWith("theme:")) {
    const themeColor = color.slice("theme:".length);
    return THEME_COLORS.has(themeColor) ? themeColor : undefined;
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;

  const ansi =
    /^(?:ansi|terminal):([0-9]{1,3})$/i.exec(color) ??
    /^(?:[0-9]{1,3})$/.exec(color);
  if (ansi) {
    const value = Number(ansi[1] ?? ansi[0]);
    return isXtermColor(value) ? value : undefined;
  }

  const rgb =
    /^(?:(?:rgb:)|(?:rgb\())?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/i.exec(
      color,
    );
  if (rgb) {
    const values = rgb.slice(1).map(Number);
    if (values.every((value) => value >= 0 && value <= 255)) {
      return `#${values.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    }
  }

  return undefined;
}

export function colorize(
  theme: FooterTheme,
  text: string,
  color: ColorSpec | undefined,
): string {
  const plainText = stripAnsi(text);
  if (color === undefined) return text;
  if (typeof color === "number")
    return `\u001b[38;5;${color}m${plainText}\u001b[39m`;
  if (color.startsWith("#")) {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    return `\u001b[38;2;${red};${green};${blue}m${plainText}\u001b[39m`;
  }
  return theme.fg(color, plainText);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isXtermColor(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}
