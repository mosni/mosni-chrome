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
  Footer,
  Header,
  Layout,
  Logo,
  Menu,
  MenuItem,
  Panel,
  Tab,
  Tabs,
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
];
