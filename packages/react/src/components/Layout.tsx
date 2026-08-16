import { forwardRef, useState } from "react";
import type {
  ComponentPropsWithoutRef,
  JSX,
  MouseEvent,
  ReactNode,
} from "react";
import { mergeClassName } from "../internal/merge-class-name";
import { MenuGlyph } from "../icons.generated";

export type LayoutProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  header?: ReactNode;
  menu?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
};

export const Layout = forwardRef<HTMLDivElement, LayoutProps>(function Layout(
  { header, menu, footer, children, className, ...rest },
  ref,
): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);

  // mosni-layout closes the menu when a `.menu-entry` inside it is clicked (delegated, not one
  // listener per item) - same `closest()` check, now driven by React's synthetic click on the wrapper.
  const onMenuClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (!(event.target as HTMLElement).closest(".menu-entry")) return;
    setMenuOpen(false);
  };

  return (
    <div
      className={mergeClassName(
        menuOpen ? "layout menu-open" : "layout",
        className,
      )}
      ref={ref}
      {...rest}
    >
      {header}
      <div className="layout-menu" onClick={onMenuClick}>
        {menu}
      </div>
      <main className="layout-main">
        {children}
        {footer}
      </main>
      <button
        type="button"
        className="layout-burger"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MenuGlyph size={20} />
      </button>
    </div>
  );
});
