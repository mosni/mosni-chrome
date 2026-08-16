// Pure geometry, extracted verbatim (D-R8) from mosni-dropdown's #positionMenu so the custom
// element and the React <Dropdown> component share one implementation instead of two copies that
// can drift. This is a BEHAVIOUR-PRESERVING extraction only — the math below is exactly what
// dropdown.ts computed inline before this file existed; do not "improve" it here. See dropdown.ts's
// #positionMenu for the full history/rationale (scrollable-ancestor clipping, flip-up when the
// trigger is near the bottom of the viewport).
export interface RectLike {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface SizeLike {
  width: number;
  height: number;
}

export interface ViewportLike {
  width: number;
  height: number;
}

export interface MenuPosition {
  top: number;
  left: number;
}

const GAP_PX = 6;
const EDGE_PX = 8;

export function positionDropdownMenu(
  triggerRect: RectLike,
  menuSize: SizeLike,
  viewport: ViewportLike,
): MenuPosition {
  const left = Math.min(
    triggerRect.left,
    viewport.width - menuSize.width - EDGE_PX,
  );
  // A trigger near the bottom of the viewport can leave no room to open downward - position: fixed
  // means there is no scrolling it into view the way a normal-flow element would, so a menu that
  // doesn't fit below the trigger opens ABOVE it instead.
  const fitsBelow =
    triggerRect.bottom + GAP_PX + menuSize.height <= viewport.height;
  const top = fitsBelow
    ? triggerRect.bottom + GAP_PX
    : Math.max(EDGE_PX, triggerRect.top - menuSize.height - GAP_PX);
  return { top, left: Math.max(EDGE_PX, left) };
}
