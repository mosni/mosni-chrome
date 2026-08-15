import { MosniElement, define } from "../base-element";

// Generic ordered-discrete-choice slider — knows about STOPS, not what they mean. A consumer (e.g.
// files' invite-duration control) supplies the stop labels via `stops` and reads the selected index
// back off `value`; this element never interprets either.

let idCounter = 0;
const nextId = (): string => `mosni-slider-${++idCounter}`;

class MosniSlider extends MosniElement {
  static get observedAttributes(): string[] {
    return ["value", "stops", "label"];
  }

  #input: HTMLInputElement | null = null;
  #readout: HTMLElement | null = null;
  #stops: string[] = [];

  protected render(): void {
    this.#stops = this.#parseStops();
    const labelText = this.getAttribute("label");
    const index = this.#clampIndex(this.getAttribute("value"));

    this.textContent = "";
    this.classList.add("slider");

    const id = nextId();

    if (labelText) {
      const labelEl = document.createElement("label");
      labelEl.className = "slider-label";
      labelEl.setAttribute("for", id);
      labelEl.textContent = labelText;
      this.append(labelEl);
    }

    const trackWrap = document.createElement("div");
    trackWrap.className = "slider-track-wrap";

    const input = document.createElement("input");
    input.type = "range";
    input.className = "slider-input";
    input.id = id;
    input.min = "0";
    input.max = String(Math.max(this.#stops.length - 1, 0));
    input.step = "1";
    input.value = String(index);
    if (labelText) input.setAttribute("aria-label", labelText);

    const ticks = document.createElement("div");
    ticks.className = "slider-ticks";
    ticks.setAttribute("aria-hidden", "true");
    for (let i = 0; i < this.#stops.length; i++) {
      const tick = document.createElement("span");
      tick.className = "slider-tick";
      ticks.append(tick);
    }

    const ends = document.createElement("div");
    ends.className = "slider-ends";
    ends.setAttribute("aria-hidden", "true");
    const startEnd = document.createElement("span");
    startEnd.className = "slider-end slider-end-start";
    startEnd.textContent = this.#stops[0] ?? "";
    const endEnd = document.createElement("span");
    endEnd.className = "slider-end slider-end-end";
    endEnd.textContent = this.#stops[this.#stops.length - 1] ?? "";
    ends.append(startEnd, endEnd);

    trackWrap.append(input, ticks, ends);

    const readout = document.createElement("div");
    readout.className = "slider-readout";
    readout.setAttribute("aria-hidden", "true");

    this.append(trackWrap, readout);

    this.#input = input;
    this.#readout = readout;
    this.#syncReadout(index);

    // Live feedback while dragging.
    input.addEventListener("input", () => {
      this.#syncReadout(Number(input.value));
    });

    // Reflect the selected index onto SELF before this same event continues bubbling past the
    // host — a listener on `input` runs during the target phase, ahead of any ancestor listener,
    // so by the time `change` reaches a consumer the `value` attribute already holds the new
    // index. No custom event: this mirrors mosni-switch exactly.
    input.addEventListener("change", () => {
      this.setAttribute("value", input.value);
    });
  }

  attributeChangedCallback(name: string): void {
    if (!this.rendered || !this.#input) return;
    if (name === "value") {
      const index = this.#clampIndex(this.getAttribute("value"));
      if (this.#input.value !== String(index))
        this.#input.value = String(index);
      this.#syncReadout(index);
    } else if (name === "stops" || name === "label") {
      this.render();
    }
  }

  #parseStops(): string[] {
    const raw = this.getAttribute("stops") ?? "";
    return raw.length > 0 ? raw.split("|") : [];
  }

  #clampIndex(raw: string | null): number {
    const max = Math.max(this.#stops.length - 1, 0);
    const n = raw === null ? NaN : Number(raw);
    if (!Number.isInteger(n) || n < 0) return 0;
    return Math.min(n, max);
  }

  #syncReadout(index: number): void {
    const label = this.#stops[index] ?? "";
    if (this.#readout) this.#readout.textContent = label;
    if (this.#input) this.#input.setAttribute("aria-valuetext", label);
  }

  get value(): number {
    return this.#clampIndex(this.getAttribute("value"));
  }
  set value(index: number) {
    this.setAttribute("value", String(index));
  }
}

define("mosni-slider", MosniSlider);
