// Shared component base (0002). No framework (D-2); light DOM only (D-16).

/** Idempotent registration (D-2a): a second include or double import is a no-op. */
export const define = (tag: string, cls: CustomElementConstructor): void => {
  if (!customElements.get(tag)) customElements.define(tag, cls);
};

/** Directory URL mosnicat.js was served from — base for lazy chunks (Prism).
 *  document.currentScript is only valid during initial classic-script evaluation,
 *  so this must stay a top-level module constant. */
export const assetBase: string = (() => {
  const src = (document.currentScript as HTMLScriptElement | null)?.src;
  return src ? new URL(".", src).href : "https://mosni.dev/";
})();

/** Light-DOM slot convention (API §1.3): remove and return the direct children
 *  marked slot="<name>". */
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

/** Remove and return all remaining child nodes (the default region).
 *  Call AFTER every takeSlot() so named regions are already extracted. */
export const takeDefault = (host: HTMLElement): Node[] => {
  const out = Array.from(host.childNodes);
  for (const node of out) node.remove();
  return out;
};

/** Render-once base (A3): builds exactly once on first connect; disconnect/
 *  reconnect (moved node) never double-builds. */
export abstract class MosniElement extends HTMLElement {
  protected rendered = false;
  connectedCallback(): void {
    if (this.rendered) return;
    this.rendered = true;
    this.render();
  }
  protected abstract render(): void;
}
