import { MosniElement, define, assetBase } from "../base-element";

declare global {
  interface Window {
    mosniIcons?: { create: (name: string, size: number) => SVGElement | null };
  }
}

const ICON_CHUNK_URL = `${assetBase}mosnicat-icons.js`;

let iconState: "unloaded" | "loading" | "loaded" | "error" = "unloaded";
const pending: (() => void)[] = [];

const flushPending = (): void => {
  for (const paint of pending.splice(0)) paint();
};

const ensureLoaded = (): void => {
  if (iconState === "loaded" || iconState === "loading") return;
  const existing = document.querySelector(`script[src="${ICON_CHUNK_URL}"]`);
  const wire = (script: Element): void => {
    iconState = "loading";
    script.addEventListener("load", () => {
      iconState = "loaded";
      flushPending();
    });
    script.addEventListener("error", () => {
      iconState = "error";
    });
  };

  if (existing) {
    wire(existing);
    return;
  }

  const script = document.createElement("script");
  script.src = ICON_CHUNK_URL;
  wire(script);
  document.head.appendChild(script);
};

class MosniIcon extends MosniElement {
  protected render(): void {
    const name = this.getAttribute("name") ?? "";
    const size = Number(this.getAttribute("size")) || 20;
    const paint = () => {
      const svg = window.mosniIcons?.create(name, size);
      if (svg) this.replaceChildren(svg);
    };

    if (iconState === "loaded") {
      paint();
    } else {
      pending.push(paint);
      ensureLoaded();
    }
  }
}

define("mosni-icon", MosniIcon);
