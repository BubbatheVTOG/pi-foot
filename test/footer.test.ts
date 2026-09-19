import assert from "node:assert/strict";
import test from "node:test";
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

  const line = renderFooter(
    240,
    { fg: (_color, text) => text },
    {
      getExtensionStatuses: () =>
        new Map([
          ["cloud", "CLOUD"],
          ["voice", "VOICE OFF"],
          ["pi-cache-stats", "CACHE HIT 75%"],
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
  )[0];

  assert.match(line, /MODEL test-model/);
  assert.match(line, /REASON medium/);
  assert.match(line, /IN 1\.2k OUT 300/);
  assert.match(line, /CLOUD/);
  assert.match(line, /VOICE OFF/);
  assert.match(line, /CACHE HIT 75%/);
  assert.match(line, /LSP Inactive/);
  assert.match(line, /EXTRA yes/);
  assert.equal(line.includes("BRANCH"), false);
  assert.equal(line.indexOf("LSP Inactive") > line.indexOf("CACHE HIT 75%"), true);
  assert.equal(line.indexOf("CLOUD") < line.indexOf("VOICE OFF"), true);
  remove();
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
