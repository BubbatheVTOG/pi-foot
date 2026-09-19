import type { ReadonlyFooterDataProvider } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
  colorize,
  DEFAULT_SECTION_COLORS,
  readColorOverrides,
} from "./colors.ts";
import {
  fitText,
  formatCost,
  formatTokens,
  oneLine,
  stripAnsi,
} from "./format.ts";
import {
  getPiFootRegistry,
  type FooterRenderContext,
  type FooterSection,
  type FooterTheme,
  type PiFootRegistry,
} from "./registry.ts";
import { collectTelemetry, type SessionEntryLike } from "./telemetry.ts";

interface FooterRuntime {
  modelId: string | undefined;
  thinkingLevel: string | undefined;
  entries: readonly SessionEntryLike[];
}

interface Candidate {
  text: string;
  priority: number;
  order: number;
  required?: boolean;
}

const SEPARATOR = " │ ";

export function renderFooter(
  width: number,
  theme: FooterTheme,
  footerData: ReadonlyFooterDataProvider,
  runtime: FooterRuntime,
  registry: PiFootRegistry = getPiFootRegistry(),
): string[] {
  if (width <= 0) return [""];

  const telemetry = collectTelemetry(runtime.entries);
  const statuses = footerData.getExtensionStatuses();
  const branch = footerData.getGitBranch();
  const colors = new Map<string, string | number>(
    Object.entries(DEFAULT_SECTION_COLORS),
  );
  for (const [section, color] of readColorOverrides())
    colors.set(section, color);
  for (const [section, color] of registry.getColors())
    colors.set(section, color);
  const context: FooterRenderContext = {
    width,
    separator: colorize(theme, SEPARATOR, colors.get("separator")),
    theme,
    statuses,
    branch,
    telemetry,
    colors,
  };

  const candidates = createCandidates(context, runtime, registry);
  const selected = selectCandidates(candidates, width);
  const line = selected
    .map((candidate) => candidate.text)
    .join(context.separator);

  return [truncateToWidth(line, width)];
}

function createCandidates(
  context: FooterRenderContext,
  runtime: FooterRuntime,
  registry: PiFootRegistry,
): Candidate[] {
  const telemetry = context.telemetry;
  const candidates: Candidate[] = [
    {
      text: colorize(
        context.theme,
        `MODEL ${oneLine(runtime.modelId ?? "no-model")}`,
        sectionColor(context, "model"),
      ),
      priority: 1_000,
      order: 0,
      required: true,
    },
    {
      text: colorize(
        context.theme,
        `REASON ${oneLine(runtime.thinkingLevel ?? "off")}`,
        sectionColor(context, "reasoning") ?? sectionColor(context, "thinking"),
      ),
      priority: 90,
      order: 1,
    },
    {
      text: colorize(
        context.theme,
        `COST ${formatCost(telemetry.cost)}`,
        sectionColor(context, "cost"),
      ),
      priority: 80,
      order: 2,
    },
    {
      text: colorize(
        context.theme,
        `IN ${formatTokens(telemetry.input)} OUT ${formatTokens(telemetry.output)}`,
        sectionColor(context, "tokens"),
      ),
      priority: 70,
      order: 3,
    },
  ];

  let order = 100;
  for (const kind of ["cloud", "voice", "cache-status"] as const) {
    order = appendNativeStatuses(context, candidates, kind, order);
  }

  candidates.push({
    text: colorize(
      context.theme,
      `CACHE R${formatTokens(telemetry.cacheRead)} W${formatTokens(telemetry.cacheWrite)}`,
      sectionColor(context, "cache"),
    ),
    priority: 40,
    order: order++,
  });

  const registryContext = { ...context, telemetry };
  for (const section of registry.getSections()) {
    const text = renderRegisteredSection(section, registryContext);
    if (!text) continue;
    candidates.push({
      text: oneLine(text),
      priority: section.priority ?? 35,
      order: order++,
    });
  }

  appendNativeStatuses(context, candidates, "lsp", order);
  return candidates;
}

type NativeStatusKind = "cloud" | "voice" | "cache-status" | "lsp";

function appendNativeStatuses(
  context: FooterRenderContext,
  candidates: Candidate[],
  kind: NativeStatusKind,
  order: number,
): number {
  for (const [key, value] of context.statuses) {
    if (!value.trim() || nativeStatusKind(key, value) !== kind) continue;
    candidates.push({
      // Native statuses may already contain ANSI colors. pi-foot owns the
      // final footer palette, so normalize them to the configured section color.
      text: colorize(
        context.theme,
        oneLine(stripAnsi(value)),
        sectionColor(context, kind),
      ),
      priority: kind === "lsp" ? 10 : 50,
      order: order++,
    });
  }
  return order;
}

function nativeStatusKind(key: string, value: string): NativeStatusKind | undefined {
  const source = `${key} ${value}`.toLowerCase();
  if (source.includes("lsp")) return "lsp";
  if (source.includes("cloud")) return "cloud";
  if (source.includes("voice")) return "voice";
  if (source.includes("cache")) return "cache-status";
  return undefined;
}

function renderRegisteredSection(
  section: FooterSection,
  context: FooterRenderContext,
): string | undefined {
  if (section.minWidth !== undefined && context.width < section.minWidth)
    return undefined;
  try {
    const text = section.render(context);
    if (!text?.trim()) return undefined;
    const color = section.color ?? context.colors.get("registry");
    return color ? colorize(context.theme, text, color) : text;
  } catch {
    // A third-party footer section must not be able to take down Pi's footer.
    return undefined;
  }
}

function sectionColor(
  context: FooterRenderContext,
  section: string,
): string | number | undefined {
  return context.colors.get(section);
}

function selectCandidates(candidates: Candidate[], width: number): Candidate[] {
  const selected = [...candidates];
  while (selected.length > 1 && renderedWidth(selected) > width) {
    const removable = selected
      .filter((candidate) => !candidate.required)
      .sort((a, b) => a.priority - b.priority || b.order - a.order)[0];
    if (!removable) break;
    selected.splice(selected.indexOf(removable), 1);
  }

  if (renderedWidth(selected) <= width) return selected;
  const first = selected[0];
  return first ? [{ ...first, text: fitText(first.text, width) }] : [];
}

function renderedWidth(candidates: Candidate[]): number {
  return (
    candidates.reduce(
      (total, candidate) => total + visibleWidth(candidate.text),
      0,
    ) +
    Math.max(0, candidates.length - 1) * visibleWidth(SEPARATOR)
  );
}
