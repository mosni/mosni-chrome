import { MosniElement, define } from "../base-element";
import { icon } from "../icons";

class MosniLightbox extends MosniElement {
  private thumb: HTMLImageElement | null = null;
  private dialog: HTMLDialogElement | null = null;

  protected render(): void {
    const thumb = this.querySelector("img");
    if (!thumb) return;
    this.thumb = thumb;
    thumb.classList.add("lightbox-thumb");
    thumb.addEventListener("click", () => this.open());
  }

  open(): void {
    if (!this.thumb || this.dialog) return;
    const dialog = this.buildDialog(this.thumb);
    this.dialog = dialog;
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  close(): void {
    this.dialog?.close();
  }

  private buildDialog(thumb: HTMLImageElement): HTMLDialogElement {
    const dialog = document.createElement("dialog");
    dialog.className = "lightbox";

    const full = document.createElement("img");
    full.src = this.getAttribute("full") || thumb.src;
    dialog.appendChild(full);

    const caption = this.getAttribute("caption");
    if (caption) {
      const p = document.createElement("p");
      p.className = "lightbox-caption";
      p.textContent = caption;
      dialog.appendChild(p);
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.appendChild(icon("x", 20));
    closeBtn.addEventListener("click", () => this.close());
    dialog.appendChild(closeBtn);

    // Backdrop click closes: a pointerdown that lands on the dialog element itself (not a
    // descendant) means the click was outside the dialog's own layout box, i.e. on the backdrop.
    dialog.addEventListener("pointerdown", (event) => {
      if (event.target === dialog) this.close();
    });

    // Native `close` fires for both explicit close() and Esc (`cancel` then `close`) — clean up
    // the generated dialog either way so activating again builds a fresh one.
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        if (this.dialog === dialog) this.dialog = null;
      },
      { once: true },
    );

    return dialog;
  }
}

define("mosni-lightbox", MosniLightbox);
