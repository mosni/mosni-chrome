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

**Three authoring paths, all first-class forever (D-17, extended by the React plan's D-R1).** Every
component has a hand-written class equivalent (`<header class="header">`, `<div class="panel">`, …)
that renders identically, and — for React apps — a native React component (`<Header>`, `<Panel>`,
…, see "React path" below) that renders that same DOM directly, with no custom element involved.
Reach for the component tag for attribute-driven terseness; reach for the plain HTML/class form for
full control or the strongest no-JS story; reach for `@mosni/react` in a React app to avoid the
light-DOM child-ownership conflicts a custom element has with React's own reconciler. None of the
three is deprecated or secondary, and this is not expected to change.

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
- **Every attribute-backed prop is settable as a property, full stop — not just the runtime-state ones
  above.** React 19 assigns JSX props as plain property writes once a custom element upgrades; a
  getter-only accessor throws on that assignment instead of no-oping, which took production down once
  (`tab.label` was getter-only, forcing `mosni/files` into a `dangerouslySetInnerHTML` workaround just to
  set a tab's label from React). So: no accessor pair ships getter-only. Where the prop mirrors a single
  attribute 1:1 (`tab.label`), the setter just reflects it; where the value has no single attribute to
  mirror (e.g. `chips.value`, derived from child checkboxes), the setter still exists and does the
  sensible write-through instead of throwing.

**Design language:** components follow the same design language as the primitives above.

**Flash guard + no-JS.** A scoped hide-until-defined rule covers exactly two tags —
`mosni-menu-item:not(:defined)` and `mosni-toast:not(:defined)` — never a blanket `mosni-*` rule, so it only
ever hides content-less generated chrome, never authored content. Content-bearing (enhance-role) components
degrade to their readable authored content with JS off; generate-role components have the **class-only
path as their no-JS fallback** (the same D-17 guarantee that makes all three authoring paths first-class).

## React path

For React apps, `@mosni/react` is the third first-class authoring path (D-17, D-R1): a native React
component per tag, imported from `@mosni/react` and rendered directly — **not** a wrapper around the
custom element. `<Panel>` renders `<div className="panel">…` itself; `<Tabs>` renders
`.tabs`/`.tabs-bar`/`.tabs-panel` with React state. No custom element is involved, so there is no
child-ownership conflict between it and React's reconciler (custom elements are autonomous and
rebuild/relocate their own children; React assumes it owns the children it created — the two models
fight when combined), no upgrade timing, no flash-of-unupgraded-content, and server rendering is
correct on first paint. `scripts/parity.mjs` (in this repo) renders every component **both** ways
with the same inputs and fails the build on any structural difference — the same "renders
pixel-identically" promise the class path makes above is machine-checked for the React path too, not
just asserted in prose.

**Sanctioned exception:** `<LoginButton>` **does** render the real `<mosni-login-button>` element —
it has a shadow root and takes no light-DOM children, so React and the element never contend. This
exception is about light-DOM child ownership specifically; it does not generalise to any other tag.

**Styling still comes from the CDN bootstrap.** `@mosni/react` ships **zero CSS**. Keep the usual
`<script src="https://mosni.dev/mosnicat.js"></script>` bootstrap tag for CSS/fonts/favicon/viewport/
cat — a theme or colour change still lands on every app with no redeploy, exactly as it does for the
other two authoring paths.

**Accepted cost: markup is version-locked at the consumer's build time.** A React consumer's
component _markup_ updates only when it bumps the `@mosni/react` package version; CSS still updates
live from the bootstrap. This is not a regression particular to React — the hand-written class path
above has exactly the same property (its markup is whatever a consumer typed, frozen until they edit
it); only the custom-element path picks up markup changes with no redeploy at all, because the
browser fetches a fresh `mosnicat-core.js` on every page load.

**Adoption is incremental, in two independent steps.** Step 1 costs a consumer one import and
changes no runtime behaviour at all:

```ts
import "@mosni/react/elements";
```

This adds `JSX.IntrinsicElements` declarations for every `<mosni-*>` tag (generated from
`src/js/components/meta.ts`), so existing `<mosni-*>` markup in a React/TSX codebase type-checks
with zero behavioural change — deleting any hand-maintained `declare module "react" { namespace JSX
{ … } }` block doing the same job. Step 2 is per component and optional: replace `<mosni-x>` with
the matching `<X>` from `@mosni/react` wherever the light-DOM ownership conflict actually bites.

| React export                  | Renders                                 | Notes                                                                           |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| `Layout`                      | `div.layout`                            | Burger button + menu-open state via `useState`                                  |
| `Header`                      | `header.header`                         | Logo + brand in one lockup inside the brand link                                |
| `Menu` / `MenuItem`           | `nav.menu` / `a.menu-entry`             | `MenuItem` renders `<a>` when `href` is given, else `<div>`                     |
| `Panel`                       | `div.panel`                             | `heading` prop only injects an `<h1>` when no `<h1>` child is authored          |
| `Footer`                      | `footer.footer`                         |                                                                                 |
| `Field`                       | `div.field`                             | `children` overrides the generated control (enhance-first, like the class path) |
| `Switch`                      | `label.switch`                          | Controlled (`checked`) or uncontrolled (`defaultChecked`)                       |
| `Chips`                       | `div.chips`                             | Renders real checkboxes directly — nothing to "enhance" in React                |
| `Modal`                       | `dialog.modal` (portal)                 | Portals to `document.body`; SSR renders only its non-portalled content, if any  |
| `Tooltip`                     | anchor + portal `div.tooltip`           | Portals to `document.body`; same SSR note as `Modal`                            |
| `Dropdown` / `DropdownItem`   | `div.dropdown` / `button.dropdown-item` | Escape/outside-click/arrow-key handling re-expressed in hook idiom              |
| `Tabs` / `Tab`                | `div.tabs` / (data-only)                | `Tab` is never rendered on its own — `Tabs` reads its props directly            |
| `Accordion` / `AccordionItem` | `div.accordion` / `details`             | `exclusive` shares one generated `name` across every child's `<details>`        |
| `Lightbox`                    | `img.lightbox-thumb` + portal           | The overlay is built lazily on click — no SSR portal problem                    |
| `Code`                        | `div.code`                              | Text renders synchronously; only Prism highlighting is a lazy effect            |
| `Icon`                        | `span` (classless)                      | Lazy public icon chunk; SSR renders the empty span                              |
| `Logo`                        | `span.mosni-logo`                       |                                                                                 |
| `Toast` / `useToast`          | nothing (`null`)                        | Delegates to the existing global `window.mosni.toast` — no second toast host    |
| `LoginButton`                 | `mosni-login-button`                    | The sanctioned exception above                                                  |

See `packages/react/README.md` for install instructions and the tarball URL, and the docs page's
**React** section/tab on every component for a live, rendered example plus the verbatim snippet.

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
- `packages/react/` — `@mosni/react`, the React authoring path above. See `packages/react/README.md`
  for install/use and `react-plan.md` for the design that produced it (kept around as a durable
  record of the decisions, not something a consumer needs to read).
- `docs/react-migration-files.md` — the ready-to-run recipe for migrating `mosni/files` onto this
  path, planned but not executed from this repo.
