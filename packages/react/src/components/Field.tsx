import { cloneElement, forwardRef, isValidElement, useId } from "react";
import type {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  JSX,
  ReactElement,
  ReactNode,
} from "react";
import { mergeClassName } from "../internal/merge-class-name";

// Same set field.ts recognizes as native <input> types; everything else (including "textarea" and
// "select", handled separately below) falls back to "text" - mirrors #generateControl exactly.
const INPUT_TYPES = new Set([
  "text",
  "password",
  "email",
  "number",
  "url",
  "search",
  "tel",
  "date",
  "checkbox",
  "radio",
]);

type FieldControlElement =
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type FieldProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "onChange"
> & {
  label: string;
  type?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: ChangeEventHandler<FieldControlElement>;
  required?: boolean;
  help?: string;
  error?: string;
  /** Authored control overriding the generated one - mirrors mosni-field's
   * `querySelector("input, textarea, select")` enhance-first check. Expects a single input/textarea/select
   * element; id/name/required/aria-invalid are applied to it the same way field.ts applies them to
   * whichever control (authored or generated) it ends up with. */
  children?: ReactNode;
};

// NOTE (see agent-docs → planning-artifacts/react-path-implementation-waves.md §10): field.ts sets `control.value = value` as a PROPERTY, not an
// attribute - browsers (and jsdom) never reflect a programmatically-set `.value` back onto the
// `value` ATTRIBUTE for input/textarea, so the custom element's rendered markup never shows the
// configured value at all, no matter what `value` a fixture supplies. React's SSR, by contrast,
// always emits `value="…"` for both controlled and uncontrolled inputs. This is a genuine
// element-side quirk, not a harness artifact - parity.mjs's fixtures deliberately never exercise
// `value` for this reason; scripts/react-behaviour.mjs verifies the actual `.value` semantics
// against a live DOM instead, where this attribute/property distinction doesn't matter.
function valueProps(
  value: string | undefined,
  defaultValue: string | undefined,
): { value: string } | { defaultValue: string } | Record<string, never> {
  if (value !== undefined) return { value };
  if (defaultValue !== undefined) return { defaultValue };
  return {};
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    label,
    type = "text",
    name,
    value,
    defaultValue,
    onChange,
    required = false,
    help,
    error,
    children,
    className,
    ...rest
  },
  ref,
): JSX.Element {
  const id = useId();
  const hasError = Boolean(error);

  const shared = {
    id,
    name,
    required: required || undefined,
    onChange,
    "aria-invalid": hasError ? ("true" as const) : undefined,
    ...valueProps(value, defaultValue),
  };

  let control: ReactNode;
  if (children != null && isValidElement(children)) {
    // Enhance-first, same as field.ts: the authored element IS the control, only decorated with
    // the id/name/required/value/aria-invalid it would otherwise generate.
    control = cloneElement(
      children as ReactElement<Record<string, unknown>>,
      shared,
    );
  } else if (type === "textarea") {
    control = <textarea {...shared} />;
  } else if (type === "select") {
    control = <select {...shared} />;
  } else {
    control = (
      <input type={INPUT_TYPES.has(type) ? type : "text"} {...shared} />
    );
  }

  return (
    <div
      className={mergeClassName(hasError ? "field error" : "field", className)}
      ref={ref}
      {...rest}
    >
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="field-req">*</span>}
      </label>
      {control}
      {help && <p className="field-help">{help}</p>}
      {hasError && <p className="field-error">{error}</p>}
    </div>
  );
});
