# Plan — the optional React path for mosnicat

> Status: **ready to implement**. Written to be executed wave-by-wave by a lower-reasoning agent with
> no design decisions left open. Companion to `mosnicat.md` (the contract). Once implemented,
> `mosnicat.md` gains the "React path" section written in Wave 6 and this file can be pruned.

## 1. Why

`mosni/files` is a React 19 + Vite + SSR consumer of the chrome, and every one of its friction points
comes from the same root cause: **mosnicat's components are autonomous custom elements in _light DOM_
that rebuild or relocate their own children** (`this.textContent = ""`, `takeSlot`/`takeDefault`,
`while (tab.firstChild) panel.appendChild(...)`). React's reconciler assumes it owns the children it
created. The two ownership models are in direct conflict. Concretely, in `mosni/files` today:

| Friction (observed in `mosni/files`)                                                                                                                             | Root cause                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PreviewCard.tsx` hand-rolls a `CodeBlock` wrapper that imperatively `document.createElement("mosni-code")` + `replaceChildren` in a `useEffect`                 | `<mosni-code>` reads `this.textContent` in `connectedCallback`; React inserts the host **empty** and appends children after → renders an empty block |
| `FileBrowser.tsx`, `DropZone.tsx`, `VisibilityIndicator.tsx`, `NotFound.tsx` each hand-maintain their own `declare module "react" { namespace JSX { … } }` block | No shipped type surface for `<mosni-*>` tags. Four partial, drifting copies of what should be one generated file                                     |
| `tab.label` being getter-only took production down; forced a `dangerouslySetInnerHTML` workaround (fixed by D-112)                                               | React 19 assigns JSX props as **property writes** post-upgrade; a getter-only accessor throws                                                        |
| Custom events (`mosni-tab-change`, `mosni-dropdown-select`) need `useRef` + `addEventListener` + cleanup at every call site                                      | React has no `on*` prop path to non-native events on host elements                                                                                   |
| Nothing renders server-side — SSR emits bare `<mosni-*>` tags that only become real markup after `mosnicat-core.js` executes                                     | Custom elements are a client-only mechanism                                                                                                          |

The fix is not more wrappers around the custom elements. It is a **second first-class authoring path
for React**, exactly as D-17 already grants the hand-written class path.

## 2. Decisions (locked — do not re-derive)

**D-R1 — A React component renders the same DOM the custom element renders, natively in React. It
does _not_ render a `<mosni-*>` tag.**
`<Panel>` renders `<div className="panel">…`, `<Tabs>` renders `.tabs` / `.tabs-bar` / `.tabs-panel`
with React state. No custom element is involved, so there is no child-ownership conflict, no upgrade
timing, no flash-of-unupgraded-content, and SSR is correct on first paint.
_Sanctioned exception:_ `<LoginButton>` **does** render the real `<mosni-login-button>` element —
it has a shadow root and takes no light-DOM children, so React and the element never contend. This
exception is about light-DOM child ownership; it does not generalise.

**D-R2 — Styling still comes from the CDN bootstrap.** The React package ships **zero CSS**. Consumers
keep `<script src="https://mosni.dev/mosnicat.js"></script>` for CSS/fonts/favicon/viewport/cat. So a
theme or colour change still lands on every app with no redeploy.

**D-R3 — Accepted cost: markup is version-locked at the consumer's build time.** A React consumer's
component _markup_ updates only when it bumps the package; CSS still updates live. This is not a
regression — the hand-written class path (D-17, first-class forever) has exactly the same property.
Say so plainly in the docs; do not pretend otherwise.

**D-R4 — Package: `@mosni/react`, at `packages/react/` in this repo.** ESM only. `react >= 18` as a
**peerDependency**. **Zero runtime dependencies** (no `lucide` — see D-R7). Ships `.d.ts`.

**D-R5 — Distribution is a tarball on `ui.mosni.dev`, not a registry.** `npm run build` emits
`dist/mosni-react-<version>.tgz` **and** `dist/mosni-react.tgz` (a copy, "latest"). Consumers depend on
the URL:

```json
"@mosni/react": "https://ui.mosni.dev/mosni-react-0.1.0.tgz"
```

npm records the resolved URL + integrity hash in the lockfile, so builds stay reproducible and pinned.
**Rationale:** `mosni/files` D-11 deliberately vendored `@mosni/auth` rather than depend on GitHub
Packages, so its OIDC deploy never needs a stored `NODE_AUTH_TOKEN`. A URL tarball needs no install
auth at all and keeps that property. Public npm under an `@mosni` scope is the eventual upgrade; it
needs a human to own the scope, so it is **not** in this plan.

**D-R6 — Parity is machine-checked, not asserted in prose.** `scripts/parity.mjs` renders every
component **both** ways with the same inputs and fails the build on any structural difference. This is
the first time D-17's "renders pixel-identically" is actually enforced. See §5.

**D-R7 — Icons.** Two distinct cases, and they are handled differently:

- The **nine internal glyphs** (`src/js/icons.ts`: x, check, info, circle-check, circle-alert,
  chevron-down, copy, menu, more-vertical) are baked into the core bundle from `lucide`. The React
  package must **not** depend on `lucide`. Instead `scripts/gen-react-icons.mjs` emits
  `packages/react/src/icons.generated.tsx` (plain JSX, one component per glyph) from the same lucide
  source, and `npm run verify` regenerates and diffs it — a stale file fails the build.
- The **full public icon set** (`<mosni-icon>`, lazy-loaded `mosnicat-icons.js` exposing
  `window.mosniIcons.create`) stays lazy. React's `<Icon>` uses the **same** lazy chunk via the shared
  loader from D-R8. Nothing is bundled.

**D-R8 — Shared behaviour: pure geometry and chunk loaders only.** Extract into `src/js/shared/` and
import from both sides:

- `positionDropdownMenu(triggerRect, menuSize, viewport) → { top, left }` — the flip-up + clamp logic
- `positionTooltip(anchorRect, tipRect, viewport) → { top, left }`
- `loadChunk(url) → Promise<void>` — the idempotent script-injection loader behind Prism and icons

**Do not** extract or refactor the stateful listener choreography in `dropdown.ts` / `tooltip.ts`.
That code has a long, hard-won bug history (scroll-close races on mobile, `preventScroll`, flip-up,
scrollable-ancestor clipping). The custom-element edits in this plan are **mechanical one-line swaps
to call the extracted pure function** — nothing else changes. React re-expresses the choreography in
hook idiom, and §5's behaviour tests cover it.

**D-R9 — Adoption is incremental, in two independent steps.** Step 1 costs a consumer one import;
step 2 is per-component and optional:

1. `import "@mosni/react/elements"` — generated `JSX.IntrinsicElements` declarations for all 22
   `<mosni-*>` tags, from `meta.ts`. Deletes the four hand-maintained blocks in `mosni/files` with **no
   runtime change at all**.
2. Replace `<mosni-x>` with `<X>` where the ownership bugs actually bite.

**D-R10 — Docs get a React tab, two ways** (§6): a top-level **React** section in the nav (install,
conventions, SSR, caveats), and a third **React** tab inside every component section, alongside
"Component" and "Class (HTML)".

**D-R11 — Host-tag CSS rules that carry real styling get a class twin.** _(Added during Wave 1, from
a gap the parity harness exposed — see §10.)_ Some SCSS rules select the custom-element **tag**
(`mosni-logo { … }`), which the React path never renders. They split cleanly in two:

- **Host resets** — `display: contents` / `display: block` on `mosni-tab`, `mosni-menu-item`,
  `mosni-modal`, `mosni-dropdown-item`, `mosni-switch`, `mosni-chips`. These exist only to neutralise
  a box that exists only because a custom element needs somewhere to live. React renders no such host,
  so these get **no twin** — adding one would invent a box the React path doesn't have.
- **Real styling** — `mosni-logo` (+ `mosni-logo > img`, `.header-brand mosni-logo`),
  `mosni-dropdown` (positioning context), `mosni-accordion` (scopes styling to its `details`
  descendants). These get a comma twin: `mosni-logo, .mosni-logo { … }`.

This is not only a React fix. D-17 promises every component has a hand-written class equivalent, and
for these three that promise was **not actually keepable** before — no class existed that reproduced
their styling. The twins make the class path real for all three authoring paths at once.

## 3. Public API conventions (binding for every component)

- **Named exports, PascalCase**, no default export. `import { Panel, Tabs, Tab } from "@mosni/react"`.
- **Props are camelCase** counterparts of the documented kebab attributes: `no-logo` → `noLogo`,
  `filter-threshold` → `filterThreshold`, `icon-only` → `iconOnly`, `empty-text` → `emptyText`.
- **Booleans are real booleans**, never presence-strings.
- **Slots become `ReactNode` props**, never `slot="…"` children. A slot prop that has a plain-text
  attribute twin takes `ReactNode` and covers both: `<Header brand="MOSNI'S" accent="HEADER">` and
  `<Header brand={<img …/>}>` are both valid (string → build the `.brand` markup; node → use as-is).
- **Events become `on*` callbacks**: `mosni-tab-change` → `onChange(index, label)`,
  `mosni-dropdown-select` → `onSelect(value)`, `mosni-toast-dismiss` → `onDismiss()`, native `close` →
  `onClose()`.
- **Controlled and uncontrolled both supported** for every stateful component, React-idiomatically:
  `selectedIndex` / `defaultSelectedIndex`, `open` / `defaultOpen`, `checked` / `defaultChecked`,
  `value` / `defaultValue`. Controlled when the controlled prop is not `undefined`.
- **`ref` forwards to the root DOM element.** `className` is **merged** with the component's own
  classes (never replaced). Unknown rest props spread onto the root element.
- **No component reads `window` at module scope** — SSR must not crash. Anything touching `window`,
  `document`, or measurement lives in `useEffect` / `useLayoutEffect`.
- **`useId()` for every generated id** (field label/control pairing, tab ↔ panel `aria-controls`,
  dropdown trigger ↔ menu). Never a module-level counter — it desyncs between server and client.

## 4. Component inventory

All 22 documented tags plus `mosni-login-button`. `Root` = the element the React component renders.

| React export         | Root                          | Props                                                                                                                                                                                 | Notes                                                                                                       |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Layout`             | `div.layout`                  | `header?`, `menu?`, `footer?` (ReactNode), `children` → `main.layout-main`                                                                                                            | Burger button + `menu-open` class via `useState`; menu-entry click closes, same as `layout.ts`              |
| `Header`             | `header.header`               | `brand?`, `accent?`, `href="/"`, `tagline?`, `noLogo?`, `children` → `.header-mid`                                                                                                    | Logo + brand in one `.header-brand` lockup inside the brand `<a>`                                           |
| `Menu`               | `nav.menu`                    | `label?`, `children`                                                                                                                                                                  | `role="navigation"` + `aria-label`                                                                          |
| `MenuItem`           | `a.menu-entry` / `div`        | `title`, `subtitle?`, `href?`, `selected?`, `onClick?`                                                                                                                                | `<a>` when `href`, else `<div>`; `.selected` + `aria-current="page"`                                        |
| `Panel`              | `div.panel`                   | `heading?`, `size?: "small" \| "full"`, `children`                                                                                                                                    | `heading` prepends an `<h1>` only when no `<h1>` child is given                                             |
| `Footer`             | `footer.footer`               | `links?` (ReactNode), `children` → `.footer-left`                                                                                                                                     |                                                                                                             |
| `Field`              | `div.field`                   | `label`, `type="text"`, `name?`, `value?`/`defaultValue?`, `onChange?`, `required?`, `help?`, `error?`, `children?`                                                                   | `useId()` pairs label/control; `children` overrides the generated control; `.error` + `aria-invalid`        |
| `Switch`             | `div.field`-less wrapper      | `label?`, `name?`, `value?`, `checked?`/`defaultChecked?`, `disabled?`, `onChange?`                                                                                                   | Renders `label.switch > input + span.switch-visual > span.switch-thumb`                                     |
| `Chips`              | `div.chips`                   | `options: {value,label}[]`, `value?`/`defaultValue?: string[]`, `onChange?`, `label?`, `placeholder="Filter…"`, `filterThreshold=8`, `maxHeight="13rem"`, `emptyText="None selected"` | Renders real checkboxes (native submit still works). Filter box only at `options.length >= filterThreshold` |
| `Modal`              | `dialog.modal` (portal)       | `open?`/`defaultOpen?`, `heading?`, `footer?`, `onClose?`, `children`                                                                                                                 | `showModal()`/`close()` in an effect; backdrop `pointerdown` and the close button both call `onClose`       |
| `Tooltip`            | anchor + portal `div.tooltip` | `text?` or `tip?` (ReactNode), `children` (the anchor)                                                                                                                                | Tip portals to `document.body`; `positionTooltip` (D-R8); hover/focus/touch-tap, outside-tap dismiss        |
| `Dropdown`           | `div.dropdown`                | `label`, `iconOnly?: string \| true`, `onSelect?(value)`, `children`                                                                                                                  | `positionDropdownMenu` (D-R8); outside-click, Escape, Arrow keys, scroll-close-if-trigger-moved             |
| `DropdownItem`       | `button.dropdown-item`        | `value`, `variant?`, `disabled?`, `children`                                                                                                                                          | `role="menuitem"`, `tabIndex={-1}`                                                                          |
| `Tabs`               | `div.tabs`                    | `selectedIndex?`/`defaultSelectedIndex=0`, `onChange?(index,label)`, `children: <Tab>`                                                                                                | Reads `label` off `<Tab>` children; roving tabindex; Arrow keys                                             |
| `Tab`                | —                             | `label`, `children`                                                                                                                                                                   | Data-only, like `mosni-tab`. Rendered by `Tabs`, never on its own                                           |
| `Accordion`          | `div`                         | `exclusive?`, `children: <AccordionItem>`                                                                                                                                             | `exclusive` → shared `name` on every `<details>`; `useId()` for the group name                              |
| `AccordionItem`      | `details`                     | `summary`, `defaultOpen?`, `children`                                                                                                                                                 | `summary` gets the `.accordion-chevron` span + chevron glyph                                                |
| `Lightbox`           | `img.lightbox-thumb` + portal | `src`, `alt?`, `full?`, `caption?`                                                                                                                                                    | Click opens a portalled `dialog.lightbox`                                                                   |
| `Code`               | `div.code`                    | `children: string`, `language?`, `label?`, `noCopy?`, `noHeader?`                                                                                                                     | Lazy Prism via `loadChunk` (D-R8); copy button with the check-then-revert affordance                        |
| `Icon`               | `span.mosni-icon`             | `name`, `size=20`                                                                                                                                                                     | Lazy public icon chunk via `loadChunk`; injects the SVG in an effect. SSR renders the empty span            |
| `Logo`               | `span.mosni-logo`             | `alt="mosni"`                                                                                                                                                                         | `<img src={assetBase + "mosni.svg"}>`; `assetBase` defaults to `https://ui.mosni.dev/`                      |
| `Toast` / `useToast` | none (renders `null`)         | `useToast() → toast(message, { variant?, duration? })`; `<Toast variant>msg</Toast>` fires once on mount                                                                              | Delegates to the existing global `window.mosni.toast`. **No reimplementation of the toast host.**           |
| `LoginButton`        | `mosni-login-button`          | `size?`, `text?`, `loading?`, `onLogin?`                                                                                                                                              | **D-R1 exception.** Wires `mosni:login` via `addEventListener` in an effect                                 |

