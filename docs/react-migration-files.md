# Migrating `mosni/files` onto `@mosni/react`

> **Planned, not executed.** This repo does not touch `mosni/files`. The tarball
> (`mosni-react-<version>.tgz`) has to actually exist on `ui.mosni.dev` before `files` can install
> it, which only happens once this repo deploys — so this document is the ready-to-run recipe for
> whoever does that migration in the `mosni/files` repo, not a change made here. See `agent-docs → planning-artifacts/react-path-implementation-waves.md`
> §1/§8 in this repo for the friction points this recipe fixes and the decisions behind it.

Every step below is independently shippable and independently revertible. Do them in order; stop
after any step and the app is still in a fully working state.

## Before you start

- Confirm the tarball is live: `curl -I https://ui.mosni.dev/mosni-react-0.1.0.tgz` should return
  `200`. If it 404s, this repo hasn't deployed yet — wait, or bump the version in the snippets below
  to whatever `mosni-chrome`'s `packages/react/package.json` currently says.
- **Check the build date against `mosni-chrome`'s `agent-docs → planning-artifacts/react-path-implementation-waves.md` §10 "Wave 4" note before relying
  on `@mosni/react/elements`.** Any tarball built before that fix landed has a real, silent bug:
  `import "@mosni/react/elements"` type-checks fine but adds **no** `<mosni-*>` JSX typings at all
  (the ambient augmentation targeted the wrong JSX namespace for `@types/react` 19 +
  `"jsx": "react-jsx"`). If Step 1 below doesn't actually make `<mosni-header brand="…">` etc.
  type-check, that's why — pull a newer tarball.

## Step 1 — types only, zero runtime change

Costs one import; changes no behaviour at all. Safe to ship on its own.

1. Add the dependency to `web/package.json`:

   ```json
   "@mosni/react": "https://ui.mosni.dev/mosni-react-0.1.0.tgz"
   ```

   Run the install, and confirm `react >= 18` is already satisfied (peer dependency — `mosni/files`
   already depends on React 19, per `agent-docs → planning-artifacts/react-path-implementation-waves.md` §1's framing of that repo).

2. Add one import to `web/src/main.tsx` (or wherever the app's entry point is):

   ```ts
   import "@mosni/react/elements";
   ```

   This is a side-effect import — it augments `JSX.IntrinsicElements` for all 22 `<mosni-*>` tags,
   generated from `mosnicat`'s own `src/js/components/meta.ts`, so existing `<mosni-*>` JSX
   type-checks with attribute-level checking. No runtime import happens for anything but this one
   module (`packages/react/dist/elements.js` is a trivial, side-effect-only stub — see that file's
   own comment in `mosni-chrome` for why it exists at all).

3. Delete the four hand-maintained type blocks this makes redundant:

   - `FileBrowser.tsx`
   - `DropZone.tsx`
   - `VisibilityIndicator.tsx`
   - `NotFound.tsx`

   Each currently carries its own partial, drifting copy of a
   `declare module "react" { namespace JSX { … } }` block for whichever `<mosni-*>` tags it uses.
   Delete each block; the generated one from `@mosni/react/elements` now covers all of them, and
   it can't drift from `mosnicat`'s own attribute tables (docs.mjs generates both from the same
   `meta.ts`).

4. Type-check and ship. If it's green, this step is done — nothing else changed.

## Step 2 — swap components where the ownership bugs actually bite

Per component, optional, and each swap ships independently.

### `PreviewCard.tsx`'s `CodeBlock` wrapper → `<Code>`

Today, `CodeBlock` imperatively does something like:

```tsx
useEffect(() => {
  const el = document.createElement("mosni-code");
  el.replaceChildren(document.createTextNode(content));
  container.current!.replaceChildren(el);
}, [content]);
```

This exists only because `<mosni-code>` reads `this.textContent` in `connectedCallback`, and React
inserts the host **empty**, then appends children in a later commit — so the naive
`<mosni-code>{content}</mosni-code>` JSX renders an empty block on first paint (`agent-docs → planning-artifacts/react-path-implementation-waves.md`
§1's whole motivating example). `<Code>` doesn't have this problem — its text renders synchronously
in the same render pass, verified directly by `mosni-chrome`'s
`scripts/react-behaviour.mjs` ("renders its text on first paint with no effect required"). Replace
the wrapper outright:

```tsx
import { Code } from "@mosni/react";

<Code language={language} label={label}>
  {content}
</Code>;
```

Delete `CodeBlock.tsx` and its `useEffect` entirely once every call site is switched.

### `FileBrowser.tsx`'s `<mosni-tabs>`/`<mosni-dropdown>` → `<Tabs>`/`<Dropdown>`

Today, listening for `mosni-tab-change`/`mosni-dropdown-select` needs a `useRef` on the host plus
`addEventListener`/`removeEventListener` in an effect at every call site (`agent-docs → planning-artifacts/react-path-implementation-waves.md` §1). The
React components take plain callback props instead:

```tsx
// Before
const tabsRef = useRef<HTMLElement>(null);
useEffect(() => {
  const el = tabsRef.current;
  if (!el) return;
  const onChange = (e: CustomEvent) => setActiveTab(e.detail.index);
  el.addEventListener("mosni-tab-change", onChange as EventListener);
  return () =>
    el.removeEventListener("mosni-tab-change", onChange as EventListener);
}, []);

// After
import { Tabs, Tab } from "@mosni/react";

<Tabs selectedIndex={activeTab} onChange={(index) => setActiveTab(index)}>
  <Tab label="Files">…</Tab>
  <Tab label="Shared">…</Tab>
</Tabs>;
```

Same shape for `<mosni-dropdown>` → `<Dropdown>`/`<DropdownItem>`, with `onSelect(value)` replacing
the `mosni-dropdown-select` listener. Both are controlled here (`selectedIndex`) since
`FileBrowser.tsx` already tracks the active tab in its own state; drop the prop entirely for
uncontrolled use elsewhere.

Do this file by file — `FileBrowser.tsx`'s tabs and dropdown don't have to move in the same PR, and
neither has to happen before `PreviewCard.tsx`'s `<Code>` swap above.

## Step 3 — real server-rendered chrome

Once the call sites that matter have moved to Step 2, `app/src/views/*.tsx` can render actual chrome
markup during SSR instead of bare, unstyled `<mosni-*>` tags that only become real markup after
`mosnicat-core.js` executes client-side (`agent-docs → planning-artifacts/react-path-implementation-waves.md` §1's "nothing renders server-side" row).
This is not a separate code change so much as a consequence of Step 2 having happened for the views
that need first-paint-correct chrome — `<Layout>`/`<Header>`/`<Menu>`/`<Panel>` etc. all render
their real DOM synchronously under `renderToString`/`renderToStaticMarkup`, unlike their custom-
element counterparts.

## What doesn't move

Nothing about `mosnicat.js`'s bootstrap script tag changes — `@mosni/react` ships zero CSS by
design (`mosnicat.md`'s "React path" section, D-R2), so the CSS/fonts/favicon/viewport/cat bootstrap
stays exactly as it is in `mosni/files` today. `@mosni/auth`'s `<mosni-login-button>` usage is
unaffected either way — `<LoginButton>` from `@mosni/react` renders the real custom element (the one
sanctioned D-R1 exception), so switching to it is a drop-in swap with identical runtime behaviour,
not a structural change like the others above.
