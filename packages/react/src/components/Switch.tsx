import { forwardRef } from "react";
import type { ChangeEventHandler, JSX } from "react";
import { mergeClassName } from "../internal/merge-class-name";

export interface SwitchProps {
  label?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  className?: string;
}

// Root is the generated label.switch itself - no host wrapper, matching mosni-switch's own
// `display: inline-block` host (§10's D-R11 note: this is a host RESET, not real styling, so the
// React path gets no twin and renders no box for it at all).
//
// NOTE (agent-docs → planning-artifacts/react-path-implementation-waves.md §10, same quirk as <Field>'s value): switch.ts sets `input.checked = true` as
// a PROPERTY when the host's `checked` attribute is present, never as an attribute on the input
// itself - so the custom element's rendered markup never shows `checked` on a freshly-generated
// input, no matter what the fixture asks for. React's SSR always emits `checked=""` for a checked
// controlled/uncontrolled input. parity.mjs's fixtures therefore only exercise the unchecked
// default; react-behaviour.mjs verifies the real `.checked` semantics against a live DOM.
export const Switch = forwardRef<HTMLLabelElement, SwitchProps>(function Switch(
  {
    label,
    name,
    value,
    checked,
    defaultChecked,
    disabled = false,
    onChange,
    className,
  },
  ref,
): JSX.Element {
  const checkedProps = checked !== undefined ? { checked } : { defaultChecked };

  return (
    <label className={mergeClassName("switch", className)} ref={ref}>
      <input
        type="checkbox"
        name={name}
        value={value}
        disabled={disabled}
        onChange={onChange}
        {...checkedProps}
      />
      <span className="switch-visual">
        <span className="switch-thumb" />
      </span>
      {label}
    </label>
  );
});
