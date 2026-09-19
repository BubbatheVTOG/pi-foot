const ANSI_SEQUENCE = /\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_SEQUENCE, "");
}

export function oneLine(text: string): string {
  return text.replace(/[\r\n]+/g, " ");
}

export function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value < 1_000) return String(Math.round(value));
  if (value < 1_000_000) return `${trimNumber(value / 1_000)}k`;
  if (value < 1_000_000_000) return `${trimNumber(value / 1_000_000)}M`;
  return `${trimNumber(value / 1_000_000_000)}B`;
}

export function formatCost(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "$0.00";
  return `$${value.toFixed(value < 10 ? 2 : 1)}`;
}

export function trimNumber(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function fitText(text: string, width: number): string {
  if (width <= 0) return "";
  const plain = stripAnsi(text);
  if (plain.length <= width) return text;
  if (width === 1) return "…";
  return `${plain.slice(0, width - 1)}…`;
}
