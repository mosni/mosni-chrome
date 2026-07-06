import { MosniElement, define, takeSlot, takeDefault } from "../base-element";
import { icon } from "../icons";

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

    const burger = document.createElement("button");
    burger.type = "button";
    burger.className = "layout-burger";
    burger.setAttribute("aria-label", "Toggle menu");
    burger.setAttribute("aria-expanded", "false");
    burger.appendChild(icon("menu", 20));
    burger.addEventListener("click", () => {
      const open = this.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    this.append(burger);

    // Close the mobile overlay once a nav item is actually picked, instead of leaving it open
    // over the section the user just navigated to.
    menuDiv.addEventListener("click", (event) => {
      if (!(event.target as HTMLElement).closest(".menu-entry")) return;
      this.classList.remove("menu-open");
      burger.setAttribute("aria-expanded", "false");
    });
  }
}

define("mosni-layout", MosniLayout);