## 5. Verification

`npm run verify` becomes:

```
tsc --noEmit
  && tsc -p packages/react/tsconfig.json --noEmit
  && node scripts/build.mjs
  && node scripts/check-shape.mjs
  && node scripts/gen-react-icons.mjs --check
  && node scripts/parity.mjs
  && node scripts/smoke.mjs
  && prettier --check .
```

### 5.1 `scripts/parity.mjs` — the core guarantee

For each fixture in `packages/react/parity/fixtures.tsx` (**at least one per component**, and a
second for every component with a meaningful variant — `Header` with/without `noLogo`, `Dropdown`
with/without `iconOnly`, `Field` per control type, `Panel` per `size`, `Tabs` with a non-zero
selection):

1. **Custom-element side** — jsdom with `dist/mosnicat-core.js` **and** `dist/mosnicat-icons.js`
   evaluated (reuse `smoke.mjs`'s `JSDOM` + `showModal` stub setup verbatim), insert the fixture's
   `html`, await a macrotask, serialise the host's `innerHTML` + the host's `class` attribute.
2. **React side** — `renderToStaticMarkup(fixture.element)` from `react-dom/server`, parse in jsdom,
   serialise the root's `innerHTML` + `class`.
3. **Normalise both** before comparing: strip generated ids and every attribute that references one
   (`id`, `for`, `aria-controls`, `aria-labelledby`, `aria-describedby`); drop inline `style` values
   that are runtime measurements (dropdown menu `top`/`left`/`position`, tooltip `top`/`left`);
   collapse whitespace between tags; sort attributes alphabetically.
4. **Assert equal.** On failure print a unified diff of the two serialisations and exit non-zero.

The **root tag name is deliberately excluded** from the comparison: the custom element's root is
`<mosni-header class="header">` while React's is `<header class="header">`. Class list and subtree must
match exactly.

> Known and accepted: some `docs/examples/*.html` class-path examples are simplified illustrations,
> not literal equivalents (`header.html` omits the logo and the brand link that `<mosni-header>`
> generates). Parity is defined against the **custom element's rendered output**, which is what D-17
> actually claims. Do not "fix" the examples to match; do not weaken the check to accommodate them.

### 5.2 Behaviour tests — `scripts/react-behaviour.mjs`

jsdom + `react-dom/client`, one focused case each, since these are the paths parity cannot see:

- `Tabs`: clicking tab 2 swaps `aria-selected`/`hidden` and fires `onChange(1, label)`; Arrow keys move focus
- `Modal`: `open` toggling calls `showModal`/`close`; backdrop `pointerdown` fires `onClose`
- `Dropdown`: opens on trigger click, Escape closes and returns focus to the trigger, outside
  `pointerdown` closes, selecting an item fires `onSelect(value)` and closes
- `Field`: `error` adds `.error` + `aria-invalid` and renders `.field-error`; clearing it removes all three
- `Chips`: checking an option adds a chip; the chip's `×` unchecks it and fires `onChange`
- `Tooltip`: hover shows the portalled tip; unmount removes both the tip **and** its document listener
- `Code`: renders its text on first paint with **no** effect required (the exact bug `mosni/files` hit)

### 5.3 `check-shape.mjs` additions

- `dist/mosni-react.tgz` and `dist/mosni-react-<version>.tgz` exist
- `packages/react/dist/index.js` contains **no** bundled React (`react` stays external) and **no**
  bundled `lucide`
- every `tag` in `meta.ts` has a corresponding export in `packages/react/src/index.ts`, and every
  documented attribute of that tag has a camelCase prop in its `Props` type — **this is the check that
  keeps the React layer from silently falling behind the elements**

## 6. Docs

### 6.1 The React section (nav-level)

New `docs/examples/react.html` fragment + a matching entry in `docs.mjs`, placed **immediately before**
the components intro so it reads as a peer of "Component" and "Class (HTML)". Content: install (the
tarball URL dependency), the required bootstrap `<script>` tag (D-R2), the prop/event/slot conventions
from §3, the `@mosni/react/elements` types-only step (D-R9 step 1), an SSR note, and D-R3's
version-locking caveat stated plainly.

### 6.2 The per-component React tab

`docs.mjs` currently special-cases four `PAIRS`. Generalise it: **every** section that has a React
counterpart renders as `<mosni-tabs>` with up to three tabs in this order — **React**, **Component**,
**Class (HTML)** — falling back to a plain section when only one exists.

- Source of the React snippet: `docs/examples/react/<id>.tsx`, shown verbatim in a
  `<mosni-code language="tsx">` block.
- Source of the React **demo**: the fragment is bundled with esbuild (`react`/`react-dom` external),
  imported via a `data:text/javascript;base64,…` URL and rendered with `renderToStaticMarkup` —
  **exactly the trick `docs.mjs` already uses to import `meta.ts`**. The demo pane therefore shows the
  React component's own real output, not a stand-in.
- `smoke.mjs`'s `testDocsExamplesRender` gains a selector per React tab so a silently-empty React demo
  fails the build.

## 7. Implementation waves

Sequential. **Commit after each wave** (`chrome: react path — wave N …`) so a wave that goes wrong is
one `git revert` away. `npm run verify` must pass at the end of every wave.

### Wave 0 — foundation

1. `packages/react/` — `package.json` (name `@mosni/react`, version `0.1.0`, `type: module`,
   `peerDependencies.react >= 18`, `exports` for `.` and `./elements`, `files: ["dist"]`),
   `tsconfig.json` (`jsx: react-jsx`, `strict`, `declaration`), `src/index.ts`, `README.md`.
2. `react`, `react-dom`, `@types/react`, `@types/react-dom` as devDependencies of the repo root.
   **(already installed — the working tree carries this change; keep it in Wave 0's commit)**
3. `src/js/shared/` — `positionDropdownMenu`, `positionTooltip`, `loadChunk` (D-R8), extracted from
   `dropdown.ts`, `tooltip.ts`, `code.ts`, `icon.ts` **with no behavioural change**. Swap the four call
   sites to use them. `npm run verify` must still be green before continuing.
4. `scripts/gen-react-icons.mjs` (+ `--check` mode) → `packages/react/src/icons.generated.tsx`.
5. `scripts/gen-element-types.mjs` → `packages/react/src/elements.d.ts` from `meta.ts` (D-R9 step 1).
   Also `--check` mode.
6. `build.mjs`: build the React package (esbuild, ESM, `react`/`react-dom` external) + `tsc`
   declarations, then `npm pack` into `dist/mosni-react-<version>.tgz` and copy to `dist/mosni-react.tgz`.
7. Wire the new steps into `verify` (§5) and the new assertions into `check-shape.mjs` (§5.3).

### Wave 1 — the parity harness, proven on the easy half

`scripts/parity.mjs` (§5.1) plus these components, which are pure markup:
`Panel`, `Header`, `Footer`, `Menu`, `MenuItem`, `Logo`, `Layout`.
The harness must be **failing-capable**: verify it by temporarily breaking one component's class name
and confirming a red build, then reverting.

### Wave 2 — form components

`Field`, `Switch`, `Chips`. Parity fixtures per control type. Behaviour tests from §5.2.

### Wave 3 — overlays and disclosure

`Modal`, `Tooltip`, `Lightbox`, `Accordion`, `AccordionItem`, `Tabs`, `Tab`. Portals via
`react-dom`'s `createPortal`, guarded so SSR renders nothing for the portalled half.

### Wave 4 — the hard one, plus the lazy pair

`Dropdown`, `DropdownItem` (all four dismissal paths from §5.2), `Code`, `Icon`, `Toast`/`useToast`,
`LoginButton`.

### Wave 5 — docs

§6 in full: the React nav section, the generalised three-tab renderer, a
`docs/examples/react/<id>.tsx` per component, the new smoke selectors.

### Wave 6 — contract + hand-off

1. `mosnicat.md`: a **React path** section — D-R1 through D-R3 and D-R9 as contract, the component
   table, and the version-locking caveat. Update the "two authoring paths" line (D-17) to three,
   stating that all three are first-class and none is deprecated.
2. `README.md`: the React install snippet next to the script tag.
3. `docs/react-migration-files.md`: the ready-to-run recipe for `mosni/files` — §8 below.

### Wave 7 — class-only primitives (**optional, lowest priority**)

Only if Waves 0–6 are green and committed. Thin components for the class-only primitives the docs
already cover: `Button`, `Badge`, `Alert`, `Spinner`, `Progress`, `Status`, `Divider`, `Table`,
`Prose`, `Container`, `ContentContainer`. Same parity treatment against the class examples. Skipping
this wave entirely is an acceptable outcome; leaving Waves 0–6 half-done is not.

## 8. `mosni/files` migration (**planned, not executed here**)

**Do not touch the `mosni/files` repo in this work.** The tarball has to exist on `ui.mosni.dev` before
`files` can install it, and that only happens after this repo deploys. Write the recipe into
`docs/react-migration-files.md` and stop:

- **Step 1 (safe, no runtime change).** Add the dependency; add `import "@mosni/react/elements"` to
  `web/src/main.tsx`; delete the four hand-maintained `declare module "react"` blocks in
  `FileBrowser.tsx`, `DropZone.tsx`, `VisibilityIndicator.tsx`, `NotFound.tsx`.
- **Step 2 (per component, where it pays).** `PreviewCard.tsx`'s `CodeBlock` wrapper → `<Code>` (deletes
  the imperative `useEffect` outright); `FileBrowser.tsx`'s `<mosni-tabs>`/`<mosni-dropdown>` →
  `<Tabs>`/`<Dropdown>` with `onChange`/`onSelect` instead of ref-plus-listener plumbing.
- **Step 3.** `app/src/views/*.tsx` can then render real chrome markup server-side instead of bare
  custom-element tags.

Each step is independently shippable and independently revertable.

## 9. Acceptance criteria

- [x] `npm run verify` green, including parity, behaviour, icon-freshness and element-type-freshness checks
- [x] Every tag in `meta.ts` has a React export (enforced by §5.3's `assertReactApiCoverage`, added
      Wave 4). **Caveat on "with a parity fixture":** `mosni-modal`/`mosni-tooltip` have a React
      export but deliberately no `fixtures.tsx` entry — `react-dom/server` throws on a portal whose
      target doesn't exist, so their structural parity genuinely cannot be checked via
      `renderToStaticMarkup` (react-plan.md §10, Wave 3). Both are covered by
      `scripts/react-behaviour.mjs` cases instead, which is what §5.2 asked for on these two tags
      specifically. Every other tag has both.
- [x] `packages/react/dist/index.js` bundles neither `react` nor `lucide`
- [x] `dist/mosni-react.tgz` and `dist/mosni-react-<version>.tgz` are emitted
- [x] Zero `window`/`document` access at module scope anywhere in `packages/react/src`
- [x] The docs page shows a **React** tab on every component section and a **React** nav section
- [x] `mosnicat.md` documents the React path as the third first-class authoring path
- [x] `docs/react-migration-files.md` exists; the `mosni/files` repo is untouched
- [x] No behavioural change to any existing custom element beyond the D-R8 pure-function swaps

## 10. Implementer notes

Recorded during implementation; each is a fact discovered by building the thing, not a plan change
made for convenience.

### Wave 0 — two bugs found on review, fixed before Wave 1

1. **`check-shape.mjs` asserted the opposite of D-R4.** It reused the core bundles' "dependency-free"
   pattern to assert that `packages/react/dist/index.js` contains **no** `from "react"` — but react
   staying external is precisely what makes that import appear. The correct check is inverted: the
   bare external import must be **present**, and React's implementation must be **absent** (matched via
   the `_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` internals marker, which survives minification). The zero-
   runtime-dependency half of D-R4 is now checked where it actually lives — `packages/react/package.json`
   having no `dependencies` — plus a check that `react` is declared as a peerDependency.
