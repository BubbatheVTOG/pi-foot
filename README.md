# pi-foot

`pi-foot` is a compact, one-line, theme-aware footer extension for Pi.

It uses Pi's public `ctx.ui.setFooter()` API and reads native extension statuses through the public `footerData` supplied to custom footer factories. Existing extensions that call `ctx.ui.setStatus()` therefore work without adapters or changes.

## What it displays

The built-in default order is model, reasoning, cost, input/output, and cache telemetry. Optional extension statuses such as cloud, voice, and LSP are omitted unless the settings JSON includes them. Unrecognized native statuses and the git branch are omitted. Sections are separated with a readable `│` separator and low-priority sections disappear when the terminal is narrow.

Telemetry labels are intentionally explicit:

```text
MODEL claude-sonnet │ REASON medium │ COST $5.25 │ IN 19M OUT 206k │ CACHE R60M W245k
```

## Install

From the repository:

```bash
pi install git:git@github.com:BubbatheVTOG/pi-foot
```

Or try it for one run:

```bash
pi -e git:git@github.com:BubbatheVTOG/pi-foot
```

Installation and activation are separate. Reload Pi after installing or changing the package.

## Pi configuration

`pi-foot` reads the `piFoot` object from Pi's normal settings file. Global settings live at `~/.pi/agent/settings.json`; project settings live at `.pi/settings.json` and override the global values. Missing optional sections are simply omitted, so the defaults work whether cloud, voice, cache-monitor, or LSP extensions are installed.

The built-in defaults are equivalent to:

```json
{
  "piFoot": {
    "order": ["model", "reasoning", "cost", "tokens", "cache"],
    "separator": " │ ",
    "colors": {
      "model": "muted",
      "reasoning": "muted",
      "cost": "muted",
      "tokens": "muted",
      "cache": "muted",
      "separator": "accent"
    }
  }
}
```

To add the user's cloud, voice, and LSP statuses, the settings can override that order:

```json
{
  "piFoot": {
    "order": ["model", "reasoning", "cost", "tokens", "cloud", "voice", "cache", "lsp"]
  }
}
```

Users can reorder entries, disable sections, and assign colors without changing the extension. For example:

```json
{
  "piFoot": {
    "order": ["model", "reasoning", "tokens", "cost", "cache", "lsp"],
    "sections": {
      "lsp": { "enabled": false }
    },
    "colors": {
      "model": "#cba6f7",
      "separator": "thinkingMedium"
    }
  }
}
```

## Section colors

Built-in sections use Pi's active theme by default. The model and telemetry text are muted; separators use the theme's accent color. Environment variables remain available as compatibility fallbacks, but settings JSON takes precedence.

Use one JSON variable for several sections:

```bash
export PI_FOOT_COLORS='{"model":"accent","reasoning":"#7aa2f7","tokens":39,"cache":"ansi:141","cost":"theme:muted","separator":"#a6e3a1"}'
```

Or use a single-section shortcut:

```bash
export PI_FOOT_COLOR_MODEL="#f5c2e7"
export PI_FOOT_COLOR_CACHE="ansi:141"
export PI_FOOT_COLOR_SEPARATOR="#89b4fa"
```

Supported color values are Pi theme names such as `accent`, `muted`, or `thinkingMedium`; six-digit hex values such as `#7aa2f7`; xterm 256-color indexes such as `39` or `ansi:141`; and RGB values such as `rgb(122, 162, 247)`. Theme values continue to follow the user's active Pi theme.

The section ids are `model`, `reasoning`, `tokens`, `cache`, `cost`, `cloud`, `voice`, `status`, `lsp`, `registry`, and `separator`. Add `status` to the order to include other native Pi status entries.

Registered sections can set their own color directly:

```ts
import { getPiFootRegistry } from "pi-foot";

const footer = getPiFootRegistry();
footer.register({
  id: "cache-hit",
  color: "#a6e3a1",
  render: () => "CACHE HIT 75%",
});
```

Or configure a registry color programmatically:

```ts
footer.setColor("registry", "thinkingMedium");
```

Native `setStatus()` values are normalized to the configured `status` color so third-party ANSI styling does not make the footer visually uneven.

## Optional structured sections

The native status API is the right integration for simple values:

```ts
ctx.ui.setStatus("my-extension", "READY");
```

For a section that needs priority, a minimum width, or a render callback, use the optional registry:

```ts
import { getPiFootRegistry } from "pi-foot";

const footer = getPiFootRegistry();
const remove = footer.register({
  id: "my-metric",
  priority: 60,
  minWidth: 100,
  render: ({ theme }) => theme.fg("accent", "METRIC 42%"),
});

// Call when the underlying value changes if Pi is not already rendering.
getPiFootRegistry().refresh();

// Later:
remove();
```

For loose coupling between independently installed packages, use the shared symbol instead of importing the package:

```ts
const registry = (globalThis as any)[Symbol.for("pi-foot.v1")];
registry?.register({
  id: "my-metric",
  render: () => "METRIC 42%",
});
```

The registry is optional. Existing `setStatus()` integrations remain the default and do not need to know that `pi-foot` is installed.

## Development

```bash
npm install
npm test
npm run check
```

The extension requires a Pi release that supports `ctx.ui.setFooter()` and the `footerData` argument, including `getExtensionStatuses()`.
