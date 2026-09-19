# pi-foot

`pi-foot` is a compact, one-line, theme-aware footer extension for Pi.

It uses Pi's public `ctx.ui.setFooter()` API and reads native extension statuses through the public `footerData` supplied to custom footer factories. Existing extensions that call `ctx.ui.setStatus()` therefore work without adapters or changes.

## What it displays

The default order is model, thinking level, token usage, cache usage, cost, git branch, and native extension statuses. Sections are separated with a readable `│` separator and low-priority sections disappear when the terminal is narrow.

Telemetry labels are intentionally explicit:

```text
MODEL claude-sonnet │ THINK medium │ IN 19M OUT 206k │ CACHE R60M W245k │ COST $5.25
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

## Section colors

Built-in sections use Pi's active theme by default. The model and telemetry text are muted; separators use the theme's accent color. No additional Pi settings entry is required: color overrides can be supplied through the environment.

Use one JSON variable for several sections:

```bash
export PI_FOOT_COLORS='{"model":"accent","thinking":"#7aa2f7","tokens":39,"cache":"ansi:141","cost":"theme:muted","status":"#a6e3a1"}'
```

Or use a single-section shortcut:

```bash
export PI_FOOT_COLOR_MODEL="#f5c2e7"
export PI_FOOT_COLOR_CACHE="ansi:141"
export PI_FOOT_COLOR_SEPARATOR="#89b4fa"
```

Supported color values are Pi theme names such as `accent`, `muted`, or `thinkingMedium`; six-digit hex values such as `#7aa2f7`; xterm 256-color indexes such as `39` or `ansi:141`; and RGB values such as `rgb(122, 162, 247)`. Theme values continue to follow the user's active Pi theme.

The section ids are `model`, `thinking`, `tokens`, `cache`, `cost`, `branch`, `status`, `registry`, and `separator`.

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
