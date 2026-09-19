export interface UsageLike {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: { total?: number };
}

export interface SessionEntryLike {
  type?: string;
  message?: {
    role?: string;
    usage?: UsageLike;
  };
}

export interface TelemetrySnapshot {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

export function collectTelemetry(entries: readonly SessionEntryLike[]): TelemetrySnapshot {
  const snapshot: TelemetrySnapshot = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: 0,
  };

  for (const entry of entries) {
    const usage = entry.type === "message" && entry.message?.role === "assistant"
      ? entry.message.usage
      : undefined;
    if (!usage) continue;

    snapshot.input += finiteOrZero(usage.input);
    snapshot.output += finiteOrZero(usage.output);
    snapshot.cacheRead += finiteOrZero(usage.cacheRead);
    snapshot.cacheWrite += finiteOrZero(usage.cacheWrite);
    snapshot.cost += finiteOrZero(usage.cost?.total);
  }

  return snapshot;
}

function finiteOrZero(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? value : 0;
}
