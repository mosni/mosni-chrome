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

## How visual work flows (leave it better than you found it)

The chrome is the shared `main`; each app's views are consumers. This mirrors the agent-docs template ritual:

- **Portable visual decisions flow _up_ into mosnicat.** If a phase invents a reusable primitive or refines a
  shared one, add it here (`mosnicat.css`/`.js`) and document it in this file — don't leave it in the app.
- **App-specific bits stay local.** Keep each app's divergence minimal so the shared system stays clean and
  future refinements merge without conflict.
- **Visual polish is per-phase, on this baseline** — each phase styles its own views against these
  primitives as part of that phase, rather than deferring all polish to a single late pass. (auth's
  `agent-docs/decisions.md` D-45 records this for the auth project.)

## Files

- `public/mosnicat.js` — the bootstrap (CSS/fonts/favicon/viewport/cat/cat.js injector).
- `public/mosnicat.css` — base theme + the primitives above.
- `public/cat.js` — the eye-tracking cat behavior (expects `img#cat-image`, which the bootstrap appends first).
- `public/mosnicat.png` — the cat.
