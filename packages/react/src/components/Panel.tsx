import { Children, forwardRef, isValidElement } from "react";
import type { ComponentPropsWithoutRef, JSX, ReactNode } from "react";
import { mergeClassName } from "../internal/merge-class-name";

export type PanelProps = ComponentPropsWithoutRef<"div"> & {
  heading?: string;
  size?: "small" | "full";
  children?: ReactNode;
};

// hasHeadingChild mirrors mosni-panel's own check (`child.tagName === "H1"`) but only needs the top
// level of children - Children.toArray, not a deep search, matches Array.from(this.children).
function hasHeadingChild(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === "h1",
  );
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { heading, size, children, className, ...rest },
  ref,
): JSX.Element {
  const classes =
    size === "small"
      ? "panel panel-small"
      : size === "full"
        ? "panel panel-full"
        : "panel";

  // Enhance-first (mirrors mosni-panel): an authored <h1> child always wins over `heading`, which is
  // only injected as a generated <h1> when no such child is present.
  const injectHeading = Boolean(heading) && !hasHeadingChild(children);

  return (
    <div className={mergeClassName(classes, className)} ref={ref} {...rest}>
      {injectHeading && <h1>{heading}</h1>}
      {children}
    </div>
  );
});
