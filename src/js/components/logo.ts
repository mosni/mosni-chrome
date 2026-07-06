import { MosniElement, define, assetBase } from "../base-element";

// The mosni mark. The SVG (served next to the bundle on ui.mosni.dev) keeps its own aspect ratio
// and fills whatever box the element is given, so sizing is purely a matter of CSS height/font-size
// on the host — see _logo.scss. Ships inside <mosni-header> by default.
class MosniLogo extends MosniElement {
  protected render(): void {
    this.classList.add("mosni-logo");
    const img = document.createElement("img");
    img.src = `${assetBase}mosni.svg`;
    img.alt = this.getAttribute("alt") ?? "mosni";
    this.replaceChildren(img);
  }
}

define("mosni-logo", MosniLogo);
