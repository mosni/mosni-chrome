import "prismjs";
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

// Suppress Prism's auto-highlight-on-load so code.ts drives highlighting explicitly. Mutate the
// flag on the existing object — the static `import "prismjs"` above is hoisted, so window.Prism is
// already the real Prism; assigning `window.Prism = { manual: true }` would drop highlightElement.
window.Prism.manual = true;

window.mosniPrism = {
  highlight: (el: Element) => window.Prism.highlightElement(el as HTMLElement),
};
