import { forwardRef, useEffect, useRef, useState } from "react";
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { XGlyph } from "../icons.generated";

export interface LightboxProps {
  src: string;
  alt?: string;
  /** Full-resolution src for the overlay; defaults to `src` (the thumbnail's own), same as
   * lightbox.ts's `full` attribute defaulting to `thumb.src`. */
  full?: string;
  caption?: string;
}

// Unlike <Modal>, the overlay dialog here is built LAZILY - only once the thumbnail is clicked,
// exactly mirroring lightbox.ts's own `open()` (the dialog does not exist at all until then). That
// means, unlike Modal/Tooltip, there is nothing eagerly portalled at mount: the default (unclicked)
// render has no dialog on either the custom-element or the React side, so THIS component keeps a
// real parity.mjs fixture for its default state (react-plan.md §10 explains why Modal/Tooltip
// cannot).
export const Lightbox = forwardRef<HTMLImageElement, LightboxProps>(
  function Lightbox({ src, alt = "", full, caption }, ref): JSX.Element {
    const [open, setOpen] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
      if (open) dialogRef.current?.showModal();
    }, [open]);

    // Both dismissal paths call the native dialog.close(), same single path modal.ts/lightbox.ts
    // both use - the "close" event handler below is the one place that resets React state.
    const requestClose = (): void => {
      dialogRef.current?.close();
    };

    return (
      <>
        <img
          className="lightbox-thumb"
          src={src}
          alt={alt}
          ref={ref}
          onClick={() => setOpen(true)}
        />
        {open &&
          createPortal(
            <dialog
              className="lightbox"
              ref={dialogRef}
              onClose={() => setOpen(false)}
              onPointerDown={(event: ReactPointerEvent<HTMLDialogElement>) => {
                if (event.target === event.currentTarget) requestClose();
              }}
            >
              <img src={full ?? src} alt="" />
              {caption && <p className="lightbox-caption">{caption}</p>}
              <button
                type="button"
                className="lightbox-close"
                aria-label="Close"
                onClick={requestClose}
              >
                <XGlyph size={20} />
              </button>
            </dialog>,
            document.body,
          )}
      </>
    );
  },
);
