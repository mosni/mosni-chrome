import { MosniElement, define } from "../base-element";

class MosniPanel extends MosniElement {
  protected render(): void {
    this.classList.add("panel");

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
