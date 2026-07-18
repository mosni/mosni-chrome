# mosnicat — the mosni.dev design system / chrome

`mosnicat` is the shared visual chrome for every app on the mosni stack. It is served at runtime from
`https://mosni.dev/` (`mosnicat.js`, `mosnicat.css`, `mosnicat.png`, `cat.js`) so apps pick up look-and-feel
updates without redeploying. This file is the contract.

## Philosophy

1. **Easy to plug in without much thinking.** Include one script tag and a page looks right.
2. **Responsive out of the box.** Mobile-correct by default — the bootstrap injects a `viewport` meta if the
   page lacks one, and the primitives are responsive.
3. **Lightly enforces its standards, with room to break out.** Primitives are _opt-in classes_, not forced
   restyles of bare `button`/`input` elements — so an app adopts the house style by using them and can
   deliberately override or ignore them when it means to.
4. **Robust to naive use.** Including the bootstrap the obvious way must never break the page (see below).

## Plug it in

```html
<head>
  <script src="https://mosni.dev/mosnicat.js"></script>
</head>
```

That single tag injects `mosnicat.css`, the Roboto/Staatliches fonts, the favicon, a `viewport` meta (if
missing), the self-embedding cat, and `cat.js`. It is idempotent (guards against a double include) and
**position-independent**: it works in `<head>` or at the end of `<body>`. Its body-dependent work (the cat
image and `cat.js`, which append to `document.body`) is deferred to `DOMContentLoaded`, so a bare `<head>`
include cannot run before `<body>` exists.

> **History / gotcha:** before 2026-07-01 the bootstrap did its `document.body` appends inline, so a plain
> `<head>` include threw (`document.body` was still `null`) — the CSS loaded but the cat/`cat.js` never did.
> That is fixed; the rule "a naive include must not break" is now part of the contract.

## Layout

- Wrap the page's main content in the smallest primitive that fits. For a single-purpose page (sign-in, a
  short form, a brief message) that's **`.panel`**. Content pages with a sidebar use the existing
  `.header` + `.content` + `.menu` grid.
- Don't hand-roll a viewport meta or a card border/background — use the primitive so the look stays
  consistent and any future refinement lands everywhere at once.

## Primitives (in `mosnicat.css`)

