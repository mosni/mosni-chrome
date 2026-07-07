// Standalone, self-contained brand login button (the "Log in with MOSNIAUTH" widget).
// The repo's first Shadow-DOM element: it deliberately does NOT extend the light-DOM MosniElement and
// carries zero global side effects. Everything lives in its shadow root.
import { define } from "./base-element";

declare const __MOSNI_MARK_SVG__: string;
declare const __STAATLICHES_WOFF2__: string;

const LEAD: Record<string, string> = {
  signin: "Log in with",
  continue: "Continue with",
};

const STYLE = `
@font-face {
  font-family: "MosniStaatliches";
  font-style: normal;
  font-weight: 400;
  src: url(${__STAATLICHES_WOFF2__}) format("woff2");
}
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
