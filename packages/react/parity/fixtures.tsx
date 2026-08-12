// Parity fixtures (react-plan.md §5.1). Each case gives the SAME content twice: `html` is what a
// consumer writes against the custom element, `element` is what the same consumer writes in React.
// scripts/parity.mjs renders both and fails the build on any structural difference, which is what
// turns D-17's "renders pixel-identically" from prose into something enforced.
//
// Text content is deliberately boring and short - a fixture exists to compare STRUCTURE, and long
// prose only makes a failure diff harder to read.
import type { ReactElement } from "react";
import {
  Footer,
  Header,
  Layout,
  Logo,
  Menu,
  MenuItem,
  Panel,
} from "../src/index";

export interface ParityCase {
  /** Fixture id, used in the harness's output. Prefix with the tag so failures sort together. */
  name: string;
  /** Light-DOM markup for the custom-element side, inserted into a jsdom document. */
  html: string;
  /** The React equivalent, rendered with renderToStaticMarkup. */
  element: ReactElement;
}

export const cases: ParityCase[] = [
  {
    name: "mosni-panel/default",
    html: `<mosni-panel><p>Body copy.</p></mosni-panel>`,
    element: (
      <Panel>
        <p>Body copy.</p>
      </Panel>
    ),
  },
  {
    name: "mosni-panel/heading",
    html: `<mosni-panel heading="Sign in"><p>Body copy.</p></mosni-panel>`,
    element: (
      <Panel heading="Sign in">
        <p>Body copy.</p>
      </Panel>
    ),
  },
  {
    // The authored-<h1>-wins branch: `heading` must NOT inject a second one.
    name: "mosni-panel/authored-heading-wins",
    html: `<mosni-panel heading="Ignored"><h1>Authored</h1><p>Body copy.</p></mosni-panel>`,
    element: (
      <Panel heading="Ignored">
        <h1>Authored</h1>
        <p>Body copy.</p>
      </Panel>
    ),
  },
  {
    name: "mosni-panel/size-small",
    html: `<mosni-panel size="small"><p>Body copy.</p></mosni-panel>`,
    element: (
      <Panel size="small">
        <p>Body copy.</p>
      </Panel>
    ),
  },
  {
    name: "mosni-panel/size-full",
    html: `<mosni-panel size="full"><p>Body copy.</p></mosni-panel>`,
    element: (
      <Panel size="full">
        <p>Body copy.</p>
      </Panel>
    ),
  },
  {
    name: "mosni-logo/default",
    html: `<mosni-logo></mosni-logo>`,
    element: <Logo />,
  },
  {
    name: "mosni-logo/alt",
    html: `<mosni-logo alt="home"></mosni-logo>`,
    element: <Logo alt="home" />,
  },
  {
    name: "mosni-header/brand-accent-tagline",
    html: `<mosni-header brand="MOSNI'S" accent="HEADER" tagline="hello"></mosni-header>`,
    element: <Header brand="MOSNI'S" accent="HEADER" tagline="hello" />,
  },
  {
    name: "mosni-header/no-logo",
    html: `<mosni-header brand="MOSNI'S" no-logo tagline="hello"></mosni-header>`,
    element: <Header brand="MOSNI'S" noLogo tagline="hello" />,
  },
  {
    name: "mosni-header/href",
    html: `<mosni-header brand="B" href="https://mosni.dev" tagline="t"></mosni-header>`,
    element: <Header brand="B" href="https://mosni.dev" tagline="t" />,
  },
  {
    // Rich slot content on both regions, plus default children -> .header-mid.
    name: "mosni-header/rich-slots-and-mid",
    html: `<mosni-header><span slot="brand">rich</span><span>mid</span><span slot="tagline">by <a href="https://mosni.dev">mosni</a></span></mosni-header>`,
    element: (
      <Header
        brand={<span>rich</span>}
        tagline={
          <span>
            by <a href="https://mosni.dev">mosni</a>
          </span>
        }
      >
        <span>mid</span>
      </Header>
    ),
  },
  {
    name: "mosni-footer/default",
    html: `<mosni-footer>made with love<a slot="links" href="https://mosni.dev">mosni.dev</a></mosni-footer>`,
    element: (
      <Footer links={<a href="https://mosni.dev">mosni.dev</a>}>
        made with love
      </Footer>
    ),
  },
  {
    name: "mosni-footer/no-links",
    html: `<mosni-footer>made with love</mosni-footer>`,
    element: <Footer>made with love</Footer>,
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
  },
  {
    // No href -> the row is a <div>, not an <a>.
    name: "mosni-menu/item-without-href",
    html: `<mosni-menu><mosni-menu-item title="Plain"></mosni-menu-item></mosni-menu>`,
    element: (
      <Menu>
        <MenuItem title="Plain" />
      </Menu>
    ),
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
  },
];
