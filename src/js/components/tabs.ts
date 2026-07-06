import { MosniElement, define } from "../base-element";

class MosniTab extends MosniElement {
  static get observedAttributes(): string[] {
    return ["selected"];
  }

  get label(): string {
    return this.getAttribute("label") ?? "";
  }

  get selected(): boolean {
    return this.hasAttribute("selected");
  }

  set selected(value: boolean) {
    this.toggleAttribute("selected", value);
  }

  protected render(): void {}
}

class MosniTabs extends MosniElement {
  private buttons: HTMLButtonElement[] = [];
  private panels: HTMLDivElement[] = [];

  protected render(): void {
    const tabs = Array.from(this.children).filter(
      (child): child is MosniTab => child.tagName === "MOSNI-TAB",
    );
    if (tabs.length === 0) return;

    let selectedIndex = tabs.findIndex((tab) => tab.hasAttribute("selected"));
    if (selectedIndex === -1) selectedIndex = 0;

    const root = document.createElement("div");
    root.className = "tabs";

    const bar = document.createElement("div");
    bar.className = "tabs-bar";
    bar.setAttribute("role", "tablist");

    const buttons: HTMLButtonElement[] = [];
    const panels: HTMLDivElement[] = [];

    tabs.forEach((tab, index) => {
      const isSelected = index === selectedIndex;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "tab";
      button.setAttribute("role", "tab");
      button.id = `tab-${index}`;
      button.setAttribute("aria-controls", `panel-${index}`);
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
      button.textContent = tab.getAttribute("label") ?? "";
      button.addEventListener("click", () => this.select(index));
      bar.appendChild(button);
      buttons.push(button);

      const panel = document.createElement("div");
      panel.className = "tabs-panel";
      panel.setAttribute("role", "tabpanel");
      panel.id = `panel-${index}`;
      panel.setAttribute("aria-labelledby", `tab-${index}`);
      if (!isSelected) panel.hidden = true;
      while (tab.firstChild) panel.appendChild(tab.firstChild);
      panels.push(panel);

      tab.style.display = "contents";
      tab.toggleAttribute("selected", isSelected);
    });

    bar.addEventListener("keydown", (event) => this.onKeydown(event));

    root.appendChild(bar);
    for (const panel of panels) root.appendChild(panel);
    this.appendChild(root);

    this.buttons = buttons;
    this.panels = panels;
  }

  get selectedIndex(): number {
    return this.buttons.findIndex(
      (button) => button.getAttribute("aria-selected") === "true",
    );
  }

  set selectedIndex(index: number) {
    this.select(index);
  }

  private select(index: number): void {
    if (index < 0 || index >= this.buttons.length) return;
    if (this.buttons[index]?.getAttribute("aria-selected") === "true") return;

    this.buttons.forEach((button, i) => {
      const isSelected = i === index;
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    });
    this.panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });

    const label = this.buttons[index]?.textContent ?? "";
    this.dispatchEvent(
      new CustomEvent("mosni-tab-change", {
        bubbles: true,
        detail: { index, label },
      }),
    );
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const count = this.buttons.length;
    if (count === 0) return;
    const current = this.buttons.findIndex((b) => b === document.activeElement);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = ((current === -1 ? 0 : current) + delta + count) % count;
    event.preventDefault();
    this.buttons[next]?.focus();
  }
}

define("mosni-tab", MosniTab);
define("mosni-tabs", MosniTabs);
