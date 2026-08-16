import {
  Children,
  forwardRef,
  isValidElement,
  useId,
  useRef,
  useState,
} from "react";
import type {
  ComponentPropsWithoutRef,
  JSX,
  KeyboardEvent,
  ReactElement,
} from "react";
import { mergeClassName } from "../internal/merge-class-name";
import type { TabProps } from "./Tab";

export type TabsProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "onChange"
> & {
  selectedIndex?: number;
  defaultSelectedIndex?: number;
  onChange?: (index: number, label: string) => void;
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
};

// mosni-tabs is UNWRAPPED_HOSTS (react-plan.md §10): it never classes its own host, only the
// generated div.tabs child it appends - so React renders div.tabs directly, no host box to
// reintroduce (D-R1). <Tab> children are read for `label`/`children` only, never rendered
// themselves - tabs.ts does the same thing imperatively (moves each mosni-tab's children into a
// generated panel, leaving the (now empty) mosni-tab in place with `display: contents`).
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    selectedIndex,
    defaultSelectedIndex = 0,
    onChange,
    children,
    className,
    ...rest
  },
  ref,
): JSX.Element {
  const idBase = useId();
  const [uncontrolledIndex, setUncontrolledIndex] =
    useState(defaultSelectedIndex);
  const isControlled = selectedIndex !== undefined;
  const activeIndex = isControlled ? selectedIndex : uncontrolledIndex;

  const tabs = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<TabProps>[];
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number): void => {
    if (index < 0 || index >= tabs.length || index === activeIndex) return;
    if (!isControlled) setUncontrolledIndex(index);
    onChange?.(index, tabs[index]?.props.label ?? "");
  };

  // Arrow keys move FOCUS only - they do not select. tabs.ts's own #onKeydown does exactly this
  // (a manual-activation tablist, not the auto-activate pattern); clicking or Space/Enter on the
  // now-focused button is what actually calls select(), same as tabs.ts's button click listener.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const count = tabs.length;
    if (count === 0) return;
    const current = buttonRefs.current.findIndex(
      (button) => button === document.activeElement,
    );
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = ((current === -1 ? 0 : current) + delta + count) % count;
    event.preventDefault();
    buttonRefs.current[next]?.focus();
  };

  return (
    <div className={mergeClassName("tabs", className)} ref={ref} {...rest}>
      <div className="tabs-bar" role="tablist" onKeyDown={onKeyDown}>
        {tabs.map((tab, index) => {
          const isSelected = index === activeIndex;
          return (
            <button
              key={index}
              type="button"
              className="tab"
              role="tab"
              id={`${idBase}-tab-${index}`}
              aria-controls={`${idBase}-panel-${index}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              onClick={() => select(index)}
            >
              {tab.props.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => {
        const isSelected = index === activeIndex;
        return (
          <div
            key={index}
            className="tabs-panel"
            role="tabpanel"
            id={`${idBase}-panel-${index}`}
            aria-labelledby={`${idBase}-tab-${index}`}
            hidden={!isSelected}
          >
            {tab.props.children}
          </div>
        );
      })}
    </div>
  );
});
