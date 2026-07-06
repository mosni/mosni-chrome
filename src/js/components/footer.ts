import { MosniElement, define, takeSlot, takeDefault } from "../base-element";

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
