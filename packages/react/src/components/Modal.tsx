import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { JSX, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { mergeClassName } from "../internal/merge-class-name";
import { XGlyph } from "../icons.generated";

export interface ModalProps {
  open?: boolean;
  defaultOpen?: boolean;
  heading?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
  className?: string;
}

// D-R1 exception aside (LoginButton), this is the component furthest from a plain markup mirror:
// modal.ts's dialog is a genuine `<dialog>`, portalled to document.body so it never fights an
// ancestor's stacking/overflow context, exactly the reasoning dropdown.ts's own position: fixed
// comment gives for the SAME problem. Portals cannot render during SSR (there is no document.body
// to attach to; react-dom/server throws on the attempt) - `mounted` guards that: false on the
// server and on the very first client render, flipping true in an effect, matching §4's "SSR
// renders nothing" note. This is also WHY Modal has no parity.mjs fixture (react-plan.md §10): the
// custom element renders its dialog eagerly and unconditionally, but React's side would be "no
// markup at all" under renderToStaticMarkup, and the harness treats that as a fixture error rather
// than a comparable empty state. scripts/react-behaviour.mjs (§5.2) verifies the real behaviour
// against a live DOM, where portals render normally.
export const Modal = forwardRef<HTMLDialogElement, ModalProps>(function Modal(
  { open, defaultOpen = false, heading, footer, onClose, children, className },
  ref,
): JSX.Element | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current as HTMLDialogElement);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  // Mirrors modal.ts's attributeChangedCallback exactly: showModal()/close() drive the native
  // top-layer state, the prop is a REQUEST, never a direct DOM attribute flip.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Both dismissal paths (close button, backdrop pointerdown) call the NATIVE dialog.close() -
  // same single path modal.ts's own `this.close()` uses for both - so there is exactly one place
  // (the "close" event handler below) that reflects the result back into React state and fires
  // onClose, instead of two call sites that could drift.
  const requestClose = (): void => {
    dialogRef.current?.close();
  };

  if (!mounted) return null;

  return createPortal(
    <dialog
      className={mergeClassName("modal", className)}
      ref={dialogRef}
      onPointerDown={(event: ReactPointerEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      onClose={() => {
        if (!isControlled) setUncontrolledOpen(false);
        onClose?.();
      }}
    >
      <button
        type="button"
        className="modal-close"
        aria-label="Close"
        onClick={requestClose}
      >
        <XGlyph size={20} />
      </button>
      <h1 className="modal-heading">{heading}</h1>
      <div className="modal-body">{children}</div>
      <div className="modal-footer">{footer}</div>
    </dialog>,
    document.body,
  );
});
