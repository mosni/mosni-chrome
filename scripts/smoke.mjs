// Verification smoke (D-19, Wave 4): asserts the drop-in invariants (D-2a) and that every
// documented example renders. jsdom is dev-only and never shipped in dist/.
import { JSDOM, VirtualConsole } from "jsdom";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

let failed = false;
function fail(message) {
  failed = true;
  console.error(`smoke: FAIL — ${message}`);
}

async function waitForDomContentLoaded(window) {
  if (window.document.readyState !== "loading") return;
  await new Promise((resolve) => {
    window.document.addEventListener("DOMContentLoaded", resolve, {
      once: true,
    });
  });
}

async function testBootstrapInvariants() {
  const bootstrapSrc = await readFile(
    path.join(distDir, "mosnicat.js"),
    "utf8",
  );

  // A naive <head>-only include, included twice, exercises all three drop-in invariants at once:
  // naive-include-safe (document.body doesn't exist yet when the script runs), idempotent (the
  // second copy must no-op), and position-independent is implied by not depending on placement.
  const html = `<!doctype html>
<html>
  <head>
    <script>${bootstrapSrc}</script>
    <script>${bootstrapSrc}</script>
  </head>
  <body></body>
</html>`;

  const jsdomErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (err) => jsdomErrors.push(err));

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://example.com/",
    virtualConsole,
  });

  if (jsdomErrors.length > 0) {
    fail(
      `naive <head> include threw: ${jsdomErrors.map((e) => e.message).join("; ")} (violates naive-include-safe)`,
    );
    return;
  }

  const { document } = dom.window;
  await waitForDomContentLoaded(dom.window);

  if (!document.querySelector('meta[name="viewport"]')) {
    fail("viewport meta was not injected");
  }
  if (!document.querySelector('link[rel="icon"]')) {
    fail("favicon link was not injected");
  }

  const catImages = document.querySelectorAll("img#cat-image");
  if (catImages.length !== 1) {
    fail(
      `idempotency guard failed: expected exactly 1 img#cat-image after two includes, found ${catImages.length}`,
    );
  }
  const catScripts = document.querySelectorAll(
    'script[src="https://mosni.dev/cat.js"]',
  );
  if (catScripts.length !== 1) {
    fail(
      `idempotency guard failed: expected exactly 1 cat.js script tag after two includes, found ${catScripts.length}`,
    );
  }
  const stylesheetLinks = document.querySelectorAll(
    'link[href="https://mosni.dev/mosnicat.css"]',
  );
  if (stylesheetLinks.length !== 1) {
    fail(
      `idempotency guard failed: expected exactly 1 mosnicat.css link after two includes, found ${stylesheetLinks.length}`,
    );
  }

  dom.window.close();
}

async function testDocsExamplesRender() {
  const indexHtml = await readFile(path.join(distDir, "index.html"), "utf8");

  // One representative selector per docs/examples/ fragment (per class surviving Wave 0).
  const exampleSelectors = {
    "header.html": ".header",
    "purple.html": ".purple",
    "panel.html": ".panel",
    "panel-input.html": '.panel input[type="email"]',
    "btn.html": ".panel .btn",
    "btn-block.html": ".panel .btn-block",
    "status.html": ".status",
    "layout.html": ".menu-entry",
    "text-container.html": ".text-container",
    "link.html": 'a[href="https://mosni.dev"]',
  };

  const dom = new JSDOM(indexHtml);
  const { document } = dom.window;

  for (const [fixture, selector] of Object.entries(exampleSelectors)) {
    if (!document.querySelector(selector)) {
      fail(
        `docs page is missing the rendered example for ${fixture} (selector "${selector}")`,
      );
    }
  }

  dom.window.close();
}

async function main() {
  await testBootstrapInvariants();
  await testDocsExamplesRender();
  if (failed) {
    console.error("smoke: FAILED");
    process.exit(1);
  }
  console.log("smoke: OK");
}

main();