2. **`./elements` was unreachable at runtime.** `build-react.mjs` correctly wrote a `dist/elements.js`
   (its own comment explains why a side-effect import needs a real runtime file), but `package.json`'s
   `"./elements"` export declared only a `"types"` condition. `import "@mosni/react/elements"` — the
   exact line D-R9 step 1 tells consumers to write — would have failed module resolution for every
   consumer. Fixed, and check-shape now asserts the `"import"` condition exists.

### Wave 1 — what the parity harness caught

The harness earned its keep before it was even finished. Real drift it surfaced, in order:

- **`slot="links"` survives on the element side.** The custom element reads the marker, relocates the
  child, and leaves the attribute behind; React has no counterpart. Normalised away (D-16 marker, and
  nothing in the SCSS selects it — checked).
- **Configuration attributes stay on the host.** `<mosni-header brand="B" tagline="t">` keeps both
  after render; the React props leave no trace. Rather than hard-code a second list, the normaliser
  strips whatever `meta.ts` documents for that tag — so it cannot drift from the docs tables.
- **React 19 hoists resource hints.** `renderToStaticMarkup` emits a
  `<link rel="preload" as="image">` **ahead of** the component root for anything containing an `<img>`
  (`<Logo>`, hence `<Header>` and `<Layout>`). Correct, useful output — but not part of the subtree, so
  it is dropped before comparison. **Worth documenting for consumers in Wave 5's React docs section:
  SSR output will contain these hints.**
