import { MosniElement, define, assetBase } from "../base-element";
import { icon } from "../icons";

declare global {
  interface Window {
    mosniPrism?: { highlight: (el: Element) => void };
  }
}

const PRISM_CHUNK_URL = `${assetBase}mosnicat-prism.js`;

let prismState: "unloaded" | "loading" | "loaded" | "error" = "unloaded";
const pending: Element[] = [];

const highlightNow = (codeEl: Element): void => {
  window.mosniPrism?.highlight(codeEl);
};

const flushPending = (): void => {
  for (const codeEl of pending.splice(0)) highlightNow(codeEl);
};

const ensurePrismLoaded = (): void => {
  if (prismState === "loaded" || prismState === "loading") return;
  const existing = document.querySelector(`script[src="${PRISM_CHUNK_URL}"]`);
  if (existing) {
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
    prismState = "error";
  });
  document.head.appendChild(script);
};

class MosniCode extends MosniElement {
  protected render(): void {
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
        /* clipboard can reject (no permission / insecure context) — leave the icon unchanged */
      });
  }
}

define("mosni-code", MosniCode);
