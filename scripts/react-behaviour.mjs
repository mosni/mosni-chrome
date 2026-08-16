// Behaviour tests for @mosni/react (agent-docs → planning-artifacts/react-path-implementation-waves.md §5.2): interaction paths parity.mjs's static
// markup comparison structurally cannot see - clicks, keyboard nav, effect-driven async state,
// unmount cleanup. The actual test cases live in packages/react/behaviour/cases.tsx (real TSX,
// so it can render real components); this script's only job is to stand up a live DOM for
// react-dom/client to render into and run every case against it.
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { bundleAndImport, cleanupScratch } from "./lib/bundle-and-import.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

// react-dom/client (and the components it renders) read `document`/`window`/etc as ordinary
// globals - the same assumption every browser bundle makes. There is no test-runner here doing
// this implicitly (unlike Jest's jsdom environment), so it is done by hand, once, before the
// bundled cases module (which imports react-dom/client at its own module scope) is ever loaded.
//
// login-button.js is evaluated INLINE here (runScripts: "dangerously"), the same way parity.mjs's
// makeElementDom() evaluates the core/icons bundles - <LoginButton> (D-R1's sanctioned exception)
// renders the REAL <mosni-login-button> tag, which only has a shadow root, upgrades, and dispatches
// mosni:login once its class is actually defined via customElements.define(); without this, the
// tag would sit as a bare, un-upgraded HTMLElement and the behaviour case would find no shadow root.
async function installDomGlobals() {
  const loginButtonSrc = await readFile(
    path.join(distDir, "login-button.js"),
    "utf8",
  );
  const dom = new JSDOM(
    `<!doctype html><html><head><script>${loginButtonSrc}</script></head><body></body></html>`,
    {
      url: "https://ui.mosni.dev/",
      runScripts: "dangerously",
      pretendToBeVisual: true, // requestAnimationFrame + friends, harmless for jsdom's zero-layout box model
    },
  );
  const { window } = dom;

  global.window = window;
  global.document = window.document;
  // Node has its own read-only, getter-defined global `navigator` (since Node 21) - a plain
  // assignment throws ("has only a getter"), so this needs defineProperty to actually replace it
  // with jsdom's.
  Object.defineProperty(global, "navigator", {
    value: window.navigator,
    configurable: true,
    writable: true,
  });
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
  global.customElements = window.customElements;
  global.Event = window.Event;
  global.MouseEvent = window.MouseEvent;
  global.KeyboardEvent = window.KeyboardEvent;
  global.PointerEvent = window.PointerEvent;
  global.getComputedStyle = window.getComputedStyle.bind(window);
  global.requestAnimationFrame =
    window.requestAnimationFrame ??
    ((cb) => setTimeout(() => cb(Date.now()), 0));
  global.cancelAnimationFrame = window.cancelAnimationFrame ?? clearTimeout;
  // The documented flag for driving React's `act()` outside an official testing-library
  // integration (React Testing Library sets this same flag under the hood) - without it React
  // logs "not configured to support act(...)" warnings for every update in this file.
  global.IS_REACT_ACT_ENVIRONMENT = true;

  // jsdom implements <dialog> but not showModal()/close() - same stub smoke.mjs and parity.mjs
  // both install, needed here too for <Modal>'s behaviour case.
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

let failed = false;
function fail(name, err) {
  failed = true;
  console.error(
    `react-behaviour: FAIL — ${name}\n  ${err.stack ?? err.message}`,
  );
}

async function main() {
  const dom = await installDomGlobals();

  const { cases } = await bundleAndImport(
    path.join(rootDir, "packages/react/behaviour/cases.tsx"),
  );

  for (const testCase of cases) {
    try {
      await testCase.run();
    } catch (err) {
      fail(testCase.name, err);
    }
  }

  dom.window.close();
  await cleanupScratch();

  if (failed) process.exit(1);
  console.log(`react-behaviour: OK - ${cases.length} cases passed`);
}

main().catch(async (err) => {
  await cleanupScratch();
  console.error(`react-behaviour: FAIL — ${err.stack ?? err.message}`);
  process.exit(1);
});