- **The host-tag CSS gap that became D-R11.** The largest finding, and one no amount of reading the
  React code would have surfaced.

Two normalisations are harness artifacts rather than contract, and are deliberately narrow:

- **Asset origin.** jsdom evaluates the core as an _inline_ script, so `document.currentScript.src` is
  empty and `assetBase` falls back to its hard-coded `https://mosni.dev/`. In production the core is a
  real `<script src="https://ui.mosni.dev/…">`, which is what `<Logo>` hard-codes. The fallback origin
  is rewritten to the canonical one; a component pointing at a genuinely wrong host still fails.
- **The public icon chunk is evaluated up front.** `<mosni-icon>` lazily injects a `<script src>` that
  jsdom will not fetch, so without this the element parks its paint forever and compares an empty span
  against React's rendered glyph.

**Failing-capability proven** as §7 Wave 1 requires: breaking `panel-small` → `panel-smol` produced a
correct root-class diff and exit code 1; reverted, back to green.

### Wave 2 — three real harness bugs found (the tables above were wrong, not just incomplete)

The claim in "Where this stopped" above — that the pre-populated normalisation tables were correct
and fixtures would "slot in without touching the harness" — turned out to be false for three of
seven remaining tags, and the harness itself had a real correctness bug independent of any table.
Verified by instrumenting the actual built `dist/mosnicat-core.js` in jsdom and reading every
remaining `src/js/components/*.ts` render() for whether it self-classes its own host, rather than
trusting the table:

