import {
  createElement,
  X,
  Check,
  Info,
  CircleCheck,
  CircleAlert,
  ChevronDown,
  Copy,
  Menu,
} from "lucide";

const glyphs = {
  x: X,
  check: Check,
  info: Info,
  "circle-check": CircleCheck,
  "circle-alert": CircleAlert,
  "chevron-down": ChevronDown,
  copy: Copy,
  menu: Menu,
} as const;
export type IconName = keyof typeof glyphs;

export const icon = (name: IconName, size: 16 | 20): SVGElement => {
  const el = createElement(glyphs[name]);
  el.setAttribute("width", String(size));
  el.setAttribute("height", String(size));
  el.setAttribute("aria-hidden", "true");
  return el;
};
