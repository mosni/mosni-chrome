import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, JSX } from "react";
import { mergeClassName } from "../internal/merge-class-name";

// The mosni mark, matching mosni-logo's rendered markup exactly: `span.mosni-logo > img`. The
// custom element resolves its image URL against `document.currentScript`'s own origin (see
// assetBase in base-element.ts) so it works from whatever host serves mosnicat.js; a React consumer
// has no such script tag to read, so this is a fixed default instead (§4's component table) -
// pointed at ui.mosni.dev, the same place the tarball itself is distributed from (D-R5).
const ASSET_BASE = "https://ui.mosni.dev/";

export type LogoProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  alt?: string;
};

// forwardRef, not a plain `ref` prop: `react >= 18` is the peerDependency (D-R4) and React 18 has no
// ref-as-a-normal-prop support (React 19 only) - forwardRef is the form that works on both.
export const Logo = forwardRef<HTMLSpanElement, LogoProps>(function Logo(
  { alt = "mosni", className, ...rest },
  ref,
): JSX.Element {
  return (
    <span
      className={mergeClassName("mosni-logo", className)}
      ref={ref}
      {...rest}
    >
      <img src={`${ASSET_BASE}mosni.svg`} alt={alt} />
    </span>
  );
});
