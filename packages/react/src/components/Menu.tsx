import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, JSX, ReactNode } from "react";
import { mergeClassName } from "../internal/merge-class-name";

export type MenuProps = ComponentPropsWithoutRef<"nav"> & {
  label?: string;
  children?: ReactNode;
};

export const Menu = forwardRef<HTMLElement, MenuProps>(function Menu(
  { label, className, ...rest },
  ref,
): JSX.Element {
  return (
    <nav
      className={mergeClassName("menu", className)}
      role="navigation"
      // mosni-menu only sets aria-label when `label` is a non-empty string; `|| undefined` keeps an
      // empty-string label from rendering a bare aria-label="" the way `label &&` would in the
      // custom element (React would otherwise render the attribute for any defined string, even "").
      aria-label={label || undefined}
      ref={ref}
      {...rest}
    />
  );
});
