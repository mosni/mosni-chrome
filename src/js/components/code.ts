import { MosniElement, define, assetBase } from "../base-element";
import { icon } from "../icons";

declare global {
  interface Window {
    mosniPrism?: { highlight: (el: Element) => void };
  }
}

const PRISM_CHUNK_URL = `${assetBase}mosnicat-prism.js`;

// Module-level state shared across every <mosni-code> instance (D-23 / implementation-waves §1.5):
// only one script injection ever happens, and every instance connecting before or after the chunk
// loads gets highlighted exactly once.
let prismState: "unloaded" | "loading" | "loaded" | "error" = "unloaded";
const pending: Element[] = [];

const highlightNow = (codeEl: Element): void => {
  window.mosniPrism?.highlight(codeEl);
};

const flushPending = (): void => {
  for (const codeEl of pending.splice(0)) highlightNow(codeEl);
};

/** Idempotent script injection (the bootstrap's proven pattern) — loads the lazy Prism chunk on
 *  first use only, never via `import()` (see implementation-waves.md §1.5 for why). */
const ensurePrismLoaded = (): void => {
  if (prismState === "loaded" || prismState === "loading") return;
  const existing = document.querySelector(`script[src="${PRISM_CHUNK_URL}"]`);
  if (existing) {
    // Another instance already injected the tag (or a naive re-include); just wait on it.
    prismState = "loading";
    existing.addEventListener("load", () => {
      prismState = "loaded";
      flushPending();
    });
    existing.addEventListener("error", () => {
      prismState = "error";
    });
    return;
  }
  prismState = "loading";
  const script = document.createElement("script");
  script.src = PRISM_CHUNK_URL;
  script.addEventListener("load", () => {
    prismState = "loaded";
    flushPending();
  });
  script.addEventListener("error", () => {
    // Never throw: the unhighlighted block is already correct output (colour is enhancement
    // only, guidelines §4.12). Leave any pending blocks as plain text.
    prismState = "error";
  });
  document.head.appendChild(script);
};

class MosniCode extends MosniElement {
  protected render(): void {
    // Read the raw authored text before rebuilding children (API §4.12: author writes inside
    // <pre> or with escaped `<`).
    const raw = this.textContent ?? "";
    const language = this.getAttribute("language") ?? "";
    const label = this.getAttribute("label") || language;
    const noCopy = this.hasAttribute("no-copy");
    const noHeader = this.hasAttribute("no-header");

    this.classList.add("code");
    this.textContent = "";

    if (!noHeader) {
      const header = document.createElement("div");
      header.className = "code-header";

      const langLabel = document.createElement("span");
      langLabel.className = "code-lang";
      langLabel.textContent = label;
      header.appendChild(langLabel);

      if (!noCopy) {
        const copyBtn = document.createElement("button");
        copyBtn.className = "code-copy";
        copyBtn.type = "button";
        copyBtn.setAttribute("aria-label", "Copy");
        copyBtn.appendChild(icon("copy", 16));
        copyBtn.addEventListener("click", () => this.copy(copyBtn));
        header.appendChild(copyBtn);
      }

      this.appendChild(header);
    }

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.className = `language-${language}`;
    code.textContent = raw;
    pre.appendChild(code);
    this.appendChild(pre);

    if (prismState === "loaded") {
      highlightNow(code);
    } else {
      pending.push(code);
      ensurePrismLoaded();
    }
  }

  private copy(button: HTMLButtonElement): void {
    const code = this.querySelector("code");
    if (!code) return;
    navigator.clipboard
      .writeText(code.textContent ?? "")
      .then(() => {
        button.replaceChildren(icon("check", 16));
        button.classList.add("code-copy-done");
        setTimeout(() => {
          button.replaceChildren(icon("copy", 16));
          button.classList.remove("code-copy-done");
        }, 1500);
      })
      .catch(() => {
        // Clipboard API can reject (no permission, non-HTTPS context, …) — leave the icon
        // unchanged, never throw.
      });
  }
}

define("mosni-code", MosniCode);
