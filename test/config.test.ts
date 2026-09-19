import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultPiFootConfig,
  resolvePiFootConfig,
} from "../src/config.ts";

test("resolves user order and colors over defaults and environment", () => {
  const config = resolvePiFootConfig(
    {
      order: ["model", "cost", "lsp"],
      colors: { model: "#ffffff", separator: "accent" },
      sections: { lsp: { enabled: false } },
    },
    {
      order: ["cost", "model"],
      colors: { model: "muted" },
      sections: { lsp: { enabled: true } },
    },
    new Map([
      ["model", "error"],
      ["separator", "success"],
    ]),
  );

  assert.deepEqual(config.order, ["cost", "model"]);
  assert.equal(config.colors.get("model"), "muted");
  assert.equal(config.colors.get("separator"), "accent");
  assert.equal(config.sections.get("lsp")?.enabled, true);
});

test("defaults to Pi's built-in telemetry only", () => {
  assert.deepEqual(defaultPiFootConfig().order, [
    "model",
    "reasoning",
    "cost",
    "tokens",
    "cache",
  ]);
});
