import { MosniElement, define } from "../base-element";
import { icon } from "../icons";

let exclusiveGroupCounter = 0;

class MosniAccordion extends MosniElement {
  protected render(): void {
    const exclusive = this.hasAttribute("exclusive");
    const groupName = exclusive
      ? `mosni-accordion-${++exclusiveGroupCounter}`
      : null;

    const items = Array.from(this.children).filter(
      (child): child is HTMLDetailsElement => child.tagName === "DETAILS",
    );
    for (const details of items) {
      const summary = details.querySelector("summary");
      if (summary) {
        const chevron = document.createElement("span");
        chevron.className = "accordion-chevron";
        chevron.appendChild(icon("chevron-down", 16));
        summary.appendChild(chevron);
      }
      if (groupName) {
        // Native mutual-exclusion via the HTML `name` attribute on <details> (API §4.13) — a
        // relatively new but standard browser feature.
        details.name = groupName;
      }
    }
  }
}

define("mosni-accordion", MosniAccordion);
