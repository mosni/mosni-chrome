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
  const eyeCanvases = document.querySelectorAll("canvas.eye");
  if (eyeCanvases.length !== 2) {
    fail(
      `idempotency guard failed: expected exactly 2 canvas.eye after two includes, found ${eyeCanvases.length}`,
    );
  }
  const styleTags = document.querySelectorAll("style#mosni-styles");
  if (styleTags.length !== 1) {
    fail(
      `idempotency guard failed: expected exactly 1 style#mosni-styles after two includes, found ${styleTags.length}`,
    );
  }
  if (!styleTags[0]?.textContent.includes("--mosni-purple")) {
    fail(
      "style#mosni-styles does not contain the bundled mosnicat CSS (missing --mosni-purple)",
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
    // Wave 2 (0002): one selector per new fragment. This function only parses the built
    // dist/index.html with plain JSDOM (no runScripts) — components never upgrade here, so every
    // component selector below targets the raw authored tag/attribute, never a JS-generated class.
    "mosni-header.html": "mosni-header[brand]",
    "mosni-layout.html": "mosni-layout mosni-menu-item[selected]",
    "mosni-menu.html": "mosni-menu-item[selected]",
    "mosni-panel.html": "mosni-panel[heading]",
    "mosni-footer.html": 'mosni-footer a[slot="links"]',
    "mosni-field.html": "mosni-field[type='email']",
    "mosni-switch.html": "mosni-switch[checked]",
    "mosni-modal.html": "mosni-modal[heading]",
    "mosni-tooltip.html": "mosni-tooltip[text]",
    "mosni-toast.html": 'button[onclick*="mosni.toast"]',
    "mosni-lightbox.html": "mosni-lightbox[caption]",
    "mosni-code.html": "mosni-code[language='ts']",
    "mosni-accordion.html": "mosni-accordion[exclusive]",
    "mosni-tabs.html": "mosni-tab[selected]",
    "alert.html": ".alert.success",
    "badge.html": ".badge.primary",
    "spinner.html": ".spinner",
    "progress.html": ".progress",
    "divider.html": ".divider",
    "table.html": ".table.interactive",
    "prose.html": ".prose",
    "content-container.html": ".content-container",
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

// Wave 2 (0002, D-15/D-19): one JSDOM with the built mosnicat.js inlined, runScripts:
// "dangerously" (same pattern as testBootstrapInvariants), covering upgrade + structure + one
// state reflection per component (implementation-waves.md §2.4's table). jsdom gaps are stubbed
// once, up front, before any component is created — never silently skipped.
async function testComponents() {
  const bootstrapSrc = await readFile(
    path.join(distDir, "mosnicat.js"),
    "utf8",
  );
  const html = `<!doctype html>
<html>
  <head>
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
  const { window } = dom;
  const { document } = window;

  await waitForDomContentLoaded(window);

  // jsdom (as of the pinned 29.1.1) implements no top-layer at all: HTMLDialogElement.prototype
  // has neither showModal() nor close(). Stub the bare minimum our components rely on — toggling
  // the `open` IDL property, which jsdom *does* correctly attribute-reflect already — before any
  // <mosni-modal>/<mosni-lightbox> is created. close() also fires the native `close` event
  // synchronously so modal.ts's own "reflect native close back onto the host attribute" listener
  // runs exactly as it would in a real browser; without this, `close()` would silently do nothing
  // observable and the reflect-back assertion below could never fail honestly.
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

  const assertTrue = (condition, message) => {
    if (!condition) fail(`testComponents: ${message}`);
  };

  // mosni-header (API §4.1)
  {
    const el = document.createElement("mosni-header");
    el.setAttribute("brand", "a");
    el.setAttribute("accent", "b");
    el.setAttribute("tagline", "t");
    document.body.appendChild(el);

    assertTrue(
      el.classList.contains("header"),
      "mosni-header: self has .header",
    );
    const brand = el.querySelector(".brand");
    assertTrue(
      !!brand && brand.firstChild?.textContent === "a",
      "mosni-header: .brand text is 'a'",
    );
    assertTrue(
      el.querySelector(".brand .purple")?.textContent === "b",
      "mosni-header: .brand .purple text is 'b'",
    );
    assertTrue(
      el.querySelector(".little-link")?.textContent === "t",
      "mosni-header: .little-link text is 't'",
    );
  }

  // mosni-layout (API §4.2)
  {
    const el = document.createElement("mosni-layout");
    el.innerHTML =
      '<div slot="header">H</div><mosni-menu slot="menu"></mosni-menu><p>Body</p>';
    document.body.appendChild(el);

    assertTrue(
      el.classList.contains("layout"),
      "mosni-layout: self has .layout",
    );
    assertTrue(
      !!el.querySelector(".layout-menu > mosni-menu"),
      "mosni-layout: .layout-menu holds the menu",
    );
    assertTrue(
      !!el.querySelector("main.layout-main > p"),
      "mosni-layout: main.layout-main holds the default <p>",
    );
  }

  // mosni-menu (API §4.3)
  {
    const el = document.createElement("mosni-menu");
    el.setAttribute("label", "Nav");
    el.innerHTML = '<mosni-menu-item title="Item"></mosni-menu-item>';
    document.body.appendChild(el);

    assertTrue(el.classList.contains("menu"), "mosni-menu: self has .menu");
    assertTrue(
      el.getAttribute("role") === "navigation",
      "mosni-menu: role=navigation",
    );
    assertTrue(
      el.getAttribute("aria-label") === "Nav",
      'mosni-menu: aria-label="Nav"',
    );
  }

  // mosni-menu-item (API §4.3)
  {
    const el = document.createElement("mosni-menu-item");
    el.setAttribute("title", "A");
    el.setAttribute("subtitle", "s");
    el.setAttribute("href", "/a");
    document.body.appendChild(el);

    assertTrue(
      !!el.querySelector('a.menu-entry[href="/a"] > .menu-entry-title'),
      "mosni-menu-item: a.menu-entry[href] > .menu-entry-title",
    );
    assertTrue(
      !!el.querySelector(".menu-entry-subtitle"),
      "mosni-menu-item: .menu-entry-subtitle present",
    );

    el.selected = true;
    const entrySelected = el.querySelector(".menu-entry.selected");
    assertTrue(
      !!entrySelected && entrySelected.getAttribute("aria-current") === "page",
      'mosni-menu-item: selected=true adds .selected + aria-current="page"',
    );

    el.selected = false;
    assertTrue(
      !el.querySelector(".menu-entry.selected") &&
        !el.querySelector(".menu-entry").hasAttribute("aria-current"),
      "mosni-menu-item: selected=false removes .selected + aria-current",
    );
  }

  // mosni-panel (API §4.4)
  {
    const el = document.createElement("mosni-panel");
    el.setAttribute("heading", "Hi");
    el.innerHTML = "<p>Body</p>";
    document.body.appendChild(el);

    assertTrue(el.classList.contains("panel"), "mosni-panel: self has .panel");
    assertTrue(
      el.firstElementChild?.tagName === "H1" &&
        el.firstElementChild.textContent === "Hi",
      "mosni-panel: first child is an injected <h1>Hi</h1>",
    );
    assertTrue(!!el.querySelector("p"), "mosni-panel: <p> child preserved");

    // Enhance-first: an authored <h1> child suppresses the injected one entirely (a fresh
    // instance, since MosniElement renders once on connect — this isn't attribute reflection,
    // it's the static build-time enhance-first rule, exercised with a second element).
    const el2 = document.createElement("mosni-panel");
    el2.setAttribute("heading", "Ignored");
    el2.innerHTML = "<h1>Authored</h1>";
    document.body.appendChild(el2);
    assertTrue(
      el2.querySelectorAll("h1").length === 1 &&
        el2.querySelector("h1").textContent === "Authored",
      "mosni-panel: authored <h1> child suppresses the injected one",
    );
  }

  // mosni-footer (API §4.5)
  {
    const el = document.createElement("mosni-footer");
    el.innerHTML = 'Left text<a slot="links" href="/x">Link</a>';
    document.body.appendChild(el);

    assertTrue(
      el.classList.contains("footer"),
      "mosni-footer: self has .footer",
    );
    assertTrue(
      el.querySelector(".footer-left")?.textContent.trim() === "Left text",
      "mosni-footer: .footer-left holds the default text",
    );
    assertTrue(
      !!el.querySelector(".footer-links a"),
      "mosni-footer: .footer-links holds the slot=links anchor",
    );
  }

  // mosni-field (API §4.6)
  {
    const el = document.createElement("mosni-field");
    el.setAttribute("label", "E");
    el.setAttribute("type", "email");
    el.setAttribute("required", "");
    document.body.appendChild(el);

    assertTrue(el.classList.contains("field"), "mosni-field: self has .field");
    const label = el.querySelector("label.field-label");
    const control = el.querySelector("input[type=email][required]");
    assertTrue(
      !!label &&
        !!label.getAttribute("for") &&
        !!label.querySelector(".field-req"),
      "mosni-field: label.field-label[for] with .field-req",
    );
    assertTrue(
      !!control && control.id === label?.getAttribute("for"),
      "mosni-field: input[type=email][required] id matches the label's for",
    );

    el.error = "bad";
    assertTrue(
      el.classList.contains("error"),
      "mosni-field: error=... adds .field.error",
    );
    assertTrue(
      el.querySelector(".field-error")?.textContent === "bad",
      "mosni-field: visible .field-error text",
    );
    assertTrue(
      control?.getAttribute("aria-invalid") === "true",
      'mosni-field: aria-invalid="true" on the control',
    );
  }

  // mosni-switch (API §4.7)
  {
    const el = document.createElement("mosni-switch");
    el.setAttribute("label", "On");
    document.body.appendChild(el);

    const input = el.querySelector("label.switch > input[type=checkbox]");
    assertTrue(!!input, "mosni-switch: label.switch > input[type=checkbox]");
    assertTrue(
      !!el.querySelector(".switch-visual > .switch-thumb"),
      "mosni-switch: .switch-visual > .switch-thumb",
    );

    el.checked = true;
    assertTrue(
      input.checked === true && el.hasAttribute("checked"),
      "mosni-switch: checked=true syncs the inner checkbox + attribute",
    );
  }

  // mosni-modal (API §4.8)
  {
    const el = document.createElement("mosni-modal");
    el.setAttribute("heading", "M");
    el.innerHTML = '<p>Body</p><button slot="footer">OK</button>';
    document.body.appendChild(el);

    const dialog = el.querySelector("dialog.modal");
    assertTrue(!!dialog, "mosni-modal: generated dialog.modal");
    assertTrue(
      !!dialog?.querySelector(".modal-close"),
      "mosni-modal: .modal-close present",
    );
    assertTrue(
      dialog?.querySelector(".modal-heading")?.textContent === "M",
      "mosni-modal: .modal-heading text is 'M'",
    );
    assertTrue(
      !!dialog?.querySelector(".modal-body"),
      "mosni-modal: .modal-body present",
    );
    assertTrue(
      !!dialog?.querySelector(".modal-footer"),
      "mosni-modal: .modal-footer present",
    );

    el.open = true;
    assertTrue(
      dialog.open === true,
      "mosni-modal: open=true calls the (stubbed) showModal()",
    );

    // Native close (e.g. Esc in a real browser) fires the dialog's own `close` event — assert the
    // host's `open` attribute reflects back, per API §4.8 "on native close the element removes
    // open". Calling dialog.close() directly (bypassing el.close()) is what exercises that
    // listener rather than the host-driven path already covered above.
    dialog.close();
    assertTrue(
      !el.hasAttribute("open"),
      "mosni-modal: native dialog close reflects back onto the host's open attribute",
    );
  }

  // mosni-tooltip (API §4.9)
  {
    const el = document.createElement("mosni-tooltip");
    el.setAttribute("text", "tip");
    el.innerHTML = "<button>Anchor</button>";
    document.body.appendChild(el);

    const tip = document.body.querySelector(".tooltip[role=tooltip][hidden]");
    const anchor = el.querySelector("button");
    assertTrue(
      !!tip,
      "mosni-tooltip: body gained .tooltip[role=tooltip][hidden]",
    );
    assertTrue(
      !!anchor && anchor.getAttribute("aria-describedby") === tip?.id,
      "mosni-tooltip: anchor's aria-describedby matches the tip's id",
    );

    // No mirroring property is spelled out in API §4.9 (only "text observed"), but API §1.3's
    // general convention is that every observed/runtime-state attribute gets one — added as a
    // minimal fix in tooltip.ts (see that file). Exercise it here since it's now the real,
    // intended way to update the text.
    el.text = "new";
    assertTrue(
      tip?.textContent === "new",
      "mosni-tooltip: text='new' (property) updates the tip text",
    );
  }

  // mosni-toast (API §4.10)
  {
    const handle = window.mosni?.toast?.("hi", { variant: "success" });
    assertTrue(
      !!handle,
      "mosni-toast: window.mosni.toast(...) returns a handle",
    );

    const host = document.querySelector(".toast-host[aria-live=polite]");
    assertTrue(
      !!host,
      "mosni-toast: body gained .toast-host[aria-live=polite]",
    );
    const toastEl = host?.querySelector(".toast.toast-success[role=status]");
    assertTrue(
      !!toastEl,
      "mosni-toast: .toast.toast-success[role=status] created",
    );
    assertTrue(
      toastEl?.querySelector(".toast-msg")?.textContent === "hi",
      "mosni-toast: .toast-msg text is 'hi'",
    );

    let dismissEventFired = false;
    toastEl?.addEventListener("mosni-toast-dismiss", () => {
      dismissEventFired = true;
    });
    handle?.dismiss();
    assertTrue(
      dismissEventFired,
      "mosni-toast: handle.dismiss() fires mosni-toast-dismiss",
    );
    // The element detaches after its exit-fade timeout (~150ms), not synchronously — wait it out
    // before asserting removal so this isn't a false negative.
    await new Promise((resolve) => setTimeout(resolve, 250));
    assertTrue(
      !host?.contains(toastEl),
      "mosni-toast: handle.dismiss() removes the toast element",
    );
  }

  // mosni-lightbox (API §4.11)
  {
    const el = document.createElement("mosni-lightbox");
    el.innerHTML = '<img src="x.png">';
    document.body.appendChild(el);

    assertTrue(
      el.querySelector("img")?.classList.contains("lightbox-thumb"),
      "mosni-lightbox: the img gained .lightbox-thumb",
    );

    el.open();
    const dialog = document.body.querySelector("dialog.lightbox");
    assertTrue(
      !!dialog && !!dialog.querySelector("img"),
      "mosni-lightbox: open() appends body dialog.lightbox with an img",
    );

    el.close();
    assertTrue(
      !document.body.contains(dialog),
      "mosni-lightbox: close() removes the generated dialog",
    );
  }

  // mosni-code (API §4.12)
  {
    const el = document.createElement("mosni-code");
    el.setAttribute("language", "ts");
    el.innerHTML = "<pre>const x = 1;</pre>";
    document.body.appendChild(el);

    assertTrue(el.classList.contains("code"), "mosni-code: self has .code");
    assertTrue(
      !!el.querySelector(".code-header .code-lang"),
      "mosni-code: .code-header .code-lang present",
    );
    assertTrue(
      el.querySelector("pre > code.language-ts")?.textContent ===
        "const x = 1;",
      "mosni-code: pre > code.language-ts holds the authored text",
    );
  }

  // mosni-accordion (API §4.13)
  {
    const el = document.createElement("mosni-accordion");
    el.setAttribute("exclusive", "");
    el.innerHTML =
      "<details><summary>A</summary>x</details><details><summary>B</summary>y</details>";
    document.body.appendChild(el);

    assertTrue(
      el.querySelectorAll(".accordion-chevron").length === 2,
      "mosni-accordion: each summary gained .accordion-chevron",
    );
    const [first, second] = el.querySelectorAll("details");
    // jsdom (29.1.1) does not implement the HTML `name` IDL attribute on <details> at all (no
    // getOwnPropertyDescriptor on the prototype — it's a recent, not-yet-Baseline-everywhere HTML
    // addition), so `details.name = x` in accordion.ts lands as a plain instance property rather
    // than a reflected content attribute here. Assert the property jsdom actually gives us
    // (equal, generated, non-empty) rather than the attribute a real browser would also show.
    assertTrue(
      !!first.name && first.name === second.name,
      "mosni-accordion: both <details> share one generated name (exclusive)",
    );
  }

  // mosni-tabs (+ mosni-tab) (API §4.14)
  {
    const el = document.createElement("mosni-tabs");
    el.innerHTML =
      '<mosni-tab label="One" selected><p>one</p></mosni-tab><mosni-tab label="Two"><p>two</p></mosni-tab>';
    document.body.appendChild(el);

    const buttons = el.querySelectorAll(
      ".tabs-bar[role=tablist] > button.tab[role=tab]",
    );
    const panels = el.querySelectorAll("[role=tabpanel]");
    assertTrue(
      buttons.length === 2,
      "mosni-tabs: .tabs-bar[role=tablist] holds 2 button.tab[role=tab]",
    );
    assertTrue(panels.length === 2, "mosni-tabs: 2 [role=tabpanel] panels");
    assertTrue(
      panels[1]?.hidden === true,
      "mosni-tabs: the second (unselected) panel is hidden",
    );
    assertTrue(
      buttons[0]?.tabIndex === 0 && buttons[1]?.tabIndex === -1,
      "mosni-tabs: roving tabindex starts 0 on the selected tab, -1 elsewhere",
    );
    assertTrue(
      buttons[0]?.textContent === "One" && buttons[1]?.textContent === "Two",
      "mosni-tabs: tab button labels render (B2 regression guard)",
    );

    let changeDetail = null;
    el.addEventListener("mosni-tab-change", (event) => {
      changeDetail = event.detail;
    });
    buttons[1]?.click();

    assertTrue(
      buttons[1]?.getAttribute("aria-selected") === "true" &&
        buttons[0]?.getAttribute("aria-selected") === "false",
      "mosni-tabs: click swaps aria-selected",
    );
    assertTrue(
      panels[1]?.hidden === false && panels[0]?.hidden === true,
      "mosni-tabs: click swaps which panel is hidden",
    );
    assertTrue(
      buttons[1]?.tabIndex === 0 && buttons[0]?.tabIndex === -1,
      "mosni-tabs: click swaps the roving tabindex",
    );
    assertTrue(
      changeDetail?.index === 1,
      "mosni-tabs: mosni-tab-change fired with detail.index === 1",
    );
  }

  if (jsdomErrors.length > 0) {
    fail(
      `testComponents: uncaught jsdomError(s): ${jsdomErrors.map((e) => e.message).join("; ")} ` +
        "(the Prism chunk is expected to never load here — no resource fetching in this JSDOM — " +
        "but that must degrade to unhighlighted code, never an error)",
    );
  }

  window.close();
}

async function testCssGuardScope() {
  const css = await readFile(path.join(distDir, "mosnicat.css"), "utf8");

  if (!css.includes("mosni-menu-item:not(:defined)")) {
    fail(
      "mosnicat.css is missing the mosni-menu-item:not(:defined) flash guard (A2)",
    );
  }
  if (!css.includes("mosni-toast:not(:defined)")) {
    fail(
      "mosnicat.css is missing the mosni-toast:not(:defined) flash guard (A2)",
    );
  }
  if (css.includes("mosni-panel:not(:defined)")) {
    fail(
      "mosnicat.css: the flash guard must stay scoped to mosni-menu-item/mosni-toast only (A2) " +
        "— found mosni-panel:not(:defined), which would hide authored no-JS content",
    );
  }
}

// Wave 3 (0002-polish-1) regression guard: unlike testComponents(), which never actually loads the
// real Prism chunk (no resource fetching in jsdom, so it degrades to unhighlighted code), this
// evaluates the built mosnicat-prism.js chunk directly in jsdom, catching the real import-hoisting
// bug where esbuild's static `import "prismjs"` runs before any of this module's own top-level
// statements — so preassigning `window.Prism = { manual: true }` silently discarded the real Prism
// object (dropping `highlightElement`) instead of just setting the flag on it.
async function testPrismChunkManualMode() {
  const prismSrc = await readFile(
    path.join(distDir, "mosnicat-prism.js"),
    "utf8",
  );
  const html = `<!doctype html>
<html>
  <head></head>
  <body>
    <pre><code class="language-ts">const x = 1;</code></pre>
    <script>${prismSrc}</script>
  </body>
</html>`;

  const jsdomErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (err) => jsdomErrors.push(err));

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://example.com/",
    virtualConsole,
  });
  const { window } = dom;

  if (window.Prism.manual !== true) {
    fail(
      "mosnicat-prism.js: window.Prism.manual is not true after load (auto-highlight-on-load would fire)",
    );
  }
  if (typeof window.Prism.highlightElement !== "function") {
    fail(
      "mosnicat-prism.js: window.Prism.highlightElement is not a function — the real Prism object " +
        "was replaced instead of just having .manual set on it",
    );
  }
  try {
    window.mosniPrism.highlight(window.document.querySelector("code"));
  } catch (err) {
    fail(
      `mosnicat-prism.js: window.mosniPrism.highlight() threw: ${err.message}`,
    );
  }

  // Let any deferred (rAF/setTimeout) Prism auto-highlight callback actually run, and confirm it
  // stays a no-op now that manual=true was set synchronously before it could fire.
  await new Promise((resolve) => setTimeout(resolve, 50));
  if (jsdomErrors.length > 0) {
    fail(
      `mosnicat-prism.js: uncaught jsdomError(s) after the deferred auto-highlight tick: ${jsdomErrors
        .map((e) => e.message)
        .join("; ")}`,
    );
  }

  window.close();
}

async function main() {
  await testBootstrapInvariants();
  await testDocsExamplesRender();
  await testComponents();
  await testPrismChunkManualMode();
  await testCssGuardScope();
  if (failed) {
    console.error("smoke: FAILED");
    process.exit(1);
  }
  console.log("smoke: OK");
}

main();
