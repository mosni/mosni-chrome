import { MosniElement, define } from "../base-element";

class MosniPanel extends MosniElement {
  protected render(): void {
    this.classList.add("panel");

    const size = this.getAttribute("size");
    if (size === "small") this.classList.add("panel-small");
    else if (size === "full") this.classList.add("panel-full");

    const hasHeadingChild = Array.from(this.children).some(
      (child) =>
        child.tagName === "H1" || child.getAttribute("slot") === "heading",
    );

    const heading = this.getAttribute("heading");
    if (!hasHeadingChild && heading) {
      const h1 = document.createElement("h1");
      h1.textContent = heading;
      this.prepend(h1);
    }
  }
}

define("mosni-panel", MosniPanel);
