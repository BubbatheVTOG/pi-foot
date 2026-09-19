import assert from "node:assert/strict";
import test from "node:test";
import { resolvePiFootConfig } from "../src/config.ts";
import { renderFooter } from "../src/footer.ts";
import { getPiFootRegistry } from "../src/registry.ts";

test("renders native statuses and registered sections", () => {
  const registry = getPiFootRegistry();
  registry.unregister("test-footer-section");
  const remove = registry.register({
    id: "test-footer-section",
    priority: 95,
    render: ({ theme }) => theme.fg("accent", "EXTRA yes"),
  });
  const config = resolvePiFootConfig({
    order: [
      "model",
      "reasoning",
      "cost",
      "tokens",
      "cloud",
      "voice",
      "cache",
      "registry",
      "lsp",
    ],
  });

  const line = renderFooter(
    240,
    { fg: (_color, text) => text },
    {
      getExtensionStatuses: () =>
        new Map([
          ["cloud", "CLOUD"],
          ["voice", "VOICE OFF"],
          ["lsp", "LSP Inactive"],
        ]),
      getGitBranch: () => "main",
      getAvailableProviderCount: () => 1,
      onBranchChange: () => () => {},
    },
    {
      modelId: "test-model",
      thinkingLevel: "medium",
      entries: [
        {
          type: "message",
          message: {
            role: "assistant",
            usage: {
              input: 1_200,
              output: 300,
              cacheRead: 800,
              cacheWrite: 100,
              cost: { total: 1.25 },
            },
          },
        },
      ],
    },
    registry,
    config,
  )[0];

  assert.match(line, /MODEL test-model/);
  assert.match(line, /REASON medium/);
  assert.match(line, /IN 1\.2k OUT 300/);
  assert.match(line, /CLOUD/);
  assert.match(line, /VOICE OFF/);
  assert.match(line, /LSP Inactive/);
  assert.match(line, /EXTRA yes/);
  assert.equal(line.includes("BRANCH"), false);
  assert.equal(
    line.indexOf("LSP Inactive") > line.indexOf("CACHE R800 W100"),
    true,
  );
  assert.equal(line.indexOf("CLOUD") < line.indexOf("VOICE OFF"), true);
  remove();
});

test("omits optional statuses from built-in defaults", () => {
  const line = renderFooter(
    240,
    { fg: (_color, text) => text },
    {
      getExtensionStatuses: () =>
        new Map([
          ["cloud", "CLOUD"],
          ["voice", "VOICE OFF"],
          ["lsp", "LSP Inactive"],
        ]),
      getGitBranch: () => "main",
      getAvailableProviderCount: () => 1,
      onBranchChange: () => () => {},
    },
    { modelId: "test-model", thinkingLevel: "medium", entries: [] },
  )[0];

  assert.equal(line.includes("CLOUD"), false);
  assert.equal(line.includes("VOICE OFF"), false);
  assert.equal(line.includes("LSP Inactive"), false);
});

test("treats an explicit order as the visible section allowlist", () => {
  const line = renderFooter(
    240,
    { fg: (_color, text) => text },
    {
      getExtensionStatuses: () => new Map(),
      getGitBranch: () => "main",
      getAvailableProviderCount: () => 1,
      onBranchChange: () => () => {},
    },
    { modelId: "test-model", thinkingLevel: "medium", entries: [] },
    getPiFootRegistry(),
    resolvePiFootConfig({ order: ["model", "cost"] }),
  )[0];

  assert.match(line, /MODEL test-model/);
  assert.match(line, /COST/);
  assert.equal(line.includes("REASON"), false);
  assert.equal(line.includes("IN 0 OUT 0"), false);
  assert.equal(line.includes("CACHE"), false);
});

test("keeps the model visible when the terminal is narrow", () => {
  const line = renderFooter(
    24,
    { fg: (_color, text) => text },
    {
      getExtensionStatuses: () => new Map([["cloud", "CLOUD"]]),
      getGitBranch: () => "main",
      getAvailableProviderCount: () => 1,
      onBranchChange: () => () => {},
    },
    { modelId: "test-model", thinkingLevel: "medium", entries: [] },
  )[0];

  assert.equal(line.length <= 24, true);
  assert.match(line, /MODEL/);
});
