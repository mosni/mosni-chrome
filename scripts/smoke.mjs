// Asserts the drop-in invariants and that every documented example renders. jsdom is dev-only.
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

  const styleLinks = document.querySelectorAll("link#mosni-styles");
  if (styleLinks.length !== 1) {
    fail(
      `idempotency guard failed: expected exactly 1 link#mosni-styles after two includes, found ${styleLinks.length}`,
    );
  }
  if (!styleLinks[0]?.getAttribute("href")?.endsWith("mosnicat.css")) {
    fail("link#mosni-styles does not point at the mosnicat.css stylesheet");
  }

  const coreScripts = document.querySelectorAll("script#mosni-core");
  if (coreScripts.length !== 1) {
    fail(
      `idempotency guard failed: expected exactly 1 script#mosni-core after two includes, found ${coreScripts.length}`,
    );
  }
  if (!coreScripts[0]?.getAttribute("src")?.endsWith("mosnicat-core.js")) {
    fail("script#mosni-core does not point at the mosnicat-core.js bundle");
  }

  dom.window.close();

  const css = await readFile(path.join(distDir, "mosnicat.css"), "utf8");
  if (!css.includes("--mosni-purple")) {
    fail(
      "dist/mosnicat.css does not contain the bundled mosnicat CSS (missing --mosni-purple)",
    );
  }
}

async function testDocsExamplesRender() {
  const indexHtml = await readFile(path.join(distDir, "index.html"), "utf8");

  const exampleSelectors = {
    "header.html": ".header",
    "purple.html": ".purple",
    "panel.html": ".panel",
    "panel-input.html": '.panel input[type="email"]',
    "btn.html": ".btn",
    "btn-block.html": ".btn-block",
    "status.html": ".status",
    "layout.html": ".menu-entry",
    "text-container.html": ".text-container",
    "link.html": 'a[href="https://mosni.dev"]',
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
    "mosni-logo.html": "mosni-logo",
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
    "icons.html": "mosni-icon[name]",
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

async function testComponents() {
  const coreSrc = await readFile(
    path.join(distDir, "mosnicat-core.js"),
    "utf8",
  );
  const html = `<!doctype html>
<html>
  <head>
    <script>${coreSrc}</script>
    <script>${coreSrc}</script>
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

  assertTrue(
    document.querySelectorAll("img#cat-image").length === 1,
    "cat: exactly 1 img#cat-image after two core includes",
  );
  assertTrue(
    document.querySelectorAll("canvas.eye").length === 2,
    "cat: exactly 2 canvas.eye after two core includes",
  );

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
      !!el.querySelector(".header-brand > mosni-logo"),
      "mosni-header: .header-brand holds the default mosni-logo",
    );

    const bare = document.createElement("mosni-header");
    bare.setAttribute("brand", "a");
    bare.setAttribute("no-logo", "");
    document.body.appendChild(bare);
    assertTrue(
      !bare.querySelector("mosni-logo") && !!bare.querySelector(".brand"),
      "mosni-header: no-logo omits the logo but keeps the brand",
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

    dialog.close();
    assertTrue(
      !el.hasAttribute("open"),
      "mosni-modal: native dialog close reflects back onto the host's open attribute",
    );
  }

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

    el.text = "new";
    assertTrue(
      tip?.textContent === "new",
      "mosni-tooltip: text='new' (property) updates the tip text",
    );
  }

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
    await new Promise((resolve) => setTimeout(resolve, 250));
    assertTrue(
      !host?.contains(toastEl),
      "mosni-toast: handle.dismiss() removes the toast element",
    );
  }

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
    assertTrue(
      !!first.name && first.name === second.name,
      "mosni-accordion: both <details> share one generated name (exclusive)",
    );
  }

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
      "mosni-tabs: tab button labels render",
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

async function testLoginButton() {
  const src = await readFile(path.join(distDir, "login-button.js"), "utf8");
  const html = `<!doctype html>
<html><head><style>body{font-family:"Comic Sans MS";color:red;text-transform:uppercase}</style></head>
<body><script>${src}</script><script>${src}</script></body></html>`;

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

  if (jsdomErrors.length > 0) {
    fail(
      `login-button: script threw: ${jsdomErrors.map((e) => e.message).join("; ")}`,
    );
    return;
  }

  if (document.querySelector('meta[name="viewport"]')) {
    fail("login-button: injected a viewport meta");
  }
  if (
    document.querySelector("#mosni-styles, #mosni-core, link[href*='mosnicat']")
  ) {
    fail("login-button: injected chrome styles/core");
  }

  const el = document.createElement("mosni-login-button");
  document.body.appendChild(el);

  if (!el.shadowRoot) {
    fail("login-button: no shadow root");
    window.close();
    return;
  }
  const button = el.shadowRoot.querySelector("button.login");
  if (!button) {
    fail("login-button: no native <button> in the shadow root");
    window.close();
    return;
  }
  if (el.shadowRoot.querySelector(".brand .accent")?.textContent !== "AUTH") {
    fail(
      "login-button: purple 'AUTH' accent missing from the MOSNIAUTH wordmark",
    );
  }
  if (
    !el.shadowRoot.querySelector(".label")?.textContent?.includes("MOSNIAUTH")
  ) {
    fail("login-button: label does not read 'MOSNIAUTH'");
  }

  let seen = null;
  document.addEventListener("mosni:login", (event) => {
    seen = event;
  });
  button.click();
  if (!seen) {
    fail("login-button: click did not dispatch mosni:login to document");
    window.close();
    return;
  }
  if (seen.bubbles !== true || seen.composed !== true) {
    fail("login-button: mosni:login must be { bubbles:true, composed:true }");
  }
  if (seen.cancelable !== false) {
    fail("login-button: mosni:login must not be cancelable");
  }

  el.setAttribute("loading", "");
  if (el.getAttribute("aria-busy") !== "true") {
    fail("login-button: loading did not set aria-busy=true");
  }
  if (button.disabled !== true) {
    fail("login-button: loading did not disable the button");
  }
  seen = null;
  button.click();
  if (seen) {
    fail("login-button: loading state must suppress mosni:login");
  }
  el.removeAttribute("loading");
  if (el.hasAttribute("aria-busy")) {
    fail("login-button: removing loading did not clear aria-busy");
  }

  window.close();
}

async function testCssGuardScope() {
  const css = await readFile(path.join(distDir, "mosnicat.css"), "utf8");

  if (!css.includes("mosni-menu-item:not(:defined)")) {
    fail(
      "mosnicat.css is missing the mosni-menu-item:not(:defined) flash guard",
    );
  }
  if (!css.includes("mosni-toast:not(:defined)")) {
    fail("mosnicat.css is missing the mosni-toast:not(:defined) flash guard");
  }
  if (css.includes("mosni-panel:not(:defined)")) {
    fail(
      "mosnicat.css: the flash guard must stay scoped to mosni-menu-item/mosni-toast only " +
        "— found mosni-panel:not(:defined), which would hide authored no-JS content",
    );
  }
}

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
  await testLoginButton();
  await testPrismChunkManualMode();
  await testCssGuardScope();
  if (failed) {
    console.error("smoke: FAILED");
    process.exit(1);
  }
  console.log("smoke: OK");
}

main();
