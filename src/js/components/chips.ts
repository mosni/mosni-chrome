import { MosniElement, define } from "../base-element";

// A filterable multi-select built by PROGRESSIVE ENHANCEMENT over authored checkboxes.
//
// The authored `<input type="checkbox">` children stay in the DOM and remain the single source of
// truth - this element only filters what is visible and adds a chip summary of what is selected.
// Consequences that matter:
//   - with no JS the consumer still sees a plain, usable checkbox list that submits natively, which
//     is what security-critical forms need (auth's D-53 rule);
//   - any existing code that reads those checkboxes (`querySelectorAll("[data-x]").checked`) keeps
//     working untouched, so adopting this element is a markup-only change.
//
// Attributes: `label`, `placeholder`, `filter-threshold` (hide the filter box below N options,
// default 8), `max-height` (scroll container, default 13rem).
class MosniChips extends MosniElement {
  #boxes: HTMLInputElement[] = [];
  #chips: HTMLElement | null = null;

  protected render(): void {
    this.#boxes = Array.from(
      this.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];

    // Nothing to enhance - leave the authored markup exactly as it is.
    if (this.#boxes.length === 0) return;

    const label = this.getAttribute("label");
    const placeholder = this.getAttribute("placeholder") ?? "Filter…";
    const threshold = Number(this.getAttribute("filter-threshold") ?? "8");
    const maxHeight = this.getAttribute("max-height") ?? "13rem";

    // Each checkbox's own label element is the row we show/hide when filtering.
    const rows = this.#boxes.map(
      (box) => box.closest("label") ?? box.parentElement ?? box,
    );

    const wrap = document.createElement("div");
    wrap.className = "chips";

    if (label) {
      const cap = document.createElement("span");
      cap.className = "chips-label";
      cap.textContent = label;
      wrap.append(cap);
    }

    const chips = document.createElement("div");
    chips.className = "chips-selected";
    this.#chips = chips;
    wrap.append(chips);

    let filter: HTMLInputElement | null = null;
    if (this.#boxes.length >= threshold) {
      filter = document.createElement("input");
      filter.type = "text";
      filter.className = "chips-filter";
      filter.placeholder = placeholder;
      // `search` fires on the native clear button too; `input` alone would miss it.
      for (const evt of ["input", "search"]) {
        filter.addEventListener(evt, () => {
          const q = filter!.value.trim().toLowerCase();
          rows.forEach((row, i) => {
            const text = (
              this.#boxes[i]!.value ||
              row.textContent ||
              ""
            ).toLowerCase();
            (row as HTMLElement).hidden = q !== "" && !text.includes(q);
          });
        });
      }
      wrap.append(filter);
    }

    const list = document.createElement("div");
    list.className = "chips-options";
    list.style.maxHeight = maxHeight;
    for (const row of rows) list.append(row);
    wrap.append(list);

    for (const box of this.#boxes) {
      box.addEventListener("change", () => this.#syncChips());
    }

    this.append(wrap);
    this.#syncChips();
  }

  // Rebuilt wholesale rather than diffed: the option count here is small, and a rebuild cannot
  // drift out of sync with the checkboxes the way incremental updates can.
  #syncChips(): void {
    const chips = this.#chips;
    if (!chips) return;
    chips.textContent = "";

    const selected = this.#boxes.filter((b) => b.checked);
    if (selected.length === 0) {
      const empty = document.createElement("span");
      empty.className = "chips-empty muted";
      empty.textContent = this.getAttribute("empty-text") ?? "None selected";
      chips.append(empty);
      return;
    }

    for (const box of selected) {
      const chip = document.createElement("span");
      chip.className = "chip";

      const text = document.createElement("span");
      text.className = "badge";
      text.textContent =
        box.value || (box.closest("label")?.textContent ?? "").trim();
      chip.append(text);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "chip-x";
      remove.setAttribute("aria-label", `Remove ${text.textContent}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        box.checked = false;
        // Fire the event the authored checkbox would have fired, so consumer listeners still run.
        box.dispatchEvent(new Event("change", { bubbles: true }));
      });
      chip.append(remove);

      chips.append(chip);
    }
  }

  get value(): string[] {
    return this.#boxes.filter((b) => b.checked).map((b) => b.value);
  }
}

define("mosni-chips", MosniChips);