1. **`mosni-chips` and `mosni-tabs` were in `RENAMED_HOSTS`; they belong in `UNWRAPPED_HOSTS`.**
   Renaming assumes the host itself carries the real class (verbatim attribute copy to a plain
   tag) — but neither `chips.ts` nor `tabs.ts` ever calls `classList.add` on `this`; each builds
   its real box (`div.chips`, `div.tabs`) as a _child_ and appends it. Renaming the class-less host
   produced a spurious extra wrapper level with an empty class instead of the single classed box
   React renders. `mosni-lightbox` had the same bug (was in `RENAMED_HOSTS` → `"span"`; `lightbox.ts`
   never classes its host either — the `<img>` it enhances stays a plain child) — moved to
   `UNWRAPPED_HOSTS` too, where unwrapping correctly exposes `img.lightbox-thumb` directly, matching
   §4's own component table for `Lightbox`.
2. **`mosni-dropdown` was in `UNWRAPPED_HOSTS`; it belongs in `RENAMED_HOSTS` → `"div"`.** The
   opposite mistake: `dropdown.ts` _does_ `classList.add("dropdown")` on itself (confirmed live —
   `<mosni-dropdown class="dropdown">`), consistent with D-R11 listing `.dropdown` as real styling
   with a class twin. Moved.
