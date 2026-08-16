import { MosniElement, define, takeSlot, takeDefault } from "../base-element";

class MosniHeader extends MosniElement {
  protected render(): void {
    const brandSlot = takeSlot(this, "brand");
    const taglineSlot = takeSlot(this, "tagline");
    const mid = takeDefault(this);

    this.classList.add("header");

    const brand = brandSlot.length ? brandSlot[0] : this.buildBrand();

    // Logo + brand travel together as one lockup (this is exordium's / ores' header look) so the
    // header's space-between layout treats them as a single left-hand unit. Opt out with `no-logo`.
    const lockup = document.createElement("div");
    lockup.className = "header-brand";
    if (!this.hasAttribute("no-logo")) {
      lockup.append(document.createElement("mosni-logo"));
    }
    lockup.append(brand);

    // The brand (logo + text together) is always a link home, defaulting to "/"; an explicit href
    // overrides the target. The wrapping <a> is styled to inherit — it must not change the brand's
    // look (see `.header > a:has(.header-brand)` in the CSS).
    const link = document.createElement("a");
    link.href = this.getAttribute("href") ?? "/";
    link.append(lockup);
    this.append(link);

    // `mid.length` alone is wrong here: nicely-indented markup puts a whitespace-only text node
    // between `<mosni-header>`'s opening tag and its first named-slot child (e.g. `<span
    // slot="tagline">`), and takeDefault() picks that up like any other unslotted child. That used
    // to create an empty `.header-mid` — a real flex item that ate an extra `gap` on each side and
    // narrowed `.little-link`'s shrink room, unlike <Header>'s React twin, which only renders
    // `.header-mid` when real `children` are passed (React JSX has no such incidental whitespace).
    const hasMidContent = mid.some(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE ||
        (node.textContent ?? "").trim() !== "",
    );
    if (hasMidContent) {
      const midDiv = document.createElement("div");
      midDiv.className = "header-mid";
      midDiv.append(...mid);
      this.append(midDiv);
    }

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
