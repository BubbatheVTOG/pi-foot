import { parseColorSpec, type ColorSpec } from "./colors.ts";

export const PI_FOOT_REGISTRY = Symbol.for("pi-foot.v1");

export interface FooterContextUsage {
  tokens: number | null;
  contextWindow: number;
  percent: number | null;
}

export interface FooterRenderContext {
  width: number;
  separator: string;
  theme: FooterTheme;
  statuses: ReadonlyMap<string, string>;
  branch: string | null;
  telemetry: FooterTelemetry;
  contextUsage: FooterContextUsage | undefined;
  colors: ReadonlyMap<string, ColorSpec>;
}

export interface FooterTheme {
  fg(color: string, text: string): string;
}

export interface FooterTelemetry {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

export interface FooterSection {
  /** Stable identifier. Registering the same id replaces the previous section. */
  id: string;
  /** Higher-priority sections survive narrow terminals longer. */
  priority?: number;
  /** Do not show this section below this terminal width. */
  minWidth?: number;
  /** Return the text for this section. */
  render(context: FooterRenderContext): string | undefined;
  /** Optional theme token, xterm palette index, or hex/RGB color. */
  color?: ColorSpec;
}

export interface PiFootRegistry {
  register(section: FooterSection): () => void;
  unregister(id: string): void;
  getSections(): readonly FooterSection[];
  /** Ask the active footer to render again after external state changes. */
  refresh(): void;
  /** Override the color for a built-in section or the `registry` fallback. */
  setColor(section: string, color: ColorSpec | undefined): void;
  getColors(): ReadonlyMap<string, ColorSpec>;
  onChange(listener: () => void): () => void;
}

type RegistryHost = Record<PropertyKey, unknown>;

function host(): RegistryHost {
  // SAFETY: globalThis is the process-wide object where Symbol.for state is shared.
  return globalThis as unknown as RegistryHost;
}

function createRegistry(): PiFootRegistry {
  const sections = new Map<string, FooterSection>();
  const colors = new Map<string, ColorSpec>();
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // Registry consumers are isolated: one broken footer integration must
        // not prevent later listeners from observing an otherwise valid update.
      }
    }
  };

  return {
    register(section) {
      if (!section.id.trim())
        throw new Error("pi-foot sections need a non-empty id");
      if (typeof section.render !== "function")
        throw new TypeError("pi-foot sections need a render function");
      sections.set(section.id, section);
      notify();
      return () => {
        if (sections.get(section.id) !== section) return;
        sections.delete(section.id);
        notify();
      };
    },
    unregister(id) {
      if (!sections.delete(id)) return;
      notify();
    },
    getSections() {
      return [...sections.values()];
    },
    refresh: notify,
    setColor(section, color) {
      if (color === undefined) {
        colors.delete(section);
      } else {
        const parsed = parseColorSpec(color);
        if (parsed === undefined) return;
        colors.set(section, parsed);
      }
      notify();
    },
    getColors() {
      return colors;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Get the process-wide registry. Symbol.for makes this work across separately
 * loaded copies of the package, which is useful when Pi packages are isolated.
 */
export function getPiFootRegistry(): PiFootRegistry {
  const registry = host()[PI_FOOT_REGISTRY];
  if (isPiFootRegistry(registry)) return registry;

  const created = createRegistry();
  host()[PI_FOOT_REGISTRY] = created;
  return created;
}

function isPiFootRegistry(value: unknown): value is PiFootRegistry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PiFootRegistry>;
  return (
    typeof candidate.register === "function" &&
    typeof candidate.unregister === "function" &&
    typeof candidate.getSections === "function" &&
    typeof candidate.refresh === "function" &&
    typeof candidate.setColor === "function" &&
    typeof candidate.getColors === "function" &&
    typeof candidate.onChange === "function"
  );
}
