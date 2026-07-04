import { MosniElement, define } from "../base-element";

// Generated-control input types (API §4.6). "textarea" and "select" build a different element;
// everything else is an <input type="...">.
const INPUT_TYPES = new Set([
  "text",
  "password",
  "email",
  "number",
  "url",
  "search",
  "tel",
  "date",
  "checkbox",
  "radio",
]);

let idCounter = 0;
const nextId = (): string => `mosni-field-${++idCounter}`;

type FieldControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

class MosniField extends MosniElement {
  static get observedAttributes(): string[] {
    return ["error"];
  }

  #control: FieldControl | null = null;
  #errorEl: HTMLParagraphElement | null = null;

  protected render(): void {
    this.classList.add("field");

    const label = this.getAttribute("label") ?? "";
    const type = this.getAttribute("type") ?? "text";
    const name = this.getAttribute("name");
    const value = this.getAttribute("value");
    const required = this.hasAttribute("required");
    const help = this.getAttribute("help");
    const error = this.getAttribute("error");

    // Enhance-first (API §1.1 / §4.6): use an authored real control if present, else generate one
    // from `type`. An authored <select>'s <option> children come along with it automatically since
    // we reuse the element itself rather than rebuilding it.
    const authored = this.querySelector(
      "input, textarea, select",
    ) as FieldControl | null;
    const control = authored ?? this.#generateControl(type);
    if (authored) authored.remove();

    const id = nextId();
    control.id = id;
    if (name) control.setAttribute("name", name);
    if (value !== null) control.value = value;
    if (required) control.setAttribute("required", "");

    this.#control = control;

    // Drop any remaining light-DOM content (whitespace text nodes, stray markup) before rebuilding.
    this.textContent = "";

    const labelEl = document.createElement("label");
    labelEl.className = "field-label";
    labelEl.setAttribute("for", id);
    labelEl.append(label);
    if (required) {
      const req = document.createElement("span");
      req.className = "field-req";
      req.textContent = "*";
      labelEl.append(req);
    }

    this.append(labelEl, control);

    if (help) {
      const helpEl = document.createElement("p");
      helpEl.className = "field-help";
      helpEl.textContent = help;
      this.append(helpEl);
    }

    if (error) this.#applyError(error);
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (!this.rendered) return;
    if (name === "error") this.#applyError(newValue);
  }

  #generateControl(type: string): FieldControl {
    if (type === "textarea") return document.createElement("textarea");
    if (type === "select") return document.createElement("select");
    const input = document.createElement("input");
    input.type = INPUT_TYPES.has(type) ? type : "text";
    return input;
  }

  #applyError(message: string | null): void {
    const control = this.#control;
    if (message) {
      this.classList.add("error");
      control?.setAttribute("aria-invalid", "true");
      if (!this.#errorEl) {
        this.#errorEl = document.createElement("p");
        this.#errorEl.className = "field-error";
        this.append(this.#errorEl);
      }
      this.#errorEl.textContent = message;
    } else {
      this.classList.remove("error");
      control?.removeAttribute("aria-invalid");
      if (this.#errorEl) {
        this.#errorEl.remove();
        this.#errorEl = null;
      }
    }
  }

  get error(): string {
    return this.getAttribute("error") ?? "";
  }
  set error(value: string) {
    if (value) this.setAttribute("error", value);
    else this.removeAttribute("error");
  }

  get control(): FieldControl | null {
    return this.#control;
  }
}

define("mosni-field", MosniField);
