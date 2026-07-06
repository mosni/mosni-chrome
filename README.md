# mosni-chrome — mosnicat

**mosnicat** is the shared visual chrome / design system for every app on the mosni stack. This repo is its
new home, split out of `mosni.dev` so it can grow into a proper, versioned component library on its own.

> **Status: freshly split out, not yet cut over.** The source here is the starting point copied from
> `mosni.dev/public`. The **live** `mosnicat.{js,css}` is still served from `https://mosni.dev/` and apps
> still load it from there — nothing has moved off mosni.dev yet. How the built output from _this_ repo gets
> published back to a **stable, unchanging URL** on mosni.dev (so consumers never edit their `<script>`
> tags) is the core open question.
> Do not remove mosnicat from `mosni.dev` until that cutover is planned and shipped — it would break every
> app that loads it at runtime today (auth's D-34, and the whole stack).

## The drop-in promise (must survive everything we build)

The whole point of mosnicat is that one tag makes a page look right:

```html
<head>
  <script src="https://mosni.dev/mosnicat.js"></script>
</head>
```

That injects the CSS, fonts, favicon, a `viewport` meta (if missing), the self-embedding cat, and `cat.js`.
It is idempotent and position-independent. **Whatever component-library machinery this repo grows, this
zero-config "just inject some CSS and JS" path stays a first-class, supported use case.**

## Layout (provisional — the first planning session owns the real structure)

- `src/` — the current mosnicat source, copied verbatim from `mosni.dev/public` as the starting point
  (`mosnicat.css`, `mosnicat.js`, `cat.js`, `cat.css`, `mosnicat.png`, `cat.base.html`).
- `mosnicat.md` — the design-system contract (philosophy, the drop-in promise, the primitives). Carried over
  from `mosni.dev`; the source of truth for _how mosnicat is meant to be used_.

A build step (`src/` → published static assets) and a component/examples structure round out the layout.
Nothing above is fixed.

## Where we're headed (rough)

1. Turn mosnicat into a **proper component library** (versioned, buildable, each component/class documented)…
2. …while keeping the **drop-in "one script tag" path** intact and first-class.
3. Ship a **docs page with live examples for every component and class** we expose.
4. Solve the **static-link-across-repos** problem: this repo builds; the output lands at a stable mosni.dev
   URL so consumers never change their references.

These are rough guidelines. The first session establishes the technical baseline and a real, agreed plan.
