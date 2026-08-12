// Behaviour tests for @mosni/react (react-plan.md §5.2): interaction paths parity.mjs's static
// markup comparison structurally cannot see - clicks, keyboard nav, effect-driven async state,
// unmount cleanup. The actual test cases live in packages/react/behaviour/cases.tsx (real TSX,
// so it can render real components); this script's only job is to stand up a live DOM for
// react-dom/client to render into and run every case against it.
import { JSDOM } from "jsdom";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { bundleAndImport, cleanupScratch } from "./lib/bundle-and-import.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// react-dom/client (and the components it renders) read `document`/`window`/etc as ordinary
// globals - the same assumption every browser bundle makes. There is no test-runner here doing
// this implicitly (unlike Jest's jsdom environment), so it is done by hand, once, before the
// bundled cases module (which imports react-dom/client at its own module scope) is ever loaded.
function installDomGlobals() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://ui.mosni.dev/",
    pretendToBeVisual: true, // requestAnimationFrame + friends, harmless for jsdom's zero-layout box model
  });
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
  const dom = installDomGlobals();

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
