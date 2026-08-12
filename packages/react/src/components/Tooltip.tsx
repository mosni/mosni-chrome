import {
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  JSX,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { positionTooltip } from "../../../../src/js/shared/position-tooltip";

export interface TooltipProps {
  /** Plain text tip. Ignored once `tip` is given, same as tooltip.ts's `text` attribute being
   * ignored once a `slot="tip"` child is used. */
  text?: string;
  /** Rich tip content, overrides `text` - the slot-prop split from §3. */
  tip?: ReactNode;
  /** The anchor - a single element, cloned to receive the hover/focus/touch wiring and
   * `aria-describedby`. Mirrors tooltip.ts reading `:scope > *` as its one anchor child. */
  children: ReactElement;
}

// No host wrapper: mosni-tooltip is `display: contents` and never classes itself (D-R11 - a host
// reset, no twin), and its tip lives on document.body regardless (D-R8's positionTooltip, shared
// verbatim with tooltip.ts - see that file for the full flip/clamp history). React returns the
// (cloned) anchor and a portalled tip as two top-level nodes via a Fragment, exactly mirroring
// "the host contributes no box of its own" - there is nothing here for D-R1 to re-introduce.
//
// No parity.mjs fixture for the same structural reason as <Modal> (react-plan.md §10): the tip is
// portalled, and react-dom/server throws on a portal with no real document.body to attach to -
// `mounted` guards the same way. scripts/react-behaviour.mjs (§5.2) verifies hover-show and the
// unmount-removes-tip-and-listener cleanup against a live DOM instead.
export const Tooltip = forwardRef<Element, TooltipProps>(function Tooltip(
  { text, tip, children },
  forwardedRef,
): JSX.Element {
  const id = useId();
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(forwardedRef, () => anchorRef.current as Element);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const showTimer = useRef<number | undefined>(undefined);

  const hide = (): void => {
    if (showTimer.current !== undefined) {
      window.clearTimeout(showTimer.current);
      showTimer.current = undefined;
    }
    setVisible(false);
  };

  // SHOW_DELAY_MS in tooltip.ts is 0, but it is still a deferred macrotask, not an immediate
  // set - kept identical here rather than "simplified" to a direct setVisible(true).
  const scheduleShow = (): void => {
    if (showTimer.current !== undefined) return;
    showTimer.current = window.setTimeout(() => {
      showTimer.current = undefined;
      setVisible(true);
    }, 0);
  };

  // Outside-tap dismiss (touch has no hover-leave equivalent) - a document-level listener, torn
  // down on unmount/re-registration exactly like tooltip.ts's disconnectedCallback guards against:
  // without this, every discarded tooltip would leak one document listener forever.
  useEffect(() => {
    const onOutsideTap = (event: PointerEvent): void => {
      if (event.pointerType !== "touch" || !visible) return;
      const target = event.target;
      if (
        target instanceof Node &&
        (anchorRef.current?.contains(target) ||
          tipRef.current?.contains(target))
      )
        return;
      hide();
    };
    document.addEventListener("pointerdown", onOutsideTap);
    return () => document.removeEventListener("pointerdown", onOutsideTap);
  }, [visible]);

  // Positioned only once the tip is actually in the DOM and measurable - mirrors tooltip.ts's
  // #show, which reads getBoundingClientRect only after `tip.hidden = false`.
  useLayoutEffect(() => {
    if (!visible) return;
    const anchor = anchorRef.current;
    const tipEl = tipRef.current;
    if (!anchor || !tipEl) return;
    setPosition(
      positionTooltip(
        anchor.getBoundingClientRect(),
        tipEl.getBoundingClientRect(),
        {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      ),
    );
  }, [visible]);

  const anchorElement = children as ReactElement<Record<string, unknown>>;
  const clonedAnchor = cloneElement(anchorElement, {
    ref: anchorRef,
    "aria-describedby": id,
    onMouseEnter: scheduleShow,
    onMouseLeave: hide,
    onFocus: scheduleShow,
    onBlur: hide,
    // Gated on pointerType so this never fires for a mouse click (already covered by hover) or a
    // keyboard activation (already covered by focus) - matches tooltip.ts's own guard exactly.
    onPointerUp: (event: ReactPointerEvent) => {
      if (event.pointerType !== "touch") return;
      setVisible((was) => !was);
    },
  });

  return (
    <>
      {clonedAnchor}
      {mounted &&
        createPortal(
          <div
            className="tooltip"
            role="tooltip"
            id={id}
            hidden={!visible}
            ref={tipRef}
            style={
              visible ? { top: position.top, left: position.left } : undefined
            }
          >
            {tip ?? text ?? ""}
          </div>,
          document.body,
        )}
    </>
  );
});
