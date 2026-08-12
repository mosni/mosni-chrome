import { forwardRef } from "react";
import type { JSX, ReactNode } from "react";

export interface DropdownItemProps {
  value: string;
  variant?: "danger";
  disabled?: boolean;
  children?: ReactNode;
  /** Wired by the parent <Dropdown> via cloneElement - not meant to be passed directly (same
   * pattern as <AccordionItem>'s `name`). */
  onClick?: () => void;
}

// Unlike <Tab>, this DOES render its own markup (dropdown.ts's own mosni-dropdown-item also builds
// its own `button role=menuitem` independently - "so <mosni-dropdown> never depends on its items
// having already rendered"). <Dropdown> still needs to know when one is clicked and collect refs
// for keyboard nav, so it clones each child to inject `onClick`/`ref` rather than delegating a
// single click listener the way dropdown.ts's `#onMenuClick` does - React has no light-DOM
// `.closest()` correlate-by-attribute step to lean on here.
export const DropdownItem = forwardRef<HTMLButtonElement, DropdownItemProps>(
  function DropdownItem(
    { value: _value, variant, disabled = false, children, onClick },
    ref,
  ): JSX.Element {
    return (
      <button
        type="button"
        className={
          variant ? `dropdown-item dropdown-item-${variant}` : "dropdown-item"
        }
        role="menuitem"
        tabIndex={-1}
        disabled={disabled}
        ref={ref}
        onClick={onClick}
      >
        {children}
      </button>
    );
  },
);
