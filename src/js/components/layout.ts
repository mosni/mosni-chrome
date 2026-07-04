import { MosniElement, define, takeSlot, takeDefault } from "../base-element";

// Enhance role, M2 shell — the element itself is the grid (API §4.2 / guidelines §4.2, the
// 0001-g fix).
class MosniLayout extends MosniElement {
  protected render(): void {
    const header = takeSlot(this, "header");
    const menu = takeSlot(this, "menu");
    const footer = takeSlot(this, "footer");
    const main = takeDefault(this);

    this.classList.add("layout");

    this.append(...header);

    const menuDiv = document.createElement("div");
    menuDiv.className = "layout-menu";
    menuDiv.append(...menu);
    this.append(menuDiv);

    const mainEl = document.createElement("main");
    mainEl.className = "layout-main";
    mainEl.append(...main, ...footer);
    this.append(mainEl);
  }
}

define("mosni-layout", MosniLayout);
