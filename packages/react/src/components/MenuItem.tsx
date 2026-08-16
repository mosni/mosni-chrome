import { forwardRef } from "react";
import type { JSX, MouseEventHandler, Ref } from "react";
import { mergeClassName } from "../internal/merge-class-name";

export interface MenuItemProps {
  title: string;
  subtitle?: string;
  href?: string;
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLDivElement>;
  className?: string;
}

// Root is the rendered row itself (`a.menu-entry` when `href` is set, else `div.menu-entry`) - no
// wrapper element, matching mosni-menu-item's own `display: contents` host (its visible box IS the
// generated .menu-entry, and D-R1 says a React component never re-introduces the host that light-DOM
// child ownership required).
export const MenuItem = forwardRef<
  HTMLAnchorElement | HTMLDivElement,
  MenuItemProps
>(function MenuItem(
  { title, subtitle, href, selected = false, onClick, className },
  ref,
): JSX.Element {
  const classes = mergeClassName(
    selected ? "menu-entry selected" : "menu-entry",
    className,
  );
  const content = (
    <>
      <span className="menu-entry-title">{title}</span>
      {subtitle !== undefined && (
        <span className="menu-entry-subtitle">{subtitle}</span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        className={classes}
        href={href}
        aria-current={selected ? "page" : undefined}
        onClick={onClick}
        ref={ref as Ref<HTMLAnchorElement>}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={classes}
      aria-current={selected ? "page" : undefined}
      onClick={onClick}
      ref={ref as Ref<HTMLDivElement>}
    >
      {content}
    </div>
  );
});
