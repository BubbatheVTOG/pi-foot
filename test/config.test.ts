import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  defaultPiFootConfig,
  loadPiFootConfig,
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
    "context",
    "cost",
    "tokens",
    "cache",
  ]);
});

test("untrusted projects cannot override global footer settings", () => {
  const root = mkdtempSync(join(tmpdir(), "pi-foot-config-"));
  const globalDir = join(root, "global");
  const projectDir = join(root, "project", ".pi");
  mkdirSync(globalDir, { recursive: true });
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(
    join(globalDir, "settings.json"),
    JSON.stringify({ piFoot: { order: ["model", "cost"] } }),
  );
  writeFileSync(
    join(projectDir, "settings.json"),
    JSON.stringify({ piFoot: { order: ["model", "lsp"] } }),
  );

  try {
    const env = { PI_CODING_AGENT_DIR: globalDir };
    assert.deepEqual(
      loadPiFootConfig(join(root, "project"), ".pi", env, false).order,
      ["model", "cost"],
    );
    assert.deepEqual(
      loadPiFootConfig(join(root, "project"), ".pi", env, true).order,
      ["model", "lsp"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
