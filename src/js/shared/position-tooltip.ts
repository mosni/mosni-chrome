// Pure geometry, extracted verbatim (D-R8) from mosni-tooltip's #show so the custom element and the
// React <Tooltip> component share one implementation. BEHAVIOUR-PRESERVING extraction only - see
// tooltip.ts for the full history (this file introduces no new logic).
import type {
  RectLike,
  SizeLike,
  ViewportLike,
} from "./position-dropdown-menu";

export interface TipPosition {
  top: number;
  left: number;
}

const EDGE_OFFSET_PX = 6;

export function positionTooltip(
  anchorRect: RectLike,
  tipSize: SizeLike,
  viewport: ViewportLike,
): TipPosition {
  let top = anchorRect.top - tipSize.height - EDGE_OFFSET_PX;
  if (top < EDGE_OFFSET_PX) {
    top = anchorRect.bottom + EDGE_OFFSET_PX;
  }

  let left = anchorRect.left + (anchorRect.width - tipSize.width) / 2;
  const maxLeft = viewport.width - tipSize.width - EDGE_OFFSET_PX;
  left = Math.min(
    Math.max(left, EDGE_OFFSET_PX),
    Math.max(EDGE_OFFSET_PX, maxLeft),
  );

  return { top, left };
}
