import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
} from "react";
import type {
  ComponentPropsWithoutRef,
  JSX,
  ReactElement,
  ReactNode,
} from "react";
import { mergeClassName } from "../internal/merge-class-name";
import type { AccordionItemProps } from "./AccordionItem";

export type AccordionProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  /** Only one section open at a time - a shared generated `name` is pushed onto every
   * <AccordionItem> child's <details>, exactly mirroring accordion.ts's own generated group name. */
  exclusive?: boolean;
  children?: ReactNode;
};

// `.accordion` is the D-R11 class twin for mosni-accordion's own bare TAG-selector styling
// (`mosni-accordion, .accordion { … }` in _accordion.scss) - the custom element never puts a class
// on itself (it styles via the tag directly), so this is the one RENAMED_HOSTS tag whose parity
// fixture needs the harness's IMPLICIT_HOST_CLASS entry (agent-docs → planning-artifacts/react-path-implementation-waves.md §10) rather than a literal
// class the element already carries.
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  function Accordion(
    { exclusive = false, children, className, ...rest },
    ref,
  ): JSX.Element {
    const groupName = useId();

    const items = exclusive
      ? Children.map(children, (child) =>
          isValidElement(child)
            ? cloneElement(child as ReactElement<AccordionItemProps>, {
                name: groupName,
              })
            : child,
        )
      : children;

    return (
      <div
        className={mergeClassName("accordion", className)}
        ref={ref}
        {...rest}
      >
        {items}
      </div>
    );
  },
);
