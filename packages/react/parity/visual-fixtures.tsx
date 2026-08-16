// Real-browser visual-parity fixtures (agent-docs → planning-artifacts/visual-parity-implementation-waves.md
// §1). Deliberately SEPARATE from parity/fixtures.tsx: structural fixtures are tuned to what jsdom can
// serialise, these are tuned to what a browser can paint, and merging them would compromise both.
//
// This file is bundled TWICE by scripts/visual-parity.mjs: once for Node (react/react-dom external,
// only `name`/`html`/`classHtml`/`widths` are read) and once for the browser (react/react-dom inlined,
// so `element` can be mounted for real via createRoot — see that script for why a real client mount,
// not renderToStaticMarkup, is required for Icon/Code to paint their lazy-chunk effects).
import type { ReactElement } from "react";
import { Panel } from "../src/index";

export interface VisualCase {
  /** Fixture id; prefix with the tag so failures sort together. */
  name: string;
  /** Path A — light-DOM markup against the custom element. */
  html: string;
  /** Path C — the React equivalent, mounted live via createRoot. */
  element: ReactElement;
  /**
   * Path B — a TRUE hand-written class equivalent, or null when none exists yet.
   * Never a simplified illustration: if it is not literally equivalent, use null + reason.
   */
  classHtml: string | null;
  /** REQUIRED when classHtml is null: why, in one sentence. Printed in the run summary. */
  classGap?: string;
  /** Widths to shoot at. Defaults to [1280, 360]. */
  widths?: number[];
}

export const visualCases: VisualCase[] = [
  {
    name: "mosni-panel/default",
    html: `<mosni-panel><p>Body copy.</p></mosni-panel>`,
    element: (
      <Panel>
        <p>Body copy.</p>
      </Panel>
    ),
    classHtml: `<div class="panel"><p>Body copy.</p></div>`,
  },
];
