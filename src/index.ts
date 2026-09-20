export {
  defaultPiFootConfig,
  loadPiFootConfig,
  resolvePiFootConfig,
  DEFAULT_ORDER,
  type PiFootSettings,
  type ResolvedPiFootConfig,
  type SectionConfig,
} from "./config.ts";
export {
  colorize,
  DEFAULT_SECTION_COLORS,
  parseColorSpec,
  readColorOverrides,
  type ColorSpec,
} from "./colors.ts";
export {
  getPiFootRegistry,
  PI_FOOT_REGISTRY,
  type FooterContextUsage,
  type FooterRenderContext,
  type FooterSection,
  type FooterTelemetry,
  type PiFootRegistry,
} from "./registry.ts";
