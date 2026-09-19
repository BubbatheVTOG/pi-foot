/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import { collectTelemetry } from "../src/telemetry.ts";

test("collects assistant usage and ignores other entries", () => {
  assert.deepEqual(
    collectTelemetry([
      { type: "message", message: { role: "user" } },
      {
        type: "message",
        message: {
          role: "assistant",
          usage: { input: 100, output: 20, cacheRead: 80, cacheWrite: 10, cost: { total: 0.25 } },
        },
      },
      { type: "toolResult", message: { role: "assistant", usage: { input: 9 } } },
      {
        type: "message",
        message: {
          role: "assistant",
          usage: { input: 50, output: 5, cacheRead: 0, cacheWrite: 2, cost: { total: 0.1 } },
        },
      },
    ]),
    { input: 150, output: 25, cacheRead: 80, cacheWrite: 12, cost: 0.35 },
  );
});
