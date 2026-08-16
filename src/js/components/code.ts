import { MosniElement, define, assetBase } from "../base-element";
import { icon } from "../icons";
import { loadChunk } from "../shared/load-chunk";

declare global {
  interface Window {
    mosniPrism?: { highlight: (el: Element) => void };
  }
}

const PRISM_CHUNK_URL = `${assetBase}mosnicat-prism.js`;

let prismLoaded = false;
const pending: Element[] = [];

const highlightNow = (codeEl: Element): void => {
  window.mosniPrism?.highlight(codeEl);
};

const flushPending = (): void => {
  for (const codeEl of pending.splice(0)) highlightNow(codeEl);
};

const ensurePrismLoaded = (): void => {
  if (prismLoaded) return;
  loadChunk(PRISM_CHUNK_URL)
    .then(() => {
      prismLoaded = true;
      flushPending();
    })
    .catch(() => {
      /* the chunk failed to load - code stays unhighlighted, same as before this extraction */
    });
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

    if (prismLoaded) {
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
