import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, JSX, ReactNode } from "react";
import { mergeClassName } from "../internal/merge-class-name";

export type FooterProps = ComponentPropsWithoutRef<"footer"> & {
  /** Right-side link row (mirrors the `slot="links"` region). */
  links?: ReactNode;
  children?: ReactNode;
};

export const Footer = forwardRef<HTMLElement, FooterProps>(function Footer(
  { links, children, className, ...rest },
  ref,
): JSX.Element {
  return (
    <footer className={mergeClassName("footer", className)} ref={ref} {...rest}>
      <div className="footer-left">{children}</div>
      <div className="footer-links">{links}</div>
    </footer>
  );
});
