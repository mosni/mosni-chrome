// Real-browser visual-parity fixtures (agent-docs → planning-artifacts/visual-parity-implementation-waves.md
// §1). Deliberately SEPARATE from parity/fixtures.tsx: structural fixtures are tuned to what jsdom can
// serialise, these are tuned to what a browser can paint, and merging them would compromise both.
//
// This file is bundled TWICE by scripts/visual-parity.mjs: once for Node (react/react-dom external,
// only `name`/`html`/`classHtml`/`widths` are read) and once for the browser (react/react-dom inlined,
// so `element` can be mounted for real via createRoot — see that script for why a real client mount,
// not renderToStaticMarkup, is required for Icon/Code to paint their lazy-chunk effects).
import type { ReactElement } from "react";
import {
  Accordion,
  AccordionItem,
  Chips,
  Code,
  Dropdown,
  DropdownItem,
  Field,
  Footer,
  Header,
  Icon,
  Layout,
  Lightbox,
  Logo,
  Menu,
  MenuItem,
  Modal,
  Panel,
  Slider,
  Switch,
  Tab,
  Tabs,
  Tooltip,
} from "../src/index";

// Renders the SAME markup icons.generated.tsx's <XGlyph> components do, byte-for-byte (path data
// copied from that file) — used only to hand-author a true class-path SVG for fixtures whose
// generated icon a real consumer would have to type out themselves (mosnicat has no bare-classes
// icon primitive; the curated set is component-internal, D-24).
function svgIcon(paths: string[], size = 20): string {
  const d = paths.map((p) => `<path d="${p}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
const MENU_ICON = svgIcon(["M4 5h16", "M4 12h16", "M4 19h16"]);
const CHEVRON_DOWN_ICON = svgIcon(["m6 9 6 6 6-6"], 16);
const X_ICON = svgIcon(["M18 6 6 18", "m6 6 12 12"]);
// MoreVerticalGlyph uses <circle> elements, not <path> — svgIcon() only emits paths, so this is
// written out directly to stay byte-for-byte identical.
const MORE_VERTICAL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;

// Matches switch.ts's generated markup exactly (label.switch > input + span.switch-visual >
// span.switch-thumb, then the label text) — reused for the standalone Switch fixture and for
// Chips's per-option rows, which chips.ts composes from the same primitive.
function switchHtml(label: string, checked: boolean): string {
  return (
    `<label class="switch"><input type="checkbox"${checked ? " checked" : ""}>` +
    `<span class="switch-visual"><span class="switch-thumb"></span></span>${label}</label>`
  );
}

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
  /**
   * For portal components (Modal, Tooltip): a CSS selector for the real subject once it exists
   * ANYWHERE on the page, not just inside the mount container — both paths portal their open
   * content to document.body. When set, each path renders on its OWN navigation (there is only
   * ever one portal target on a page at a time) instead of sharing one page with the other paths.
   */
  subjectSelector?: string;
  /** Portal-only: a selector (scoped within the mount container) to dispatch `revealEvent` on
   * before screenshotting — for subjects with no open/defaultOpen prop, only a real hover/focus
   * trigger (Tooltip). Defaults to "mouseenter" when unset. */
  revealSelector?: string;
  revealEvent?: string;
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

  // --- Structural group ---------------------------------------------------------------------

  {
    name: "mosni-logo/default",
    html: `<mosni-logo alt="mosni"></mosni-logo>`,
    element: <Logo alt="mosni" />,
    classHtml: `<span class="mosni-logo"><img src="/mosni.svg" alt="mosni"></span>`,
  },
  {
    name: "mosni-header/brand-accent-tagline",
    html: `<mosni-header brand="MOSNI'S" accent="HEADER" tagline="hello"></mosni-header>`,
    element: <Header brand="MOSNI'S" accent="HEADER" tagline="hello" />,
    classHtml: `<header class="header"><a href="/"><div class="header-brand"><span class="mosni-logo"><img src="/mosni.svg" alt="mosni"></span><div class="brand">MOSNI'S <span class="purple">HEADER</span></div></div></a><div class="little-link">hello</div></header>`,
  },
  {
    name: "mosni-footer/default",
    html: `<mosni-footer>made with love<a slot="links" href="https://mosni.dev">mosni.dev</a></mosni-footer>`,
    element: (
      <Footer links={<a href="https://mosni.dev">mosni.dev</a>}>
        made with love
      </Footer>
    ),
    classHtml: `<footer class="footer"><div class="footer-left">made with love</div><div class="footer-links"><a href="https://mosni.dev">mosni.dev</a></div></footer>`,
  },
  {
    name: "mosni-menu/with-items",
    html: `<mosni-menu label="Sections"><mosni-menu-item title="One" href="#one" selected></mosni-menu-item><mosni-menu-item title="Two" subtitle="second" href="#two"></mosni-menu-item></mosni-menu>`,
    element: (
      <Menu label="Sections">
        <MenuItem title="One" href="#one" selected />
        <MenuItem title="Two" subtitle="second" href="#two" />
      </Menu>
    ),
    classHtml: `<nav class="menu" role="navigation" aria-label="Sections"><a class="menu-entry selected" href="#one" aria-current="page"><span class="menu-entry-title">One</span></a><a class="menu-entry" href="#two"><span class="menu-entry-title">Two</span><span class="menu-entry-subtitle">second</span></a></nav>`,
  },
  {
    name: "mosni-layout/full-frame",
    html: `<mosni-layout><mosni-header slot="header" brand="B" tagline="t"></mosni-header><mosni-menu slot="menu" label="Sections"><mosni-menu-item title="One" href="#one" selected></mosni-menu-item></mosni-menu><p>main</p><mosni-footer slot="footer">left</mosni-footer></mosni-layout>`,
    element: (
      <Layout
        header={<Header brand="B" tagline="t" />}
        menu={
          <Menu label="Sections">
            <MenuItem title="One" href="#one" selected />
          </Menu>
        }
        footer={<Footer>left</Footer>}
      >
        <p>main</p>
      </Layout>
    ),
    classHtml: `<div class="layout"><header class="header"><a href="/"><div class="header-brand"><span class="mosni-logo"><img src="/mosni.svg" alt="mosni"></span><div class="brand">B</div></div></a><div class="little-link">t</div></header><div class="layout-menu"><nav class="menu" role="navigation" aria-label="Sections"><a class="menu-entry selected" href="#one" aria-current="page"><span class="menu-entry-title">One</span></a></nav></div><main class="layout-main"><p>main</p><footer class="footer"><div class="footer-left">left</div><div class="footer-links"></div></footer></main><button type="button" class="layout-burger" aria-label="Toggle menu" aria-expanded="false">${MENU_ICON}</button></div>`,
  },
  {
    name: "mosni-accordion/exclusive",
    html: `<mosni-accordion exclusive><details><summary>First</summary><p>One</p></details><details open><summary>Second</summary><p>Two</p></details></mosni-accordion>`,
    element: (
      <Accordion exclusive>
        <AccordionItem summary="First">
          <p>One</p>
        </AccordionItem>
        <AccordionItem summary="Second" defaultOpen>
          <p>Two</p>
        </AccordionItem>
      </Accordion>
    ),
    // mosni-accordion styles itself via a bare TAG selector (`mosni-accordion { … }` in
    // _accordion.scss), so the D-R11 twin is the `.accordion` class here.
    classHtml: `<div class="accordion"><details name="mosni-accordion-visual"><summary>First${CHEVRON_DOWN_ICON}</summary><p>One</p></details><details name="mosni-accordion-visual" open><summary>Second${CHEVRON_DOWN_ICON}</summary><p>Two</p></details></div>`,
  },
  {
    name: "mosni-tabs/two-tabs",
    html: `<mosni-tabs><mosni-tab label="One"><p>one</p></mosni-tab><mosni-tab label="Two" selected><p>two</p></mosni-tab></mosni-tabs>`,
    element: (
      <Tabs defaultSelectedIndex={1}>
        <Tab label="One">
          <p>one</p>
        </Tab>
        <Tab label="Two">
          <p>two</p>
        </Tab>
      </Tabs>
    ),
    classHtml: `<div class="tabs"><div class="tabs-bar" role="tablist"><button type="button" class="tab" role="tab" aria-selected="false" tabindex="-1">One</button><button type="button" class="tab" role="tab" aria-selected="true" tabindex="0">Two</button></div><div class="tabs-panel" role="tabpanel" hidden><p>one</p></div><div class="tabs-panel" role="tabpanel"><p>two</p></div></div>`,
  },

  // --- Form group -----------------------------------------------------------------------------

  {
    name: "mosni-field/default",
    html: `<mosni-field label="Email" type="email" name="email"></mosni-field>`,
    element: <Field label="Email" type="email" name="email" />,
    classHtml: `<div class="field"><label class="field-label" for="field-demo">Email</label><input type="email" id="field-demo" name="email"></div>`,
  },
  {
    name: "mosni-field/error",
    html: `<mosni-field label="Name" required error="This field is required"></mosni-field>`,
    element: <Field label="Name" required error="This field is required" />,
    classHtml: `<div class="field error"><label class="field-label" for="field-error-demo">Name<span class="field-req">*</span></label><input type="text" id="field-error-demo" required aria-invalid="true"><p class="field-error">This field is required</p></div>`,
  },
  {
    name: "mosni-switch/checked",
    html: `<mosni-switch label="Notifications" checked></mosni-switch>`,
    element: <Switch label="Notifications" defaultChecked />,
    classHtml: switchHtml("Notifications", true),
  },
  {
    name: "mosni-switch/unchecked",
    html: `<mosni-switch label="Notifications"></mosni-switch>`,
    element: <Switch label="Notifications" />,
    classHtml: switchHtml("Notifications", false),
  },
  {
    // chips.ts derives each option's displayed label from the checkbox's VALUE when present
    // (falling back to the <label> text only if value is empty — Chips.tsx's own header comment
    // documents this "value-first" quirk). Value and label are kept identical here on purpose so
    // the fixture does not exercise that quirk; React's explicit {value,label} pairs already keep
    // the two independent, so this is purely about matching the element path's real behaviour.
    name: "mosni-chips/with-selection",
    html: `<mosni-chips label="Roles"><label><input type="checkbox" value="Read" checked>Read</label><label><input type="checkbox" value="Write">Write</label><label><input type="checkbox" value="Admin" checked>Admin</label></mosni-chips>`,
    element: (
      <Chips
        label="Roles"
        options={[
          { value: "Read", label: "Read" },
          { value: "Write", label: "Write" },
          { value: "Admin", label: "Admin" },
        ]}
        defaultValue={["Read", "Admin"]}
      />
    ),
    classHtml: `<div class="chips"><span class="chips-label">Roles</span><div class="chips-selected"><span class="chip"><span class="chip-text">Read</span><button type="button" class="chip-x" aria-label="Remove Read">×</button></span><span class="chip"><span class="chip-text">Admin</span><button type="button" class="chip-x" aria-label="Remove Admin">×</button></span></div><div class="chips-options" style="max-height: 13rem">${switchHtml("Read", true)}${switchHtml("Write", false)}${switchHtml("Admin", true)}</div></div>`,
  },
  {
    name: "mosni-slider/labelled",
    html: `<mosni-slider stops="A|B|C" value="1" label="Pick one"></mosni-slider>`,
    element: (
      <Slider stops={["A", "B", "C"]} defaultValue={1} label="Pick one" />
    ),
    classHtml: `<div class="slider"><label class="slider-label" for="slider-demo">Pick one</label><div class="slider-track-wrap"><input type="range" class="slider-input" id="slider-demo" min="0" max="2" step="1" aria-label="Pick one" aria-valuetext="B" value="1"><div class="slider-ticks" aria-hidden="true"><span class="slider-tick"></span><span class="slider-tick"></span><span class="slider-tick"></span></div><div class="slider-ends" aria-hidden="true"><span class="slider-end slider-end-start">A</span><span class="slider-end slider-end-end">C</span></div></div><div class="slider-readout" aria-hidden="true">B</div></div>`,
  },

  // --- Overlay group ----------------------------------------------------------------------------
  //
  // mosni-toast/<Toast> is deliberately NOT covered here (nor by structural parity.mjs): both
  // paths render nothing of their own (Toast returns null) and delegate to the SAME shared
  // window.mosni.toast() host function on mount - there is no per-path static subject to compare,
  // only a mount-time side effect, which scripts/react-behaviour.mjs already exercises.

  {
    name: "mosni-dropdown/default",
    html: `<mosni-dropdown label="Actions"><mosni-dropdown-item value="edit">Edit</mosni-dropdown-item><mosni-dropdown-item value="delete" variant="danger">Delete</mosni-dropdown-item></mosni-dropdown>`,
    element: (
      <Dropdown label="Actions">
        <DropdownItem value="edit">Edit</DropdownItem>
        <DropdownItem value="delete" variant="danger">
          Delete
        </DropdownItem>
      </Dropdown>
    ),
    // The menu's runtime position (dropdown.ts's positionDropdownMenu) is only computed on open,
    // so it never affects this CLOSED-state fixture - [hidden] keeps it out of the static comparison.
    classHtml: `<div class="dropdown"><button type="button" class="dropdown-trigger" id="dropdown-demo-trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="dropdown-demo">Actions${CHEVRON_DOWN_ICON}</button><div class="dropdown-menu" id="dropdown-demo" role="menu" aria-labelledby="dropdown-demo-trigger" hidden><button type="button" class="dropdown-item" role="menuitem" tabindex="-1">Edit</button><button type="button" class="dropdown-item dropdown-item-danger" role="menuitem" tabindex="-1">Delete</button></div></div>`,
  },
  {
    name: "mosni-dropdown/icon-only",
    html: `<mosni-dropdown label="More" icon-only><mosni-dropdown-item value="edit">Edit</mosni-dropdown-item></mosni-dropdown>`,
    element: (
      <Dropdown label="More" iconOnly>
        <DropdownItem value="edit">Edit</DropdownItem>
      </Dropdown>
    ),
    classHtml: `<div class="dropdown"><button type="button" class="dropdown-trigger dropdown-trigger-icon" id="dropdown-icon-demo-trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="dropdown-icon-demo" aria-label="More">${MORE_VERTICAL_ICON}</button><div class="dropdown-menu" id="dropdown-icon-demo" role="menu" aria-labelledby="dropdown-icon-demo-trigger" hidden><button type="button" class="dropdown-item" role="menuitem" tabindex="-1">Edit</button></div></div>`,
  },
  {
    // Default (unclicked) state only — the overlay dialog is built lazily on click, on both
    // paths, so unlike Modal/Tooltip there is nothing eagerly portalled to compare here.
    name: "mosni-lightbox/default",
    html: `<mosni-lightbox><img src="/mosni.svg" alt="Preview"></mosni-lightbox>`,
    element: <Lightbox src="/mosni.svg" alt="Preview" />,
    classHtml: `<img class="lightbox-thumb" src="/mosni.svg" alt="Preview">`,
  },
  {
    // Portal: both paths append the real dialog to document.body, not inside their mount
    // container — subjectSelector finds it wherever it lands (see the harness's portal-fixture
    // path).
    name: "mosni-modal/open",
    html: `<mosni-modal open heading="Sign in"><p>Body copy.</p></mosni-modal>`,
    element: (
      <Modal defaultOpen heading="Sign in">
        <p>Body copy.</p>
      </Modal>
    ),
    // `.modal`'s CSS (position:fixed; inset:0; margin:auto) is itself pure and reproducible with
    // classes alone — a plain `<dialog class="modal" open>` + `autofocus` (to match showModal()'s
    // native "focus the first focusable descendant") gets structurally and visually VERY close.
    // What remains is not CSS: calling the real showModal() engages the browser's own top-layer
    // semantics (a real ::backdrop, and — confirmed empirically at 360px, a consistent ~4px width
    // difference matching a scrollbar-gutter reservation showModal()'s scroll-lock adds and a plain
    // `open` attribute does not) that measurably shifts the fixed-position centering math by a
    // sub-pixel amount, visible as edge/border anti-aliasing drift under a zero-tolerance
    // comparison. A hand-typed dialog cannot engage that without calling showModal() itself, which
    // would no longer be "hand-typed markup" in any meaningful sense — the same class of gap as
    // Tooltip below, just CSS-adjacent rather than position-adjacent.
    classHtml: null,
    classGap:
      "showModal()'s native top-layer semantics (real ::backdrop, scroll-lock/scrollbar-gutter reservation) measurably shift the fixed-position centering math versus a plain `open` attribute; reproducing it exactly would require calling showModal() itself, which a hand-typed class markup cannot do",
    subjectSelector: "dialog.modal",
  },
  {
    // Portal + runtime position: tooltip.ts/Tooltip.tsx both compute top/left from the anchor's
    // and tip's MEASURED rects (positionTooltip, D-R8) once the tip is shown — there is no way to
    // hand-type that position without running the same JS, so this is a genuine classGap, the
    // same shape as Toast's "inherently behavioural" exclusion (W3-2). revealSelector triggers the
    // real hover path (there is no open/defaultOpen prop; both paths are purely event-driven).
    name: "mosni-tooltip/open",
    html: `<mosni-tooltip text="Helpful tip"><button type="button">Hover me</button></mosni-tooltip>`,
    element: (
      <Tooltip text="Helpful tip">
        <button type="button">Hover me</button>
      </Tooltip>
    ),
    classHtml: null,
    classGap:
      "the tip's position is computed at runtime from the anchor's and tip's measured rects (positionTooltip, D-R8); a hand-typed position cannot be derived without running the same JS",
    subjectSelector: ".tooltip",
    revealSelector: "button",
  },

  // --- Lazy-chunk group -------------------------------------------------------------------------
  //
  // Both real subjects here (a painted icon, real Prism highlighting) exist ONLY because Path C is
  // mounted live via createRoot (see the file header) — under renderToStaticMarkup, both would show
  // the exact same blank/unhighlighted state the docs page's static preview does today.

  {
    name: "mosni-icon/default",
    html: `<mosni-icon name="rocket"></mosni-icon>`,
    element: <Icon name="rocket" />,
    // No bare-classes icon primitive exists (D-24: the curated Lucide set is component-internal) -
    // the only non-React way to render a mosnicat icon IS the custom element, which is already
    // path A. There is nothing further "hand-typed" to compare it against.
    classHtml: null,
    classGap:
      "mosnicat has no bare-classes icon primitive (D-24 scope guard); <mosni-icon> is itself the only non-React rendering path, already covered as path A",
  },
  {
    name: "mosni-code/default",
    html: `<mosni-code language="ts">const x = 1;</mosni-code>`,
    element: <Code language="ts">{"const x = 1;"}</Code>,
    // The surrounding chrome (header, copy button) is hand-typeable, but the highlighted
    // `.token` spans inside <code> exist only once the lazy Prism chunk runs (mosniPrism.highlight)
    // - the same lazy-paint mechanism <mosni-code> itself uses. A hand-typed block would show
    // plain unhighlighted text, a real (if well-understood) gap, not a CSS one.
    classHtml: null,
    classGap:
      "Prism syntax highlighting is applied by the lazy mosniPrism.highlight() chunk at runtime, the same mechanism mosni-code itself uses; a hand-typed <code> block would show unhighlighted plain text, not real parity",
  },
];
