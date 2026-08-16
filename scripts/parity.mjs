// The load-bearing check of the React path (agent-docs → planning-artifacts/react-path-implementation-waves.md §5.1, D-R6): every component is rendered
// BOTH ways with the same inputs, and any structural difference fails the build.
//
// Until this existed, D-17's "a component and its hand-written class equivalent render
// pixel-identically" was a promise kept by review alone. It now has to survive a diff, which is the
// only reason it is safe to tell a consumer that swapping <mosni-panel> for <Panel> changes nothing.
import { JSDOM, VirtualConsole } from "jsdom";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeHost } from "./lib/normalize-html.mjs";
import { bundleAndImport, cleanupScratch } from "./lib/bundle-and-import.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

let failed = false;
function fail(message) {
  failed = true;
  console.error(`parity: FAIL — ${message}`);
}

// One jsdom for every custom-element case rather than one per case: booting a document and
// evaluating the core bundle costs far more than the fixtures themselves, and the elements keep no
// cross-instance state that a shared document could leak between cases (each fixture is inserted
// into, and removed from, its own detached container).
async function makeElementDom() {
  const coreSrc = await readFile(
    path.join(distDir, "mosnicat-core.js"),
    "utf8",
  );
  const iconsSrc = await readFile(
    path.join(distDir, "mosnicat-icons.js"),
    "utf8",
  );

  const jsdomErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (err) => jsdomErrors.push(err));

  // The public icon chunk is evaluated INLINE here, before the core. <mosni-icon> lazily injects a
  // <script src> for it, which jsdom will not fetch — evaluating it up front means window.mosniIcons
  // already exists, so the element paints synchronously instead of parking its paint in `pending`
  // forever and comparing an empty span against React's rendered glyph.
  const dom = new JSDOM(
    `<!doctype html><html><head><script>${iconsSrc}</script><script>${coreSrc}</script></head><body></body></html>`,
    { runScripts: "dangerously", url: "https://ui.mosni.dev/", virtualConsole },
  );

  if (jsdomErrors.length > 0) {
    throw new Error(
      `evaluating the core bundle threw: ${jsdomErrors.map((e) => e.message).join("; ")}`,
    );
  }

  // Same stubs smoke.mjs installs: jsdom implements <dialog> but not showModal/close.
  const { window } = dom;
  if (typeof window.HTMLDialogElement.prototype.showModal !== "function") {
    window.HTMLDialogElement.prototype.showModal = function stubShowModal() {
      this.open = true;
    };
    window.HTMLDialogElement.prototype.close = function stubClose(returnValue) {
      if (returnValue !== undefined) this.returnValue = returnValue;
      this.open = false;
      this.dispatchEvent(new window.Event("close"));
    };
  }
  return dom;
}

// A macrotask, not a microtask: several elements defer work with setTimeout(…, 0) (the dropdown's
// listener attach, the tooltip's teardown), so awaiting a promise alone would sample the DOM before
// they have run.
const nextMacrotask = (window) =>
  new Promise((resolve) => window.setTimeout(resolve, 0));

async function renderElementSide(dom, html, attributesByTag) {
  const { document } = dom.window;
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.innerHTML = html;
  await nextMacrotask(dom.window);

  const host = container.firstElementChild;
  if (!host) {
    container.remove();
    throw new Error("fixture html produced no element");
  }
  const result = normalizeHost(host, attributesByTag);
  container.remove();
  return result;
}

// React 19 emits resource hints for rendered assets (an <img src> yields a hoisted
// <link rel="preload" as="image">) at the FRONT of the SSR stream, ahead of the component's own
// root - so `firstElementChild` would be the hint, not the component, for anything containing an
// image (<Logo>, and therefore <Header> and <Layout> too). The hints are real, correct output that a
// consumer's document head absorbs on hydration; they are simply not part of the component's
// subtree, so they are dropped before the comparison rather than compared against nothing.
const HOISTED_HINT_RELS = new Set([
  "preload",
  "preconnect",
  "prefetch",
  "dns-prefetch",
  "modulepreload",
]);

function renderReactSide(dom, element, attributesByTag) {
  const markup = renderToStaticMarkup(element);
  const { document } = dom.window;
  const container = document.createElement("div");
  container.innerHTML = markup;
  for (const link of Array.from(container.querySelectorAll("link[rel]"))) {
    if (HOISTED_HINT_RELS.has(link.getAttribute("rel"))) link.remove();
  }
  const root = container.firstElementChild;
  if (!root) throw new Error("React element produced no markup");
  return normalizeHost(root, attributesByTag);
}

// A plain line-by-line diff. The two sides are single-line serializations, so this splits on tag
// boundaries first — a 400-character one-line diff is unreadable, and the whole point of this
// output is that whoever broke parity can see WHICH element drifted.
function diff(expected, actual) {
  const split = (s) => s.replace(/></g, ">\n<").split("\n");
  const a = split(expected);
  const b = split(actual);
  const lines = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    if (a[i] !== undefined) lines.push(`  - element: ${a[i]}`);
    if (b[i] !== undefined) lines.push(`  + react:   ${b[i]}`);
  }
  return lines.join("\n");
}

// meta.ts is the single source of truth for what counts as a component's configuration surface (the
// docs tables are generated from it too), so the normalizer reads it rather than carrying a second,
// drift-prone copy. Bundled and imported the same way docs.mjs does it - meta.ts must never import a
// component module, so this stays safe to evaluate in Node.
async function loadAttributesByTag() {
  const mod = await bundleAndImport(
    path.join(rootDir, "src/js/components/meta.ts"),
  );
  return new Map(
    mod.componentMeta.map((meta) => [
      meta.tag,
      meta.attributes.map((attr) => attr.name),
    ]),
  );
}

async function main() {
  const { cases } = await bundleAndImport(
    path.join(rootDir, "packages/react/parity/fixtures.tsx"),
  );
  const attributesByTag = await loadAttributesByTag();

  const dom = await makeElementDom();

  for (const testCase of cases) {
    let elementSide;
    let reactSide;
    try {
      elementSide = await renderElementSide(
        dom,
        testCase.html,
        attributesByTag,
      );
      reactSide = renderReactSide(dom, testCase.element, attributesByTag);
    } catch (err) {
      fail(`${testCase.name}: ${err.message}`);
      continue;
    }

    if (elementSide.className !== reactSide.className) {
      fail(
        `${testCase.name}: root class differs\n  - element: "${elementSide.className}"\n  + react:   "${reactSide.className}"`,
      );
      continue;
    }
    if (elementSide.innerHtml !== reactSide.innerHtml) {
      fail(
        `${testCase.name}: rendered subtree differs\n${diff(elementSide.innerHtml, reactSide.innerHtml)}`,
      );
    }
  }

  dom.window.close();
  await cleanupScratch();

  if (failed) process.exit(1);
  console.log(`parity: OK - ${cases.length} fixtures match`);
}

main().catch(async (err) => {
  await cleanupScratch();
  console.error(`parity: FAIL — ${err.stack ?? err.message}`);
  process.exit(1);
});
