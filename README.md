# Mosni Design Framework

The shared visual chrome and design system for the Hannah's stack

## Use it

Add one tag to your page's `<head>`:

```html
<script src="https://mosni.dev/mosnicat.js"></script>
```

That loads the stylesheet and registers every `<mosni-*>` component. Nothing else to wire up.

### React apps

`@mosni/react` is a native React component per tag (not a wrapper around the custom element) —
keep the script tag above for styling, and add the package as a dependency:

```json
"@mosni/react": "https://ui.mosni.dev/mosni-react-0.1.0.tgz"
```

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

`react >= 18` is a peer dependency — bring your own. See `mosnicat.md`'s "React path" section for
the full contract and `packages/react/README.md` for more detail.

## Docs

Live examples and the full component/class reference: **https://ui.mosni.dev**
