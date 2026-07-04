import { MosniElement, define, takeSlot, takeDefault } from "../base-element";

// Enhance role, M1 on `.footer` (API §4.5 / guidelines §4.5).
class MosniFooter extends MosniElement {
  protected render(): void {
    const links = takeSlot(this, "links");
    const left = takeDefault(this);

    this.classList.add("footer");

    const leftDiv = document.createElement("div");
    leftDiv.className = "footer-left";
    leftDiv.append(...left);
    this.append(leftDiv);

    const linksDiv = document.createElement("div");
    linksDiv.className = "footer-links";
    linksDiv.append(...links);
    this.append(linksDiv);
  }
}

define("mosni-footer", MosniFooter);
