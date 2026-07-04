import { MosniElement, define } from "../base-element";

class MosniSwitch extends MosniElement {
  static get observedAttributes(): string[] {
    return ["checked", "disabled"];
  }

  #input: HTMLInputElement | null = null;

  protected render(): void {
    const label = this.getAttribute("label");
    const name = this.getAttribute("name");
    const value = this.getAttribute("value");

    // Enhance-first (API §1.1 / §4.7): an authored real checkbox is the no-JS route.
    const authored = this.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement | null;
    const input = authored ?? document.createElement("input");
    if (authored) authored.remove();
    else input.type = "checkbox";

    // Host attribute wins when present; otherwise adopt the (authored) control's own initial state
    // so an authored `<input type="checkbox" checked>` is not clobbered by an absent host attribute.
    if (this.hasAttribute("checked")) input.checked = true;
    else if (input.checked) this.setAttribute("checked", "");

    if (this.hasAttribute("disabled")) input.disabled = true;
    else if (input.disabled) this.setAttribute("disabled", "");

    if (name) input.setAttribute("name", name);
    if (value !== null) input.setAttribute("value", value);

    // A user toggling the (possibly authored) checkbox keeps `checked` in sync on the host.
    input.addEventListener("change", () => {
      this.toggleAttribute("checked", input.checked);
    });

    this.#input = input;
    this.textContent = "";

    const labelEl = document.createElement("label");
    labelEl.className = "switch";

    const visual = document.createElement("span");
    visual.className = "switch-visual";
    const thumb = document.createElement("span");
    thumb.className = "switch-thumb";
    visual.append(thumb);

    labelEl.append(input, visual);
    if (label) labelEl.append(label);

    this.append(labelEl);
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (!this.rendered || !this.#input) return;
    if (name === "checked") this.#input.checked = this.hasAttribute("checked");
    else if (name === "disabled")
      this.#input.disabled = this.hasAttribute("disabled");
  }

  get checked(): boolean {
    return this.hasAttribute("checked");
  }
  set checked(value: boolean) {
    this.toggleAttribute("checked", value);
  }

  get disabled(): boolean {
    return this.hasAttribute("disabled");
  }
  set disabled(value: boolean) {
    this.toggleAttribute("disabled", value);
  }
}

define("mosni-switch", MosniSwitch);
