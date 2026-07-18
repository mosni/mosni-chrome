import { MosniElement, define, takeSlot } from "../base-element";

const SHOW_DELAY_MS = 0;
const EDGE_OFFSET_PX = 6;

let nextId = 0;

class MosniTooltip extends MosniElement {
  static observedAttributes = ["text"];

  #tip: HTMLDivElement | undefined;
  #anchor: Element | null = null;
  #usingTipSlot = false;
  #showTimer: number | undefined;
  #outsideTapHandler: ((event: PointerEvent) => void) | undefined;

  protected render(): void {
    const tipSlot = takeSlot(this, "tip");

    const tip = document.createElement("div");
    tip.className = "tooltip";
    tip.setAttribute("role", "tooltip");
    tip.id = `mosni-tooltip-${++nextId}`;
    tip.hidden = true;

    if (tipSlot.length > 0) {
      this.#usingTipSlot = true;
      tip.append(...tipSlot);
    } else {
      tip.textContent = this.getAttribute("text") ?? "";
    }

    document.body.appendChild(tip);
    this.#tip = tip;

    const anchor = this.querySelector(":scope > *");
    this.#anchor = anchor;
    if (anchor) {
      anchor.setAttribute("aria-describedby", tip.id);
      anchor.addEventListener("mouseenter", () => this.#scheduleShow());
      anchor.addEventListener("mouseleave", () => this.#hide());
      anchor.addEventListener("focus", () => this.#scheduleShow());
      anchor.addEventListener("blur", () => this.#hide());
      // Touch has no hover state to show/hide from, so a tap toggles the tip directly instead of
      // scheduling a hover-show. Gated on pointerType so this never fires for a mouse click (which
      // already gets its tip from hover) or a keyboard activation (which already gets it from focus).
      anchor.addEventListener("pointerup", (event) => {
        if (!(event instanceof PointerEvent) || event.pointerType !== "touch") return;
        this.#toggleTouch();
      });
    }

    // Tapping anywhere outside the anchor/tip dismisses it - there is no mouseleave-equivalent on
    // touch, so without this an open tip could only ever be closed by tapping the anchor again.
    // Kept in a field so disconnectedCallback can unregister it: this is a document-level listener
    // owned by a per-instance element, so without removal every discarded tooltip leaves one behind.
    this.#outsideTapHandler = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !this.#tip || this.#tip.hidden) return;
      const target = event.target;
      if (target instanceof Node && (this.#anchor?.contains(target) || this.#tip.contains(target))) return;
      this.#hide();
    };
    document.addEventListener("pointerdown", this.#outsideTapHandler);
  }

  // The tip lives on document.body, not inside this element, and the dismiss listener lives on
  // document - so neither is collected when the host element is discarded. A consumer that replaces a
  // subtree containing tooltips (auth's /admin swaps its whole links table on every filter toggle and
  // after every generate) would otherwise accumulate one orphaned tip div and one document listener
  // per tooltip per swap, unbounded, for the life of the page.
  disconnectedCallback(): void {
    // Relocating an element fires disconnect then connect, so the teardown is deferred one task and
    // skipped if the element came back - otherwise merely moving a tooltip would destroy its tip.
    window.setTimeout(() => {
      if (this.isConnected) return;
      if (this.#showTimer !== undefined) {
        window.clearTimeout(this.#showTimer);
        this.#showTimer = undefined;
      }
      if (this.#outsideTapHandler) {
        document.removeEventListener("pointerdown", this.#outsideTapHandler);
        this.#outsideTapHandler = undefined;
      }
      this.#tip?.remove();
      this.#tip = undefined;
      this.#anchor = null;
    }, 0);
  }

  #toggleTouch(): void {
    if (!this.#tip) return;
    if (this.#tip.hidden) {
      this.#show();
    } else {
      this.#hide();
    }
  }

  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name !== "text" || !this.#tip || this.#usingTipSlot) return;
    this.#tip.textContent = newValue ?? "";
  }

  get text(): string {
    return this.getAttribute("text") ?? "";
  }
  set text(value: string) {
    this.setAttribute("text", value);
  }

  #scheduleShow(): void {
    if (this.#showTimer !== undefined) return;
    this.#showTimer = window.setTimeout(() => {
      this.#showTimer = undefined;
      this.#show();
    }, SHOW_DELAY_MS);
  }

  #hide(): void {
    if (this.#showTimer !== undefined) {
      window.clearTimeout(this.#showTimer);
      this.#showTimer = undefined;
    }
    if (this.#tip) this.#tip.hidden = true;
  }

  #show(): void {
    const tip = this.#tip;
    const anchor = this.#anchor;
    if (!tip || !anchor) return;

    tip.hidden = false;
    const anchorRect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();

    let top = anchorRect.top - tipRect.height - EDGE_OFFSET_PX;
    if (top < EDGE_OFFSET_PX) {
      top = anchorRect.bottom + EDGE_OFFSET_PX;
    }

    let left = anchorRect.left + (anchorRect.width - tipRect.width) / 2;
    const maxLeft = window.innerWidth - tipRect.width - EDGE_OFFSET_PX;
    left = Math.min(
      Math.max(left, EDGE_OFFSET_PX),
      Math.max(EDGE_OFFSET_PX, maxLeft),
    );

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }
}

define("mosni-tooltip", MosniTooltip);
