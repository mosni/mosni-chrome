import { MosniElement, define, assetBase } from "../base-element";
import { loadChunk } from "../shared/load-chunk";

declare global {
  interface Window {
    mosniIcons?: { create: (name: string, size: number) => SVGElement | null };
  }
}

const ICON_CHUNK_URL = `${assetBase}mosnicat-icons.js`;

let iconsLoaded = false;
const pending: (() => void)[] = [];

const flushPending = (): void => {
  for (const paint of pending.splice(0)) paint();
};

const ensureLoaded = (): void => {
  if (iconsLoaded) return;
  loadChunk(ICON_CHUNK_URL)
    .then(() => {
      iconsLoaded = true;
      flushPending();
    })
    .catch(() => {
      /* the chunk failed to load - icons stay unpainted, same as before this extraction */
    });
};

class MosniIcon extends MosniElement {
  protected render(): void {
    const name = this.getAttribute("name") ?? "";
    const size = Number(this.getAttribute("size")) || 20;
    const paint = () => {
      const svg = window.mosniIcons?.create(name, size);
      if (svg) this.replaceChildren(svg);
    };

    if (iconsLoaded) {
      paint();
    } else {
      pending.push(paint);
      ensureLoaded();
    }
  }
}

define("mosni-icon", MosniIcon);
