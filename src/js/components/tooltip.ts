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
