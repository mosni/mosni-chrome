import {
  createElement,
  X,
  Check,
  Info,
  CircleCheck,
  CircleAlert,
  ChevronDown,
  Copy,
} from "lucide";

const glyphs = {
  x: X,
  check: Check,
  info: Info,
  "circle-check": CircleCheck,
  "circle-alert": CircleAlert,
  "chevron-down": ChevronDown,
  copy: Copy,
} as const;
export type IconName = keyof typeof glyphs;

/** D-24 whitelist (guidelines §2.8): currentColor, stroke-width 2, 24×24 viewBox,
 *  sized by context (20px icon-buttons, 16px inline). aria-hidden - icons are decorative.
 *  Keep this list aligned with the docs/examples/icons.html whitelist section. */
export const icon = (name: IconName, size: 16 | 20): SVGElement => {
  const el = createElement(glyphs[name]);
  el.setAttribute("width", String(size));
  el.setAttribute("height", String(size));
  el.setAttribute("aria-hidden", "true");
  return el;
};
