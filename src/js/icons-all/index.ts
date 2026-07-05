import { createElement, icons } from "lucide";

declare global {
  interface Window {
    mosniIcons?: { create: (name: string, size: number) => SVGElement | null };
  }
}

const toPascal = (name: string): string =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

window.mosniIcons = {
  create(name, size) {
    const node = (icons as Record<string, unknown>)[toPascal(name)];
    if (!node) return null;
    const el = createElement(node as never);
    el.setAttribute("width", String(size));
    el.setAttribute("height", String(size));
    el.setAttribute("aria-hidden", "true");
    return el;
  },
};
