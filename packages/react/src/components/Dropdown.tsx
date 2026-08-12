import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type {
  ComponentPropsWithoutRef,
  JSX,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from "react";
import { mergeClassName } from "../internal/merge-class-name";
import { positionDropdownMenu } from "../../../../src/js/shared/position-dropdown-menu";
import { ChevronDownGlyph, glyphs } from "../icons.generated";
import type { IconName } from "../icons.generated";
import type { DropdownItemProps } from "./DropdownItem";

export type DropdownProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "onSelect"
> & {
  label: string;
  /** A specific internal glyph name, or `true` for the default (`more-vertical`) - same as
   * dropdown.ts's `icon-only` attribute, restricted to the D-R7 internal glyph set (icons.ts's
   * `icon()` is itself typed to only those nine; a name outside it was never actually safe on the
   * custom-element side either, so this is more honest, not more restrictive). */
  iconOnly?: IconName | true;
  onSelect?: (value: string) => void;
  children: ReactElement<DropdownItemProps> | ReactElement<DropdownItemProps>[];
};

// D-R8: positionDropdownMenu is the SAME pure function dropdown.ts calls - this component only
// re-expresses the surrounding choreography (open/close, outside-click, scroll-close-if-moved,
// Escape, roving arrow-key focus) in hook idiom. Every timing/ordering decision below is copied
// deliberately from dropdown.ts's own comments, not re-derived - see that file for the full bug
// history (mobile scroll-close races, position: fixed vs. scrollable-ancestor clipping).
export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  function Dropdown(
    { label, iconOnly, onSelect, children, className, ...rest },
    ref,
  ): JSX.Element {
    const id = useId();
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<
      { position: "fixed"; top: number; left: number } | undefined
    >(undefined);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const triggerRectAtOpen = useRef<{ top: number; left: number } | undefined>(
      undefined,
    );

    const items = Children.toArray(children).filter(
      isValidElement,
    ) as ReactElement<DropdownItemProps>[];

    const close = (): void => {
      setOpen(false);
      setMenuStyle(undefined);
      triggerRectAtOpen.current = undefined;
      triggerRef.current?.focus();
    };

    const select = (value: string): void => {
      onSelect?.(value);
      close();
    };

    // Position + focus the first enabled item, mirrors dropdown.ts's #open() - recomputed on
    // every open since the trigger may have moved since the menu last closed.
    useEffect(() => {
      if (!open) return;
      const menu = menuRef.current;
      const trigger = triggerRef.current;
      if (!menu || !trigger) return;
      const rect = trigger.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        ...positionDropdownMenu(
          rect,
          { width: menu.offsetWidth, height: menu.offsetHeight },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      });
      triggerRectAtOpen.current = { top: rect.top, left: rect.left };
      // preventScroll: true - the menu is already placed fully within the viewport, so focus() has
      // nothing legitimate to scroll for (dropdown.ts's own comment on this still applies).
      itemRefs.current
        .find((button) => button && !button.disabled)
        ?.focus({ preventScroll: true });
    }, [open]);

    // Outside pointerdown + scroll-close-if-the-trigger-actually-moved, both deferred one tick so
    // the SAME click that opened the menu (still bubbling toward document) doesn't immediately
    // close it again - dropdown.ts defers for exactly this reason.
    useEffect(() => {
      if (!open) return;
      let detach: (() => void) | undefined;
      const timer = window.setTimeout(() => {
        const onOutsideClick = (event: PointerEvent): void => {
          const target = event.target;
          if (
            target instanceof Node &&
            (triggerRef.current?.contains(target) ||
              menuRef.current?.contains(target))
          )
            return;
          close();
        };
        // A scroll EVENT firing is not proof the trigger actually moved (dropdown.ts's #onScroll
        // comment, verbatim reasoning) - only a scroll that measurably moved the trigger closes.
        const onScroll = (): void => {
          const trigger = triggerRef.current;
          const baseline = triggerRectAtOpen.current;
          if (!trigger || !baseline) {
            close();
            return;
          }
          const rect = trigger.getBoundingClientRect();
          if (
            Math.abs(rect.top - baseline.top) < 2 &&
            Math.abs(rect.left - baseline.left) < 2
          )
            return;
          close();
        };
        document.addEventListener("pointerdown", onOutsideClick);
        window.addEventListener("scroll", onScroll, {
          capture: true,
          passive: true,
        });
        detach = () => {
          document.removeEventListener("pointerdown", onOutsideClick);
          window.removeEventListener("scroll", onScroll, { capture: true });
        };
      }, 0);
      return () => {
        window.clearTimeout(timer);
        detach?.();
      };
    }, [open]);

    const onRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== "Escape" || !open) return;
      event.stopPropagation();
      close();
    };

    const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const enabled = itemRefs.current.filter(
        (button): button is HTMLButtonElement => !!button && !button.disabled,
      );
      if (enabled.length === 0) return;
      event.preventDefault();
      const current = enabled.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next =
        ((current === -1 ? 0 : current) + delta + enabled.length) %
        enabled.length;
      enabled[next]?.focus();
    };

    // icon-only: just the named glyph (defaulting to "more-vertical"), no visible text - label
    // moves to aria-label instead. Otherwise: text + chevron-down, unchanged from before icon-only
    // existed. Mirrors dropdown.ts's #applyTriggerContent exactly.
    const IconGlyph = iconOnly
      ? glyphs[iconOnly === true ? "more-vertical" : iconOnly]
      : undefined;

    return (
      <div
        className={mergeClassName("dropdown", className)}
        ref={ref}
        onKeyDown={onRootKeyDown}
        {...rest}
      >
        <button
          type="button"
          id={`${id}-trigger`}
          className={
            iconOnly
              ? "dropdown-trigger dropdown-trigger-icon"
              : "dropdown-trigger"
          }
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={id}
          aria-label={iconOnly ? label : undefined}
          ref={triggerRef}
          onClick={() => setOpen((was) => !was)}
        >
          {IconGlyph ? (
            <IconGlyph size={20} />
          ) : (
            <>
              {label}
              <ChevronDownGlyph size={16} />
            </>
          )}
        </button>
        <div
          className="dropdown-menu"
          id={id}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          hidden={!open}
          ref={menuRef}
          style={menuStyle}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, index) =>
            cloneElement(
              item,
              // cloneElement's config type is `Partial<P> & Attributes`, and `Attributes` (unlike
              // the props of a host element) has no `ref` field for an arbitrary forwardRef
              // component - cast narrowly rather than losing the `onClick`/`key` typing above it.
              {
                key: index,
                ref: (node: HTMLButtonElement | null) => {
                  itemRefs.current[index] = node;
                },
                onClick: () => select(item.props.value),
              } as Partial<DropdownItemProps> & {
                key: number;
                ref: (node: HTMLButtonElement | null) => void;
              },
            ),
          )}
        </div>
      </div>
    );
  },
);
