import { forwardRef, useId, useState } from "react";
import type { ComponentPropsWithoutRef, JSX } from "react";
import { mergeClassName } from "../internal/merge-class-name";
import { Switch } from "./Switch";

export interface ChipsOption {
  value: string;
  label: string;
}

export type ChipsProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "onChange" | "children"
> & {
  options: ChipsOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  filterThreshold?: number;
  maxHeight?: string;
  emptyText?: string;
};

// Renders REAL checkboxes directly (native form submission still works) rather than enhancing
// authored ones - chips.ts's enhance-over-authored-checkboxes trick exists so a no-JS page still
// gets a usable list (auth's D-53 rule); a React consumer already needs JS to render anything at
// all, so there is nothing to "enhance" and the plain controlled/uncontrolled form is the right fit
// (§4's component table). Each option composes <Switch>, same as chips.ts wraps each authored
// checkbox in a <mosni-switch> - one implementation of the toggle, not two that can drift.
//
// The filter text matches against `option.label` (not chips.ts's `box.value`-first, label-as-fallback
// quirk - see agent-docs → planning-artifacts/react-path-implementation-waves.md §10): the React API hands label and value in explicitly instead of
// deriving one from the other, so matching the human-readable label is the only sensible reading of
// "Filter…" for this shape. Filtered-out options are omitted from the render entirely rather than
// given a `hidden` attribute: chips.ts's `.chips-options mosni-switch[hidden]` CSS rule has no `.switch`
// twin (out of scope for this wave - D-R11 never covered it), so a `hidden` attribute here would be
// inert; not rendering the option at all gets the same visible result with no CSS dependency.
export const Chips = forwardRef<HTMLDivElement, ChipsProps>(function Chips(
  {
    options,
    value,
    defaultValue,
    onChange,
    label,
    placeholder = "Filter…",
    filterThreshold = 8,
    maxHeight = "13rem",
    emptyText = "None selected",
    className,
    ...rest
  },
  ref,
): JSX.Element {
  const filterId = useId();
  const [uncontrolled, setUncontrolled] = useState<string[]>(
    defaultValue ?? [],
  );
  const [query, setQuery] = useState("");

  const selected = value ?? uncontrolled;
  const selectedSet = new Set(selected);

  const toggle = (optionValue: string, isChecked: boolean): void => {
    const next = isChecked
      ? [...selected, optionValue]
      : selected.filter((v) => v !== optionValue);
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
  };

  const selectedOptions = options.filter((option) =>
    selectedSet.has(option.value),
  );
  const trimmedQuery = query.trim().toLowerCase();
  const visibleOptions = options.filter(
    (option) =>
      trimmedQuery === "" || option.label.toLowerCase().includes(trimmedQuery),
  );

  return (
    <div className={mergeClassName("chips", className)} ref={ref} {...rest}>
      {label && <span className="chips-label">{label}</span>}
      <div className="chips-selected">
        {selectedOptions.length === 0 ? (
          <span className="chips-empty muted">{emptyText}</span>
        ) : (
          selectedOptions.map((option) => (
            <span className="chip" key={option.value}>
              <span className="chip-text">{option.label}</span>
              <button
                type="button"
                className="chip-x"
                aria-label={`Remove ${option.label}`}
                onClick={() => toggle(option.value, false)}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      {options.length >= filterThreshold && (
        // Mirrors the plain field.ts markup a nested <mosni-field> generates for the filter box -
        // deliberately not the <Field> component (its label prop is required and always visible;
        // chips.ts's own nested field gets an empty, CSS-hidden label, which a bare <label> matches
        // more directly than routing through Field's authored-control-clone path for one input).
        <div className="field">
          <label className="field-label" htmlFor={filterId} />
          <input
            type="text"
            id={filterId}
            className="chips-filter"
            placeholder={placeholder}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}
      <div className="chips-options" style={{ maxHeight }}>
        {visibleOptions.map((option) => (
          <Switch
            key={option.value}
            label={option.label}
            value={option.value}
            checked={selectedSet.has(option.value)}
            onChange={(event) => toggle(option.value, event.target.checked)}
          />
        ))}
      </div>
    </div>
  );
});