| Class                                      | What it is                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.panel`                                   | A centered, responsive card. Narrow (`max-width: 24rem`) on desktop, full-bleed-safe on phones. The default container for a single-purpose page. |
| `.panel h1` / `.panel p`                   | Heading (Staatliches) and body spacing tuned for a panel.                                                                                        |
| `.panel input[type=text\|password\|email]` | Panel-scoped input styling — opt into a panel and inputs look right with no extra classes.                                                       |
| `.panel button`, `.panel .btn`             | The house button (purple, hover). `.btn` lets an `<a>` look like a button.                                                                       |
| `.btn-block`                               | Makes a button/`.btn` fill the card width (primary CTA on a narrow card).                                                                        |
| `.status`                                  | A live inline-feedback line (e.g. a ceremony result). Reserves its line height so content doesn't jump.                                          |

Form controls are **scoped to `.panel`** on purpose: adopting them is opt-in (drop content in a panel), and
pages that don't use panels are never restyled.

## Components

mosnicat also ships 16 native custom elements (14 tags, two of which — menu and tabs — register a paired
child tag) in `mosnicat.js`. They are **autonomous custom elements in light DOM, no shadow root**: each one
composes the existing classes above rather than inventing new styling, so a component and its hand-written
class equivalent render pixel-identically.

| Tag                                  | Purpose                                                                            | Composes                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| `<mosni-header>`                     | The site header bar.                                                               | `.header`                                 |
| `<mosni-layout>`                     | The app frame grid (header + menu + main + footer).                                | `.layout`                                 |
| `<mosni-menu>` + `<mosni-menu-item>` | The nav container and one generated row (pair — item is the child of menu).        | `.menu` / `.menu-entry`                   |
| `<mosni-panel>`                      | The centred single-purpose-page card.                                              | `.panel`                                  |
| `<mosni-footer>`                     | The page footer.                                                                   | `.footer`                                 |
| `<mosni-field>`                      | A labelled form control with help/error text.                                      | `.field`                                  |
| `<mosni-switch>`                     | An enhance-or-generate boolean toggle.                                             | `.switch`                                 |
| `<mosni-chips>`                      | A filterable multi-select that enhances authored checkboxes.                       | `.chips`                                  |
| `<mosni-modal>`                      | A dialog over a generated native `<dialog>`.                                       | `.modal`                                  |
| `<mosni-tooltip>`                    | A hover/focus tip appended to `document.body`.                                     | `.tooltip`                                |
| `<mosni-toast>`                      | The declarative secondary path onto the imperative `window.mosni.toast(...)` host. | `.toast`                                  |
| `<mosni-lightbox>`                   | An enhanced `<img>` that opens a full-resolution overlay.                          | `.lightbox-thumb` / `dialog.lightbox`     |
| `<mosni-code>`                       | A code block with an optional copy button and lazy Prism highlighting.             | `.code`                                   |
| `<mosni-accordion>`                  | A flat divided list of native `<details>` sections.                                | `mosni-accordion details`/`summary` scope |
| `<mosni-tabs>` + `<mosni-tab>`       | The tablist controller and one authored tab (pair — tab is the child of tabs).     | `.tabs`                                   |

**Two authoring paths, both first-class forever (D-17).** Every component has a hand-written class
equivalent (`<header class="header">`, `<div class="panel">`, …) that renders identically. Reach for the
component tag for attribute-driven terseness; reach for the plain HTML/class form for full control or the
strongest no-JS story. Neither path is deprecated or secondary, and this is not expected to change.

**API conventions** (see the live examples + attribute/slot/event tables on the docs page, generated from
`src/js/components/meta.ts`):

- Tags and attributes are **kebab-case**; sub-components are `mosni-<parent>-<child>` (`mosni-menu-item`,
  `mosni-tab`). Boolean attributes are **presence-based** (`selected`, `open`, `checked`, `disabled`,
  `required`).
- Named regions use a **`slot="name"` attribute on a direct child** — this is our own light-DOM convention
  resolved in JS, **not** shadow-DOM slotting (there is no shadow root, D-16). Unmarked children go to the
  component's default region.
- Events prefer the **native** event name where one exists (`change`, `close`/`cancel`, `toggle`); the rest
  are `mosni-`-prefixed custom events that bubble (`mosni-tab-change`, `mosni-toast-dismiss`).
- Runtime-state attributes reflect via a mirroring property (`modal.open`, `switch.checked`,
  `menuItem.selected`, `tab.selected`, …) — setting either the attribute or the property keeps both in sync.

**Design language:** components follow the same design language as the primitives above.

**Flash guard + no-JS.** A scoped hide-until-defined rule covers exactly two tags —
`mosni-menu-item:not(:defined)` and `mosni-toast:not(:defined)` — never a blanket `mosni-*` rule, so it only
ever hides content-less generated chrome, never authored content. Content-bearing (enhance-role) components
degrade to their readable authored content with JS off; generate-role components have the **class-only
path as their no-JS fallback** (the same D-17 guarantee that makes the two authoring paths first-class).

## Design language

mosnicat's visual language:

- **Palette — anchored on three colours:** `#996bef` (purple accent), `#444` (dark body surface), `#fff`
  (white). **Flat colours, few-to-no gradients** — "flat" targets gradient _fills_, not the functional surface
  tints (`--mosni-surface`/`-input`/`-hover`/`-selected`) or the purple shade-variants, which stay as deliberate
  functional steps.
- **Typography — Staatliches** is the branding/accent font (`.brand`, panel/section headings); Roboto for body.
- **Responsive — desktop-first, but solid on mobile.** Design for desktop first; mobile must stay fully usable,
  never broken.
- **Quality bar — deliberate, valuable, weighty, thought-out.** The chrome should feel considered.

Tokens are runtime CSS custom properties in the served `mosnicat.css`, so a consumer can re-theme by overriding
them. Some refinements under this language are **decided but not yet shipped** — they land together at the
mosni.dev cutover (reviewed on `ui.mosni.dev` first): a slightly cleaned-up surface ramp and semantic
`.status` success/error variants.

## How visual work flows (leave it better than you found it)

The chrome is the shared `main`; each app's views are consumers. The flow:

- **Portable visual decisions flow _up_ into mosnicat.** If a phase invents a reusable primitive or refines a
  shared one, add it here (`mosnicat.css`/`.js`) and document it in this file — don't leave it in the app.
- **App-specific bits stay local.** Keep each app's divergence minimal so the shared system stays clean and
  future refinements merge without conflict.
- **Visual polish is per-phase, on this baseline** — each phase styles its own views against these
  primitives as part of that phase, rather than deferring all polish to a single late pass.

## Files

- `public/mosnicat.js` — the bootstrap (CSS/fonts/favicon/viewport/cat/cat.js injector).
- `public/mosnicat.css` — base theme + the primitives above.
- `public/cat.js` — the eye-tracking cat behavior (expects `img#cat-image`, which the bootstrap appends first).
- `public/mosnicat.png` — the cat.
