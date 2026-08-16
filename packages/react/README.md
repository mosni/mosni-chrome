# @mosni/react

The React-native authoring path for [mosnicat](https://mosni.dev), the mosni.dev design system.
See `agent-docs → planning-artifacts/react-path-implementation-waves.md` for the design this package implements, and `mosnicat.md`'s
"React path" section for the user-facing contract once it lands (Wave 6).

## Install

This package is **not** published to a registry (D-R5) — depend on the tarball URL directly:

```json
"@mosni/react": "https://ui.mosni.dev/mosni-react-0.1.0.tgz"
```

`react >= 18` is a peer dependency; bring your own. This package ships **zero CSS** — keep the
usual mosnicat bootstrap script tag for styling:

```html
<script src="https://mosni.dev/mosnicat.js"></script>
```

## Use

```tsx
import { Panel, Field } from "@mosni/react";

function SignIn() {
  return (
    <Panel heading="Sign in">
      <Field label="Email" type="email" name="email" />
    </Panel>
  );
}
```

Every component renders the same DOM as its custom-element counterpart, natively in React — no
`<mosni-*>` tag is involved (see D-R1 in agent-docs → planning-artifacts/react-path-implementation-waves.md), so there is no child-ownership conflict
and SSR is correct on first paint.

### Types-only step (no runtime change)

```ts
import "@mosni/react/elements";
```

Adds `JSX.IntrinsicElements` declarations for all 22 `<mosni-*>` tags, generated from
`src/js/components/meta.ts`. Use this alone to type-check existing `<mosni-*>` markup with no
behavioural change at all (D-R9 step 1); adopt individual `<X>` React components only where the
ownership bugs actually bite (step 2).
