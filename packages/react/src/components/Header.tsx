import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, JSX, ReactNode } from "react";
import { mergeClassName } from "../internal/merge-class-name";
import { Logo } from "./Logo";

export type HeaderProps = Omit<
  ComponentPropsWithoutRef<"header">,
  "children"
> & {
  /** Plain text (builds `.brand`/`.purple`) or a rich node used as-is (§3's slot-prop convention). */
  brand?: ReactNode;
  /** Only applies when `brand` is a plain string - ignored for a rich `brand` node, same as the
   * custom element ignoring `accent` once a `slot="brand"` child is present. */
  accent?: string;
  href?: string;
  /** Plain text or a rich node, same string-vs-node split as `brand`. */
  tagline?: ReactNode;
  noLogo?: boolean;
  /** Default region -> `.header-mid`, only rendered when given (mirrors takeDefault's `mid.length` check). */
  children?: ReactNode;
};

export const Header = forwardRef<HTMLElement, HeaderProps>(function Header(
  {
    brand,
    accent,
    href = "/",
    tagline,
    noLogo = false,
    children,
    className,
    ...rest
  },
  ref,
): JSX.Element {
  const brandContent =
    brand === undefined || typeof brand === "string" ? (
      <div className="brand">
        {typeof brand === "string" ? brand : ""}
        {accent !== undefined && (
          <>
            {" "}
            <span className="purple">{accent}</span>
          </>
        )}
      </div>
    ) : (
      brand
    );

  // Same string-vs-node split as `brand`: a plain string (or nothing) falls back to "" the way
  // `getAttribute("tagline") ?? ""` does; a rich node is used as-is.
  const taglineContent =
    tagline === undefined || typeof tagline === "string"
      ? (tagline ?? "")
      : tagline;

  return (
    <header className={mergeClassName("header", className)} ref={ref} {...rest}>
      <a href={href}>
        <div className="header-brand">
          {!noLogo && <Logo />}
          {brandContent}
        </div>
      </a>
      {children != null && <div className="header-mid">{children}</div>}
      <div className="little-link">{taglineContent}</div>
    </header>
  );
});
