import { forwardRef, useId, useState } from "react";
import type { ChangeEventHandler, ComponentPropsWithoutRef, JSX } from "react";
import { mergeClassName } from "../internal/merge-class-name";

// Mirrors slider.ts's #clampIndex exactly: a non-integer, negative, or NaN index becomes 0; an
// index past the end clamps to stops.length - 1 (and to 0 when stops is empty).
function clampIndex(index: number, stopsLength: number): number {
  const max = Math.max(stopsLength - 1, 0);
  if (!Number.isInteger(index) || index < 0) return 0;
  return Math.min(index, max);
}

export type SliderProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "onChange" | "defaultValue"
> & {
  /** Stop labels in order. The React counterpart of the pipe-delimited `stops` attribute. */
  stops: string[];
  /** Controlled selected stop INDEX. */
  value?: number;
  /** Uncontrolled initial selected stop INDEX. Defaults to 0. */
  defaultValue?: number;
  /** Optional caption above the track; also the range input's accessible name. */
  label?: string;
  /** Fires with the newly selected stop INDEX. */
  onChange?: (index: number) => void;
};

// Root is div.slider itself - no separate host to reintroduce (D-R1). See slider.ts's render()
// for the specification this mirrors.
export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  { stops, value, defaultValue = 0, label, onChange, className, ...rest },
  ref,
): JSX.Element {
  const id = useId();
  const isControlled = value !== undefined;
  const [uncontrolledIndex, setUncontrolledIndex] = useState(() =>
    clampIndex(defaultValue, stops.length),
  );
  const index = clampIndex(
    isControlled ? value : uncontrolledIndex,
    stops.length,
  );
  // Same controlled/uncontrolled split as <Switch>'s checked/defaultChecked: React owns the value
  // when controlled, the browser owns it (from this initial index) otherwise.
  const indexProps = isControlled ? { value: index } : { defaultValue: index };

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const next = clampIndex(Number(event.target.value), stops.length);
    if (!isControlled) setUncontrolledIndex(next);
    onChange?.(next);
  };

  const readoutText = stops[index] ?? "";

  return (
    <div className={mergeClassName("slider", className)} ref={ref} {...rest}>
      {label && (
        <label className="slider-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="slider-track-wrap">
        <input
          type="range"
          className="slider-input"
          id={id}
          min={0}
          max={Math.max(stops.length - 1, 0)}
          step={1}
          aria-label={label || undefined}
          aria-valuetext={readoutText}
          onChange={handleChange}
          {...indexProps}
        />
        <div className="slider-ticks" aria-hidden="true">
          {stops.map((_, i) => (
            <span key={i} className="slider-tick" />
          ))}
        </div>
        <div className="slider-ends" aria-hidden="true">
          <span className="slider-end slider-end-start">{stops[0] ?? ""}</span>
          <span className="slider-end slider-end-end">
            {stops[stops.length - 1] ?? ""}
          </span>
        </div>
      </div>
      <div className="slider-readout" aria-hidden="true">
        {readoutText}
      </div>
    </div>
  );
});
