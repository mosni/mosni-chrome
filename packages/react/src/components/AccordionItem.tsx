import { forwardRef } from "react";
import type { JSX, ReactNode } from "react";
import { mergeClassName } from "../internal/merge-class-name";
import { ChevronDownGlyph } from "../icons.generated";

export interface AccordionItemProps {
  summary: ReactNode;
  defaultOpen?: boolean;
  children?: ReactNode;
  className?: string;
  /** Set by the parent <Accordion> when `exclusive` (native <details name> grouping) - not meant
   * to be passed directly; accepted here only so <Accordion> can inject it via cloneElement. */
  name?: string;
}

// mosni-accordion has no separate sub-element tag (unlike mosni-tab/mosni-menu-item) - it enhances
// PLAIN <details>/<summary> children directly (accordion.ts filters `this.children` for
// `tagName === "DETAILS"`). <AccordionItem> exists purely for React ergonomics; its rendered output
// is exactly what accordion.ts's enhancement produces from an authored `<details><summary>…`.
export const AccordionItem = forwardRef<HTMLDetailsElement, AccordionItemProps>(
  function AccordionItem(
    { summary, defaultOpen = false, children, className, name },
    ref,
  ): JSX.Element {
    return (
      <details className={className} name={name} open={defaultOpen} ref={ref}>
        <summary>
          {summary}
          <span className="accordion-chevron">
            <ChevronDownGlyph size={16} />
          </span>
        </summary>
        {children}
      </details>
    );
  },
);
