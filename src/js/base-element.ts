export const define = (tag: string, cls: CustomElementConstructor): void => {
  if (!customElements.get(tag)) customElements.define(tag, cls);
};

// document.currentScript is only valid during initial classic-script evaluation, so this must
// stay a top-level module constant — reading it later returns null.
export const assetBase: string = (() => {
  const src = (document.currentScript as HTMLScriptElement | null)?.src;
  return src ? new URL(".", src).href : "https://mosni.dev/";
})();

export const takeSlot = (host: HTMLElement, name: string): Element[] => {
  const out: Element[] = [];
  for (const child of Array.from(host.children)) {
    if (child.getAttribute("slot") === name) {
      child.remove();
      out.push(child);
    }
  }
  return out;
};

export const takeDefault = (host: HTMLElement): Node[] => {
  const out = Array.from(host.childNodes);
  for (const node of out) node.remove();
  return out;
};

export abstract class MosniElement extends HTMLElement {
  protected rendered = false;
  connectedCallback(): void {
    if (this.rendered) return;
    this.rendered = true;
    this.render();
  }
  protected abstract render(): void;
}
