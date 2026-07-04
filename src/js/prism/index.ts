// The Prism lazy chunk (D-23) — implementation-waves.md §1.5. Built as its own esbuild entry
// (dist/mosnicat-prism.js) and loaded on demand by code.ts via idempotent script injection —
// never imported by core mosnicat.js/mosnicat.ts.

import "prismjs";
// The agreed initial language set (API §4.12 / guidelines §4.12): ts, js, html, css, bash, json, md.
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";

declare global {
  interface Window {
    Prism: { highlightElement: (el: HTMLElement) => void; manual: boolean };
    mosniPrism?: { highlight: (el: Element) => void };
  }
}

// Prism auto-highlights every `.language-*` block it finds as soon as it loads (its default
// DOMContentLoaded/rAF behaviour) — we want highlighting driven explicitly by code.ts instead (it
// knows which <mosni-code> instances are pending). A *static* `import "prismjs"` is hoisted ahead
// of any of our own top-level statements per ES module evaluation order (imports always run before
// the importing module's own code, regardless of source position), so `window.Prism` already is
// the real Prism object by the time this line runs — setting `window.Prism = { manual: true }`
// here (a fresh object) would instead silently replace it and drop `highlightElement` entirely.
// Prism's own deferred auto-highlight callback re-checks `Prism.manual` at call time (not just at
// registration time), so mutating the flag on the existing object, synchronously before that
// callback's next tick, is enough to suppress the auto-run.
window.Prism.manual = true;

window.mosniPrism = {
  highlight: (el: Element) => window.Prism.highlightElement(el as HTMLElement),
};
