import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ComponentPropsWithoutRef, JSX } from "react";
import { loadChunk } from "../../../../src/js/shared/load-chunk";

declare global {
  interface Window {
    mosniIcons?: { create: (name: string, size: number) => SVGElement | null };
  }
}

// icon.ts resolves this against document.currentScript's own origin; fixed here for the same
// reason <Logo>/<Code> hard-code theirs (no script tag for a React consumer to read).
const ICON_CHUNK_URL = "https://ui.mosni.dev/mosnicat-icons.js";

export type IconProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  name: string;
  size?: number;
};

// No default className (react-plan.md §10): icon.ts never adds a class to its own host either -
// confirmed against the built element directly, `<mosni-icon>` stays classless even once painted -
// so a React-only "mosni-icon" class here would be inventing styling hook that no SCSS rule backs.
// Lazy, via the SAME public icon chunk loadChunk (D-R8) icon.ts uses; SSR (and the very first
// client render, before the effect runs) renders the empty span - the glyph is a client-only paint,
// same as icon.ts's own `pending` queue while the chunk loads.
export const Icon = forwardRef<HTMLSpanElement, IconProps>(function Icon(
  { name, size = 20, className, ...rest },
  forwardedRef,
): JSX.Element {
  const spanRef = useRef<HTMLSpanElement>(null);
  useImperativeHandle(forwardedRef, () => spanRef.current as HTMLSpanElement);

  useEffect(() => {
    let cancelled = false;
    // Inserts the raw SVGElement mosniIcons.create() returns directly, imperatively - not
    // converted to JSX, so this is byte-for-byte the same element icon.ts's own paint() produces,
    // not a re-implementation that could drift from it.
    const paint = (): void => {
      if (cancelled || !spanRef.current) return;
      const svg = window.mosniIcons?.create(name, size);
      if (svg) spanRef.current.replaceChildren(svg);
    };
    if (window.mosniIcons) {
      paint();
    } else {
      loadChunk(ICON_CHUNK_URL)
        .then(paint)
        .catch(() => {
          /* the chunk failed to load - icon stays unpainted, same fallback icon.ts has */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [name, size]);

  return <span ref={spanRef} className={className} {...rest} />;
});
