import { icon } from "../icons";
import { MosniElement, define, takeDefault, takeSlot } from "../base-element";

class MosniModal extends MosniElement {
  static observedAttributes = ["open"];

  #dialog: HTMLDialogElement | undefined;

  protected render(): void {
    const headingSlot = takeSlot(this, "heading");
    const footerSlot = takeSlot(this, "footer");
    const bodyNodes = takeDefault(this);

    const dialog = document.createElement("dialog");
    dialog.className = "modal";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "modal-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.appendChild(icon("x", 20));
    closeButton.addEventListener("click", () => this.close());

    const heading = document.createElement("h1");
    heading.className = "modal-heading";
    if (headingSlot.length > 0) {
      heading.append(...headingSlot);
    } else {
      heading.textContent = this.getAttribute("heading") ?? "";
    }

    const body = document.createElement("div");
    body.className = "modal-body";
    body.append(...bodyNodes);

    const footer = document.createElement("div");
    footer.className = "modal-footer";
    footer.append(...footerSlot);

    dialog.append(closeButton, heading, body, footer);
    this.appendChild(dialog);
    this.#dialog = dialog;

    // Backdrop click closes: a pointerdown whose target is the dialog element itself (rather
    // than any of its content, which would be the target when the click lands on modal content)
    // means the pointer landed on the ::backdrop area.
    dialog.addEventListener("pointerdown", (event) => {
      if (event.target === dialog) this.close();
    });

    // Reflect native close (Esc -> `cancel` -> the UA's own auto-close -> `close`, or close()
    // below) back onto the host's `open` attribute. Guarded so the attributeChangedCallback this
    // triggers (open removed) never re-enters dialog.close() on an already-closed dialog.
    dialog.addEventListener("close", () => {
      if (this.hasAttribute("open")) this.removeAttribute("open");
    });

    if (this.hasAttribute("open")) {
      dialog.showModal();
    }
  }

  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    // An `open` attribute present at parse time reaches this callback before connectedCallback
    // runs render() (custom-element upgrade order is attributeChangedCallback* then
    // connectedCallback) — render()'s own initial showModal() call above already covers that
    // case, so bail out until the dialog actually exists.
    if (name !== "open" || !this.#dialog) return;
    if (newValue !== null) {
      if (!this.#dialog.open) this.#dialog.showModal();
    } else if (this.#dialog.open) {
      this.#dialog.close();
    }
  }

  get open(): boolean {
    return this.hasAttribute("open");
  }

  set open(value: boolean) {
    this.toggleAttribute("open", value);
  }

  show(): void {
    this.setAttribute("open", "");
  }

  close(returnValue?: string): void {
    if (!this.#dialog) return;
    if (returnValue !== undefined) {
      this.#dialog.close(returnValue);
    } else {
      this.#dialog.close();
    }
  }
}

define("mosni-modal", MosniModal);
