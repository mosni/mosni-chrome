import { MosniElement, define } from "../base-element";

// Enhance role, M1 on `.panel` (API §4.4 / guidelines §4.4, §3.4).
class MosniPanel extends MosniElement {
  protected render(): void {
    this.classList.add("panel");

    // Enhance-first: an authored heading (h1, or a slot="heading" child) always wins over the
    // `heading` attribute — no duplicate heading is ever injected.
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
