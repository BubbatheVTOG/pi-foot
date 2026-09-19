import assert from "node:assert/strict";
import test from "node:test";
import { colorize, parseColorSpec, readColorOverrides } from "../src/colors.ts";

test("accepts theme, xterm, hex, and RGB color specifications", () => {
  assert.equal(parseColorSpec("accent"), "accent");
  assert.equal(parseColorSpec("theme:thinkingMedium"), "thinkingMedium");
  assert.equal(parseColorSpec("#12abef"), "#12abef");
  assert.equal(parseColorSpec("ansi:196"), 196);
  assert.equal(parseColorSpec("rgb(18, 171, 239)"), "#12abef");
  assert.equal(parseColorSpec("ansi:999"), undefined);
});

test("reads one JSON override and convenient per-section variables", () => {
  const colors = readColorOverrides({
    PI_FOOT_COLORS: JSON.stringify({ model: "#ffffff", tokens: 39 }),
    PI_FOOT_COLOR_CACHE: "accent",
  });

  assert.equal(colors.get("model"), "#ffffff");
  assert.equal(colors.get("tokens"), 39);
  assert.equal(colors.get("cache"), "accent");
});

test("renders custom colors as terminal sequences", () => {
  const theme = { fg: (color: string, text: string) => `<${color}>${text}</${color}>` };
  assert.equal(colorize(theme, "MODEL", "#12abef"), "\u001b[38;2;18;171;239mMODEL\u001b[39m");
  assert.equal(colorize(theme, "MODEL", 196), "\u001b[38;5;196mMODEL\u001b[39m");
  assert.equal(colorize(theme, "MODEL", "accent"), "<accent>MODEL</accent>");
});
