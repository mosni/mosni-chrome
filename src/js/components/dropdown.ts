import { MosniElement, define } from "../base-element";
import { icon } from "../icons";

let nextId = 0;

// The overflow-menu primitive (a popover of actions behind a trigger button) - NOT to be confused
// with <mosni-menu>, which is the site nav (title/subtitle/href/selected rows), not a popover.
//
// Each item independently builds its own `<button role="menuitem">` from its authored content, the
// same way <mosni-menu-item> builds its own row - so <mosni-dropdown> never depends on its items
// having already rendered (upgrade order between a custom element and its children is not
// guaranteed), and <mosni-dropdown> only ever talks to items through the DOM (delegated click,
// attribute reads), the same idiom mosni-layout's menu already uses for its burger nav.
class MosniDropdownItem extends MosniElement {
  static observedAttributes = ["variant", "disabled"];

  #button: HTMLButtonElement | undefined;

  protected render(): void {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dropdown-item";
    button.setAttribute("role", "menuitem");
    button.tabIndex = -1;
    while (this.firstChild) button.append(this.firstChild);

    this.#button = button;
    this.append(button);
    this.#applyVariant();
    this.#applyDisabled();
  }

  attributeChangedCallback(name: string): void {
    if (!this.rendered) return;
    if (name === "variant") this.#applyVariant();
    else if (name === "disabled") this.#applyDisabled();
  }

  #applyVariant(): void {
    if (!this.#button) return;
    this.#button.className = "dropdown-item";
    const variant = this.getAttribute("variant");
    if (variant) this.#button.classList.add(`dropdown-item-${variant}`);
  }

  #applyDisabled(): void {
    if (!this.#button) return;
    this.#button.disabled = this.hasAttribute("disabled");
  }

  get value(): string {
    return this.getAttribute("value") ?? "";
  }
  set value(value: string) {
    this.setAttribute("value", value);
  }

  get variant(): string {
    return this.getAttribute("variant") ?? "";
  }
  set variant(value: string) {
    this.setAttribute("variant", value);
  }

  get disabled(): boolean {
    return this.hasAttribute("disabled");
  }
  set disabled(value: boolean) {
    this.toggleAttribute("disabled", value);
  }
}

class MosniDropdown extends MosniElement {
  #trigger: HTMLButtonElement | undefined;
  #menu: HTMLDivElement | undefined;
  #outsideClickHandler: ((event: PointerEvent) => void) | undefined;

  protected render(): void {
    this.classList.add("dropdown");

    const items = Array.from(this.children).filter(
      (child): child is MosniDropdownItem =>
        child.tagName === "MOSNI-DROPDOWN-ITEM",
    );

    const id = `mosni-dropdown-${++nextId}`;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "dropdown-trigger";
    trigger.id = `${id}-trigger`;
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", id);
    trigger.append(document.createTextNode(this.getAttribute("label") ?? ""));
    trigger.appendChild(icon("chevron-down", 16));
    trigger.addEventListener("click", () => this.#toggle());

    const menu = document.createElement("div");
    menu.className = "dropdown-menu";
    menu.id = id;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-labelledby", trigger.id);
    menu.hidden = true;
    menu.append(...items);

    menu.addEventListener("keydown", (event) => this.#onMenuKeydown(event));
    menu.addEventListener("click", (event) => this.#onMenuClick(event));

    this.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !this.#isOpen()) return;
      event.stopPropagation();
      this.#close();
    });

    this.append(trigger, menu);
    this.#trigger = trigger;
    this.#menu = menu;
  }

  // Only the outside-click listener lives on document - mirrors mosni-tooltip's teardown (91d5784):
  // without removing it here, every discarded dropdown would leak one document listener forever.
  disconnectedCallback(): void {
    if (this.#outsideClickHandler) {
      document.removeEventListener("pointerdown", this.#outsideClickHandler);
      this.#outsideClickHandler = undefined;
    }
  }

  #items(): HTMLButtonElement[] {
    return Array.from(
      this.querySelectorAll<HTMLButtonElement>(".dropdown-item"),
    );
  }

  #isOpen(): boolean {
    return !!this.#menu && !this.#menu.hidden;
  }

  #toggle(): void {
    if (this.#isOpen()) this.#close();
    else this.#open();
  }

  #open(): void {
    const menu = this.#menu;
    const trigger = this.#trigger;
    if (!menu || !trigger || this.#isOpen()) return;

    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");

    // Deferred a tick so the same click that opened the menu (which is still bubbling toward
    // document) doesn't immediately dismiss it.
    window.setTimeout(() => {
      if (!this.#isOpen()) return;
      this.#outsideClickHandler = (event: PointerEvent) => {
        const target = event.target;
        if (target instanceof Node && this.contains(target)) return;
        this.#close();
      };
      document.addEventListener("pointerdown", this.#outsideClickHandler);
    }, 0);

    this.#items()
      .find((button) => !button.disabled)
      ?.focus();
  }

  #close(): void {
    const menu = this.#menu;
    const trigger = this.#trigger;
    if (!menu || !this.#isOpen()) return;

    menu.hidden = true;
    trigger?.setAttribute("aria-expanded", "false");
    if (this.#outsideClickHandler) {
      document.removeEventListener("pointerdown", this.#outsideClickHandler);
      this.#outsideClickHandler = undefined;
    }
    trigger?.focus();
  }

  #onMenuClick(event: MouseEvent): void {
    const button = (event.target as HTMLElement).closest(
      ".dropdown-item",
    ) as HTMLButtonElement | null;
    if (!button || button.disabled) return;
    const item = button.closest("mosni-dropdown-item");
    this.#select(item?.getAttribute("value") ?? "");
  }

  #onMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = this.#items().filter((button) => !button.disabled);
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next =
      ((current === -1 ? 0 : current) + delta + items.length) % items.length;
    items[next]?.focus();
  }

  #select(value: string): void {
    this.dispatchEvent(
      new CustomEvent("mosni-dropdown-select", {
        bubbles: true,
        detail: { value },
      }),
    );
    this.#close();
  }

  get label(): string {
    return this.getAttribute("label") ?? "";
  }
  set label(value: string) {
    this.setAttribute("label", value);
  }
}

define("mosni-dropdown-item", MosniDropdownItem);
define("mosni-dropdown", MosniDropdown);
