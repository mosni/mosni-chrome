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

    dialog.addEventListener("pointerdown", (event) => {
      if (event.target === dialog) this.close();
    });

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
    // runs render() (upgrade order: attributeChangedCallback then connectedCallback) — render()'s
    // own showModal() covers that case, so bail until the dialog exists.
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
