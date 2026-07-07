// Standalone, self-contained brand login button (the "Log in with MOSNIAUTH" widget).
// The repo's first Shadow-DOM element: it deliberately does NOT extend the light-DOM MosniElement.
// Everything renders inside its shadow root; the one document-level touch is registering the bundled
// Staatliches font via the FontFace API (see ensureBrandFont — @font-face does not work inside a
// shadow root), which is deferred to first use so a bare script include stays inert (contract §2.2).
import { define } from "./base-element";

declare const __MOSNI_MARK_SVG__: string;
declare const __STAATLICHES_WOFF2__: string;

const LEAD: Record<string, string> = {
  signin: "Log in with",
  continue: "Continue with",
};

const FONT_FAMILY = "MosniStaatliches";

// Register the bundled Staatliches face at the document level via the FontFace API.
// An @font-face declared inside a shadow root's <style> is NOT honored by browsers
// (long-standing Chrome/WebKit limitation), so the shadow-scoped rule silently failed and
// the wordmark fell back to system-ui. The FontFace API is the only way to make a bundled
// font usable inside a shadow root. This is the one minimal, deliberate document touch: it
// adds a single font-family that nothing on the host page references (so nothing leaks/shifts),
// and it is deferred to first element use (a bare script include stays inert per contract §2.2).
function ensureBrandFont(): void {
  if (typeof FontFace !== "function" || !document.fonts?.add) return;
  for (const face of document.fonts) {
    if (face.family === FONT_FAMILY) return; // double-load / multi-instance safe
  }
  const face = new FontFace(
    FONT_FAMILY,
    `url(${__STAATLICHES_WOFF2__}) format("woff2")`,
    { style: "normal", weight: "400" },
  );
  document.fonts.add(face);
  void face.load();
}

const STYLE = `
:host {
  --lb-bg: #262626;
  --lb-bg-hover: #303030;
  --lb-bg-active: #1e1e1e;
  --lb-fg: #fff;
  --lb-accent: #996bef;
  --lb-ring: #d9c8ff;
  --lb-pad: 0.6rem 1.1rem;
  --lb-font-size: 1rem;
  --lb-mark-height: 22px;
  display: inline-block;
}
:host([hidden]) {
  display: none;
}
:host([size="small"]) {
  --lb-pad: 0.4rem 0.8rem;
  --lb-font-size: 0.85rem;
  --lb-mark-height: 18px;
}
:host([size="large"]) {
  --lb-pad: 0.8rem 1.4rem;
  --lb-font-size: 1.15rem;
  --lb-mark-height: 26px;
}
.login {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  margin: 0;
  padding: var(--lb-pad);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: var(--lb-font-size);
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: normal;
  text-transform: none;
  color: var(--lb-fg);
  background: var(--lb-bg);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 120ms ease, transform 60ms ease;
}
.login:hover {
  background: var(--lb-bg-hover);
}
.login:active {
  background: var(--lb-bg-active);
  transform: translateY(1px);
}
.login:focus {
  outline: none;
}
.login:focus-visible {
  outline: 2px solid var(--lb-ring);
  outline-offset: 2px;
}
.login:disabled {
  cursor: default;
  opacity: 0.7;
  transform: none;
}
.mark {
  display: inline-flex;
  height: var(--lb-mark-height);
}
.mark svg {
  display: block;
  width: auto;
  height: 100%;
}
.label {
  white-space: nowrap;
}
.brand {
  font-family: "MosniStaatliches", system-ui, sans-serif;
  font-weight: 400;
  letter-spacing: 0.02em;
}
.brand .accent {
  color: var(--lb-accent);
}
@media (prefers-reduced-motion: reduce) {
  .login {
    transition: none;
  }
  .login:active {
    transform: none;
  }
}
`;

class MosniLoginButton extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["text", "loading"];
  }

  #button: HTMLButtonElement | null = null;
  #label: HTMLSpanElement | null = null;

  connectedCallback(): void {
    if (this.#button) return;

    ensureBrandFont();
    const root = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLE;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "login";

    const mark = document.createElement("span");
    mark.className = "mark";
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = __MOSNI_MARK_SVG__;

    const label = document.createElement("span");
    label.className = "label";

    button.append(mark, label);
    root.append(style, button);

    this.#button = button;
    this.#label = label;
    this.#syncLabel();
    this.#syncLoading();

    button.addEventListener("click", () => {
      if (this.hasAttribute("loading")) return;
      this.dispatchEvent(
        new CustomEvent("mosni:login", {
          bubbles: true,
          composed: true,
          detail: {},
        }),
      );
    });
  }

  attributeChangedCallback(name: string): void {
    if (!this.#button) return;
    if (name === "text") this.#syncLabel();
    else if (name === "loading") this.#syncLoading();
  }

  #syncLabel(): void {
    const kind = this.getAttribute("text") ?? "signin";
    const lead = LEAD[kind] ?? LEAD.signin;

    const brand = document.createElement("b");
    brand.className = "brand";
    const accent = document.createElement("span");
    accent.className = "accent";
    accent.textContent = "AUTH";
    brand.append(document.createTextNode("MOSNI"), accent);

    this.#label?.replaceChildren(document.createTextNode(lead + " "), brand);
  }

  #syncLoading(): void {
    const loading = this.hasAttribute("loading");
    if (!this.#button) return;
    this.#button.disabled = loading;
    if (loading) this.setAttribute("aria-busy", "true");
    else this.removeAttribute("aria-busy");
  }
}

define("mosni-login-button", MosniLoginButton);
