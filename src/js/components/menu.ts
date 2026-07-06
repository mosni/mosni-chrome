import { MosniElement, define } from "../base-element";

class MosniMenu extends MosniElement {
  protected render(): void {
    this.classList.add("menu");
    this.setAttribute("role", "navigation");

    const label = this.getAttribute("label");
    if (label) this.setAttribute("aria-label", label);
  }
}

class MosniMenuItem extends MosniElement {
  static observedAttributes = ["selected"];

  private entry: HTMLElement | null = null;

  get selected(): boolean {
    return this.hasAttribute("selected");
  }
  set selected(value: boolean) {
    this.toggleAttribute("selected", value);
  }

  protected render(): void {
    const title = this.getAttribute("title") ?? "";
    const subtitle = this.getAttribute("subtitle");
    const href = this.getAttribute("href");

    const entry = document.createElement(href ? "a" : "div");
    entry.className = "menu-entry";
    if (href) (entry as HTMLAnchorElement).href = href;

    const titleSpan = document.createElement("span");
    titleSpan.className = "menu-entry-title";
    titleSpan.textContent = title;
    entry.append(titleSpan);

    if (subtitle !== null) {
      const subtitleSpan = document.createElement("span");
      subtitleSpan.className = "menu-entry-subtitle";
      subtitleSpan.textContent = subtitle;
      entry.append(subtitleSpan);
    }

    this.entry = entry;
    this.append(entry);
    this.applySelected();
  }

  attributeChangedCallback(): void {
    this.applySelected();
  }

  private applySelected(): void {
    if (!this.entry) return;
    this.entry.classList.toggle("selected", this.selected);
    if (this.selected) {
      this.entry.setAttribute("aria-current", "page");
    } else {
      this.entry.removeAttribute("aria-current");
    }
  }
}

define("mosni-menu", MosniMenu);
define("mosni-menu-item", MosniMenuItem);
