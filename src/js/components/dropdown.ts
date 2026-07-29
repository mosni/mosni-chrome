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
  #scrollHandler: (() => void) | undefined;
  #triggerRectAtOpen: DOMRect | undefined;

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

  // The outside-click and scroll listeners both live on document/window, not this element - mirrors
  // mosni-tooltip's teardown (91d5784): without removing them here, every discarded dropdown that was
  // open at the time would leak a document/window listener forever.
  disconnectedCallback(): void {
    if (this.#outsideClickHandler) {
      document.removeEventListener("pointerdown", this.#outsideClickHandler);
      this.#outsideClickHandler = undefined;
    }
    if (this.#scrollHandler) {
      window.removeEventListener("scroll", this.#scrollHandler, {
        capture: true,
      });
      this.#scrollHandler = undefined;
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

  // position: fixed, computed from the trigger's own viewport rect, not the CSS default's
  // `position: absolute` (relative to this element). A dropdown inside ANY scrollable ancestor -
  // .table-scroll (E4.1 Wave E/D-79) is the case that surfaced this - clips an absolutely-positioned
  // descendant the moment that ancestor's overflow becomes non-visible on either axis (overflow-x:
  // auto forces the COMPUTED overflow-y to auto too, even if overflow-y: visible is written
  // explicitly - verified in Chromium, not just spec text). `position: fixed` escapes that: it's
  // positioned against the viewport, not the nearest scrollable box, so no ancestor's overflow can
  // clip it. Recomputed on every open (the trigger may have moved since the menu last closed).
  #positionMenu(): void {
    const menu = this.#menu;
    const trigger = this.#trigger;
    if (!menu || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
    // A trigger near the bottom of the viewport (a table's last rows, say) can leave no room to
    // open downward - position: fixed means there is no scrolling it into view the way a normal-
    // flow element would be, so a menu that doesn't fit below the trigger opens ABOVE it instead.
    // Found the same way the clipping bug was: re-running this session's own visual-check.mjs after
    // the previous fix - "Delete" (the last item) was simply unreachable, off the bottom of the
    // viewport, on a row nowhere near the actual end of the page.
    const fitsBelow = rect.bottom + 6 + menuHeight <= window.innerHeight;
    const top = fitsBelow
      ? rect.bottom + 6
      : Math.max(8, rect.top - menuHeight - 6);
    menu.style.position = "fixed";
    menu.style.top = `${top}px`;
    menu.style.left = `${Math.max(8, left)}px`;
  }

  #open(): void {
    const menu = this.#menu;
    const trigger = this.#trigger;
    if (!menu || !trigger || this.#isOpen()) return;

    menu.hidden = false;
    this.#positionMenu();
    trigger.setAttribute("aria-expanded", "true");
    this.#triggerRectAtOpen = trigger.getBoundingClientRect();

    // preventScroll: true - #positionMenu() already placed the menu fully within the viewport, so
    // focus() has nothing legitimate to scroll for. It does NOT fully stop a touch/mobile browser's
    // own scroll-into-view pass on focus though (measured directly: Playwright's iPhone 13 emulation
    // still fires two real scroll events ~80ms after open, preventScroll notwithstanding) - #onScroll
    // below is what actually handles that, not this option. Kept anyway since it's free and correct.
    this.#items()
      .find((button) => !button.disabled)
      ?.focus({ preventScroll: true });

    // Deferred a tick so the same click that opened the menu (still bubbling toward document)
    // doesn't immediately dismiss it via the outside-click listener.
    window.setTimeout(() => {
      if (!this.#isOpen()) return;
      this.#outsideClickHandler = (event: PointerEvent) => {
        const target = event.target;
        if (target instanceof Node && this.contains(target)) return;
        this.#close();
      };
      document.addEventListener("pointerdown", this.#outsideClickHandler);

      // position: fixed no longer moves with the trigger when an ancestor (e.g. .table-scroll, or
      // the page itself) scrolls, so this exists to close the menu rather than leave it visually
      // detached. NOT deferred against a self-inflicted scroll by timing (a scroll event firing is
      // not proof anything actually moved - see #onScroll). Capture: true so this fires for a scroll
      // on ANY scrollable ancestor, not just window.
      this.#scrollHandler = () => this.#onScroll();
      window.addEventListener("scroll", this.#scrollHandler, {
        capture: true,
        passive: true,
      });
    }, 0);
  }

  // A scroll EVENT firing is not proof the trigger actually moved. focus({preventScroll: true}) in
  // #open() still doesn't stop a touch/mobile browser's own scroll-into-view pass in practice
  // (measured: Playwright's iPhone 13 emulation fires real scroll events ~80ms after open even with
  // preventScroll set) - long enough to race past any "defer the listener a tick" guard under real
  // load, closing a menu that never actually needed to move. Comparing the trigger's CURRENT position
  // to its position at open time sidesteps the race entirely: only a scroll that measurably moved the
  // trigger is a reason to close, regardless of why the event fired or when the listener attached.
  #onScroll(): void {
    const trigger = this.#trigger;
    const baseline = this.#triggerRectAtOpen;
    if (!trigger || !baseline) {
      this.#close();
      return;
    }
    const rect = trigger.getBoundingClientRect();
    if (
      Math.abs(rect.top - baseline.top) < 2 &&
      Math.abs(rect.left - baseline.left) < 2
    )
      return;
    this.#close();
  }

  #close(): void {
    const menu = this.#menu;
    const trigger = this.#trigger;
    if (!menu || !this.#isOpen()) return;

    menu.hidden = true;
    menu.style.position = "";
    menu.style.top = "";
    menu.style.left = "";
    trigger?.setAttribute("aria-expanded", "false");
    if (this.#outsideClickHandler) {
      document.removeEventListener("pointerdown", this.#outsideClickHandler);
      this.#outsideClickHandler = undefined;
    }
    if (this.#scrollHandler) {
      window.removeEventListener("scroll", this.#scrollHandler, {
        capture: true,
      });
      this.#scrollHandler = undefined;
    }
    this.#triggerRectAtOpen = undefined;
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