3. **A tag whose custom element styles itself via a bare TAG selector (not a class) needs a third
   table, not two.** `mosni-accordion` never adds any class to its own host — `_accordion.scss`
   styles it as `mosni-accordion, .accordion { … }`, and the tag-selector half is all the custom
   element needs. But D-R11's `.accordion` comma twin exists _specifically_ for the class-path and
   React consumers, who cannot select by custom-element tag — so React's `<Accordion>` must render
   `div.accordion`, and a plain attribute-copying rename (which only copies what's already on the
   class-less host) can't produce that. Added `IMPLICIT_HOST_CLASS` (currently just
   `{"mosni-accordion": "accordion"}`) — applied in the same rename step, right before
   `renameElement`, so the comparison reflects the actual CSS-selector equivalence D-R11
   established instead of a literal, and for this one tag never-true, class match.
4. **Real harness bug, independent of any table: `stripConfigAttributes` mutated a LIVE, connected
   custom element, and for `mosni-field`'s `error` that broke the very thing being compared.**
   `error` is both a documented config attribute (so the stripping step removes it from the host)
   _and_ `observed: true` in `meta.ts` (`mosni-field`'s `observedAttributes` includes it) — so
   `el.removeAttribute("error")` on the live element fired `attributeChangedCallback` for real,
   which ran `#applyError(null)` and erased the `.error` class, `aria-invalid`, and the
   `.field-error` paragraph _before_ the comparison ever read them. First caught as
   `mosni-field/error` failing with the element side missing all three. Fixed by making
   `normalizeHost` operate on `host.cloneNode(true)` instead of the live host — every component's
   `attributeChangedCallback` already guards on `this.rendered` (set only by `connectedCallback`),
   and a clone is never connected, so its callbacks stay inert no matter what gets stripped
   afterward. This was latent since Wave 0 but only manifests for a `RENAMED_HOSTS` tag with an
   `observed: true` documented attribute — no Wave-1 tag had one (`mosni-menu-item`'s `selected` is
   observed but `mosni-menu-item` is `UNWRAPPED_HOSTS`, which never calls `stripConfigAttributes` on
   anything but the fixture root) — `mosni-field` is the first tag that combines both, which is why
   Wave 1 never hit it.
5. **Smaller harness fix, same wave: inline-style serialization spacing.** A live DOM's `style`
   attribute always has a space after each colon; React's `style={{…}}` serializes without one
   (`max-height:13rem`). `stripMeasurementStyle` (already responsible for dropping the three
   _runtime-measured_ style props) now also reformats every _kept_ declaration to one canonical
   `prop: value` spacing, so authored styles like Chips' `maxHeight` compare on their actual value,
   not on which side happened to render the space.
6. **Confirmed, accepted quirk — not fixed, deliberately not tested via parity:** `field.ts`'s
   `control.value = value` and `switch.ts`'s `input.checked = true` are both plain PROPERTY writes,
   never `setAttribute`. Neither `value` nor `checked` is a reflected IDL attribute (unlike
   `disabled`/`type`, verified reflected), so the custom element's serialized markup never shows
   either one, no matter what a fixture configures — while React's SSR always renders both as
   attributes for controlled _and_ uncontrolled inputs (verified empirically). This is a genuine,
   pre-existing element-side property/attribute gap, not a harness artifact, and not something this
   plan authorizes fixing (D-17/D-R6 changes are out of scope for a React-path wave). Parity
   fixtures for `Field`/`Switch` never exercise `value`/`checked` for this reason;
   `scripts/react-behaviour.mjs` (new, §5.2) verifies the real `.value`/`.checked` semantics against
   a live DOM instead, where the distinction doesn't apply. `Chips` is unaffected: its checkboxes'
   `checked` comes from literal HTML parsed at fixture-insertion time (never touched by `.checked =`
   afterward), which _does_ survive serialization — confirmed empirically before relying on it.
7. **General fixture-authoring rule this wave established, for future waves to reuse:** a tag in
   `UNWRAPPED_HOSTS` is only unwrapped when it appears as a _descendant_ — the walk that does
   renaming/unwrapping/implicit-classing only visits `root.children`, never the root itself (root
   tag exclusion, §5.1). A fixture that uses an `UNWRAPPED_HOSTS` tag as its OWN top-level element
   therefore compares the never-classed host directly against React's classed root and fails. Every
   Wave 2 fixture for `Switch`/`Chips` wraps the tested element in a neutral `<div>` (both sides) for
   this reason. This will matter again for `Modal`, `Tooltip`, `Tabs` in Wave 3, and any bare
   `Dropdown`-item-only fixture in Wave 4 — none of those are safe as a fixture's own root either.

### Wave 3 — portals can't be parity-tested via `renderToStaticMarkup`; two more table bugs

`react-dom/server`'s `renderToStaticMarkup` **throws** ("Target container is not a DOM element")
on any `createPortal` whose target doesn't exist — confirmed with a two-line repro before writing
`<Modal>`/`<Tooltip>` — it does not silently render nothing. Both components guard their portal
behind a client-only `mounted` flag (`useState(false)` flipped in a `useEffect`), so under
`renderToStaticMarkup` they correctly produce **no markup at all**, and `parity.mjs`'s "React
element produced no markup" check treats that as a fixture _error_, not a comparable empty state.
**Neither has a `fixtures.tsx` entry.** This is not a gap in coverage so much as a property of the
tool: a portal fundamentally cannot be exercised by a pure string-rendering pass. Both are instead
covered by focused `scripts/react-behaviour.mjs` cases (live DOM, portals render for real) — exactly
the two bullets §5.2 already called out for them, which in hindsight was the plan anticipating this.
`<Lightbox>` has no such problem and keeps a normal fixture: its overlay is built lazily on click
(matching `lightbox.ts`'s own `open()`), so the _default_ render has no dialog on either side.

Two more `normalize-html.mjs` table corrections, same root cause as Wave 2's chips/tabs finding:
`mosni-tabs` and `mosni-lightbox` were also in `RENAMED_HOSTS` and belong in `UNWRAPPED_HOSTS`
(neither self-classes its own host — `tabs.ts` builds `div.tabs` as a child and appends it;
`lightbox.ts` only classes the `<img>` it enhances, never `this`). Moved both, with wrapping-div
fixtures per Wave 2's established rule.

One new normalization: `<details name="…">` (the `exclusive` accordion group correlator) is
stripped in `normalizeAttributes`, scoped to `<details>` only (not added to the general
`ID_REFERENCING_ATTRS`, which would also strip real content like `<input name="email">`). Two
reasons converge here: it's semantically an opaque, generated cross-reference (the same shape as an
id), _and_ jsdom v29.1.1 does not implement `<details>.name` as a reflected property at all
(`"name" in details` is `false`), so the element side could never show it regardless of value — the
`exclusive` variant could not otherwise be parity-tested at all under this jsdom version.

### Wave 4 — the JSX `IntrinsicElements` augmentation was broken for every consumer, silently

The biggest finding of the whole plan so far, and one that had nothing to do with fixtures: building
`<LoginButton>` (D-R1's sanctioned exception, the one component that renders a raw `<mosni-*>` tag
in JSX) was **the first time anything in this repo actually type-used a `<mosni-*>` tag** — every
fixture in Waves 1–3 always went through a `<PascalCase>` React component, never the raw custom
element. `elements.d.ts` (Wave 0, D-R9 step 1's whole deliverable) used
`declare global { namespace JSX { interface IntrinsicElements { … } } }`, which was correct for
React ≤18's ambient-global JSX types but is **silently ineffective** with `@types/react` 19 +
`"jsx": "react-jsx"`: React 19 moved `IntrinsicElements` into `declare namespace React { namespace
JSX { … } }`, and the automatic JSX runtime resolves types through the `JSX` namespace **exported
by `react/jsx-runtime`** (itself `export { JSX } from "react"`), not the bare global namespace. The
augmentation merged with nothing; every `<mosni-*>` tag failed
`Property 'mosni-header' does not exist on type 'JSX.IntrinsicElements'` the moment anyone actually
wrote one — `npm run verify` had been green for three whole waves without ever catching it, because
nothing exercised the path. Fixed in `scripts/gen-element-types.mjs`: emit
`declare module "react" { namespace JSX { interface IntrinsicElements { … } } }` instead (verified
against a throwaway `tsc` run before changing the generator); regenerated `elements.d.ts` accordingly.
**This means D-R9 step 1 was silently broken for every `mosni/files`-style consumer since Wave 0** —
`import "@mosni/react/elements"` would have type-checked fine (a side-effect import always
"succeeds" syntactically) while doing precisely nothing. Worth flagging prominently in Wave 5's docs
and Wave 6's migration doc: this fix landed in Wave 4, so any earlier tarball (`mosni-react-0.1.0.tgz`
built before this commit) has the broken version.

Also implemented in this wave, no surprises: `<Dropdown>`/`<DropdownItem>` (all four dismissal paths
— trigger click, Escape-returns-focus, outside pointerdown, select-fires-and-closes — covered in
`react-behaviour.mjs`, matching §5.2 exactly), `<Code>` (Prism highlighting genuinely never runs in
either harness — the lazy chunk's `<script src>` never fetches under plain jsdom, exactly the same
`smoke.mjs`-documented limitation as the custom element's own Prism/icon chunks — so both sides stay
unhighlighted and compare cleanly), `<Icon>` (renders a **classless** `<span>`, not `span.mosni-icon`
as §4's table literally says — confirmed empirically that `<mosni-icon>` never carries a class even
once painted, and there is no `.mosni-icon` SCSS rule to justify inventing one), `<Toast>`/`useToast`
(pure delegation to `window.mosni.toast`, no new host), and `<LoginButton>` (confirmed empirically
that `size`/`text`/`loading` reach the custom element as plain attributes via `setAttribute`, not
properties — `login-button.ts` never defines them as class accessors, so `"loading" in el` is
`false` and React's custom-element prop handling falls back to attributes for plain booleans/strings,
which is exactly what `login-button.ts`'s own `hasAttribute("loading")` reads).

Also implemented, closing a gap left open since Wave 0: **§5.3's `check-shape.mjs` coverage check**
("every tag in `meta.ts` has a corresponding export … and every documented attribute has a camelCase
prop") was never actually written — Wave 0's own task list called for it, but only the
tarball/dependency-shape half of §5.3 (`assertReactPackageShape`) ever landed. Added
`assertReactApiCoverage`: derives the expected PascalCase export name and camelCase prop name from
each `meta.ts` tag/attribute (kebab→Pascal/camel is systematic and holds for all 21 tags, verified),
and textually scans `index.ts` / the component's own `.tsx` source for them — the same
substring/marker-based check style this file already uses elsewhere (`PRISM_MARKER`, `ICON_MARKER`),
not a full TS-compiler-API type check. One documented exception: `mosni-tab`'s `selected` has no
React-side counterpart, because §4's own table deliberately lifts selection to the parent `<Tabs>`
(`selectedIndex`/`defaultSelectedIndex`) rather than repeating a boolean on every `<Tab>` — this is
the one intentional, plan-sanctioned gap, allowlisted explicitly rather than silently passed.

### Wave 5 — docs generalised; one process note for future agents

Built exactly to §6's shape, no plan deviations:

- `docs/examples/react.html` — the nav-level React section (install, bootstrap script tag, §3's
  conventions, the `@mosni/react/elements` types-only step, an SSR note that calls out both the
  React-19-resource-hint behaviour from Wave 1's findings and the Modal/Tooltip/Lightbox portal
  limitation from Wave 3's, and D-R3's version-locking caveat stated plainly) - inserted immediately
  before `COMPONENTS_INTRO` by special-casing its id out of the normal alphabetical filename loop in
  `docs.mjs` (its filename would otherwise sort well before any `mosni-*` file).
- `docs/examples/react/<id>.tsx` for all 18 sections that map to a documented, React-backed tag
  (17 `mosni-*.html` files + `icons.html`, which documents `mosni-icon` under a different section
  id - matched by id, same as everywhere else in this file, not by tag). Each is a real,
  `export default function Example()`, importing `@mosni/react` by a relative path into
  `packages/react/src` (bare `"@mosni/react"` has nothing to resolve against in this repo, same
  reason `fixtures.tsx`/`cases.tsx` do this) - `docs.mjs` rewrites that one import line back to
  `"@mosni/react"` for the DISPLAYED snippet only, so the reader sees the real public import while
  the actual bundle-and-render step still resolves the local source.
- `docs.mjs`'s old `renderPairedSection` (four hard-coded `PAIRS`) is now `renderGroupSection`,
  used for every section: prepends a "React" tab (default-selected) whenever a matching
  `docs/examples/react/<id>.tsx` exists, in front of whatever `Component`/`Class (HTML)` tabs
  already existed, and falls back to the original plain `renderSection` when there would only be
  one tab. `Modal`/`Tooltip`'s demo panes render only their non-portalled part (a modal's trigger
  button, a tooltip's anchor text) — the real, accurate output of `renderToStaticMarkup` for a
  portal-based component per Wave 3's finding, not a bug in the demo.
- `smoke.mjs`'s `testDocsExamplesRender` gained one selector per new React tab
  (`#<id>-react-demo > *`, not 18 hand-picked component-specific selectors — the demo's `id` is
  something `docs.mjs` controls specifically so this check has one stable thing to assert against
  regardless of what each component actually renders). Proved failing-capable the same way Wave 1's
  parity harness was: broke the wrapper's `id` template, confirmed 18 red assertions, reverted.

**Process note, not a plan/code finding:** mid-wave, a `sed`-based one-line edit to `docs.mjs`
(for the failing-capability check above) was undone with `git checkout -- scripts/docs.mjs` — since
this wave's docs.mjs rewrite hadn't been committed yet, `checkout` restored the pre-Wave-5 file
from `HEAD` (Wave 4's commit), silently discarding the whole wave's work, not just the one-line
`sed` edit. Re-applied from memory and re-verified. Recorded so a future agent doing a similar
"break something, verify red, put it back" check remembers `git stash`/a manual re-edit, not
`git checkout`, when the file being poked has uncommitted changes worth keeping.

### Wave 6 — contract + hand-off, no new findings

Documentation-only, exactly per §7's Wave 6 list — no code or harness changes, so nothing here
needed re-verification beyond confirming `npm run verify` was still green afterward:

- `mosnicat.md` gained a full "**React path**" section (D-R1–D-R3 + D-R9 as contract, a condensed
  component table, the version-locking caveat) placed right after "Components", and the "two
  authoring paths" line (both occurrences — the summary paragraph and the flash-guard paragraph's
  back-reference to it) now reads "three". One correction caught while writing the table: `Icon`
  renders a **classless** `span`, not `span.mosni-icon` as §4's own table literally says (already
  corrected in the component itself and in `fixtures.tsx`'s comment back in Wave 4 — this is just
  the same fact landing in the contract doc too, not a new finding).
- `README.md` gained a "React apps" subsection with the tarball-dependency snippet and a minimal
  usage example, right after the existing bootstrap script tag.
- `docs/react-migration-files.md` is the ready-to-run recipe from §8, expanded with concrete
  before/after snippets for the two call sites §8 names (`PreviewCard.tsx`'s `CodeBlock` →
  `<Code>`, `FileBrowser.tsx`'s tabs/dropdown → `<Tabs>`/`<Dropdown>`) and a prominent pointer at
  the top to the Wave 4 JSX-augmentation finding, since a tarball built before that fix would make
  Step 1 silently do nothing. `mosni/files` itself was never touched — no `add_repo`, no writes
  outside this repo.

### Where this stopped

**Waves 0–6 are complete, green, and pushed.** `npm run verify` covers `tsc` (root + the
`packages/react` project), the core build, `check-shape` (including the §5.3 API-coverage check
added in Wave 4), icon/element-type freshness, 38 `parity.mjs` fixtures, 8
`react-behaviour.mjs` cases, `smoke.mjs` (including 18 new React-tab doc checks), and `prettier`.
Every §9 acceptance criterion is checked off above, with one honest caveat noted inline
(`mosni-modal`/`mosni-tooltip` have no parity fixture, by necessity, not oversight).

Wave 7 (class-only primitives - `Button`, `Badge`, `Alert`, `Spinner`, `Progress`, `Status`,
`Divider`, `Table`, `Prose`, `Container`, `ContentContainer`) is explicitly optional per §7 and was
**not started** — Waves 0–6 being fully done and green was prioritised over partial Wave 7 progress,
per the plan's own "skipping this wave entirely is an acceptable outcome; leaving Waves 0–6
half-done is not." A future session can pick it up cleanly: it needs the same parity-fixture
treatment against the existing class-only `docs/examples/*.html` fixtures (`btn.html`, `badge.html`,
etc.), following the exact pattern established in Waves 1–4, and — per this wave's own docs
generalisation — each new component automatically gets a docs React tab for free once a matching
`docs/examples/react/<id>.tsx` is added, no further `docs.mjs` changes required.
