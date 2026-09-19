import assert from "node:assert/strict";
import test from "node:test";
import {
  fitText,
  formatCost,
  formatTokens,
  oneLine,
  stripAnsi,
} from "../src/format.ts";

test("formats token counts with readable units", () => {
  assert.equal(formatTokens(0), "0");
  assert.equal(formatTokens(999), "999");
  assert.equal(formatTokens(1_200), "1.2k");
  assert.equal(formatTokens(1_200_000), "1.2M");
});

test("formats costs without hiding precision", () => {
  assert.equal(formatCost(0), "$0.00");
  assert.equal(formatCost(5.25), "$5.25");
  assert.equal(formatCost(12.34), "$12.3");
});

test("strips terminal sequences for plain fallback text", () => {
  assert.equal(stripAnsi("\u001b[31mred\u001b[0m"), "red");
});

test("normalizes multiline values for the one-line footer", () => {
  assert.equal(
    oneLine(["hello", "world"].join(String.fromCharCode(10))),
    "hello world",
  );
});

test("fits text to a hard width", () => {
  assert.equal(fitText("abcdef", 4), "abc…");
  assert.equal(fitText("abcdef", 1), "…");
});
