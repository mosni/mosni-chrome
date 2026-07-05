import { MosniElement, define, takeSlot, takeDefault } from "../base-element";

// Generate role, M1 on `.header` (API §4.1 / guidelines §4.1, §3.3).
class MosniHeader extends MosniElement {
  protected render(): void {
    const brandSlot = takeSlot(this, "brand");
    const taglineSlot = takeSlot(this, "tagline");
    const mid = takeDefault(this);

    this.classList.add("header");

    const href = this.getAttribute("href");
    const brand = brandSlot.length ? brandSlot[0] : this.buildBrand();

    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.append(brand);
      this.append(link);
    } else {
      this.append(brand);
    }

    const midDiv = document.createElement("div");
    midDiv.className = "header-mid";
    midDiv.append(...mid);
    this.append(midDiv);

    const littleLink = document.createElement("div");
    littleLink.className = "little-link";
    if (taglineSlot.length) {
      littleLink.append(...taglineSlot);
    } else {
      littleLink.append(this.getAttribute("tagline") ?? "");
    }
    this.append(littleLink);
  }

  private buildBrand(): HTMLDivElement {
    const brand = document.createElement("div");
    brand.className = "brand";
    brand.append(this.getAttribute("brand") ?? "");

    const accent = this.getAttribute("accent");
    if (accent !== null) {
      brand.append(" ");
      const span = document.createElement("span");
      span.className = "purple";
      span.textContent = accent;
      brand.append(span);
    }

    return brand;
  }
}

define("mosni-header", MosniHeader);
