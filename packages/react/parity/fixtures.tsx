// Parity fixtures (react-plan.md §5.1). Each case gives the SAME content twice: `html` is what a
// consumer writes against the custom element, `element` is what the same consumer writes in React.
// scripts/parity.mjs renders both and fails the build on any structural difference, which is what
// turns D-17's "renders pixel-identically" from prose into something enforced.
//
// Text content is deliberately boring and short - a fixture exists to compare STRUCTURE, and long
// prose only makes a failure diff harder to read.
import type { ReactElement } from "react";
import {
  Chips,
  Field,
  Footer,
  Header,
  Layout,
  Logo,
  Menu,
  MenuItem,
  Panel,
  Switch,
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

  // --- Wave 2: Field, Switch, Chips -----------------------------------------------------------
  //
  // Field's `value` and Switch's `checked` are deliberately NEVER exercised here (react-plan.md
  // §10): field.ts/switch.ts apply both as PROPERTY writes on the generated control, and neither is
  // a reflected IDL property (unlike e.g. `disabled`/`type`) - a property write never updates the
  // matching content attribute, so the custom element's serialized markup never shows either one no
  // matter what a fixture asks for, while React's SSR always renders both as attributes. Comparing
  // them here would fail on a real, confirmed element-side quirk, not a harness bug or drift -
  // scripts/react-behaviour.mjs asserts the actual `.value`/`.checked` semantics against a live DOM
  // instead, where the attribute/property distinction this trips over doesn't apply.

  {
    name: "mosni-field/text-default",
    html: `<mosni-field label="Email" type="email" name="email"></mosni-field>`,
    element: <Field label="Email" type="email" name="email" />,
  },
  {
    name: "mosni-field/textarea",
    html: `<mosni-field label="Bio" type="textarea"></mosni-field>`,
    element: <Field label="Bio" type="textarea" />,
  },
  {
    name: "mosni-field/select",
    html: `<mosni-field label="Choice" type="select"></mosni-field>`,
    element: <Field label="Choice" type="select" />,
  },
  {
    name: "mosni-field/checkbox",
    html: `<mosni-field label="Agree" type="checkbox"></mosni-field>`,
    element: <Field label="Agree" type="checkbox" />,
  },
  {
    name: "mosni-field/required-help",
    html: `<mosni-field label="Name" required help="As on your passport"></mosni-field>`,
    element: <Field label="Name" required help="As on your passport" />,
  },
  {
    name: "mosni-field/error",
    html: `<mosni-field label="Email" type="email" error="Invalid address"></mosni-field>`,
    element: <Field label="Email" type="email" error="Invalid address" />,
  },
  {
    // The enhance-first branch: an authored control wins over the generated one.
    name: "mosni-field/authored-control-wins",
    html: `<mosni-field label="Bio"><textarea rows="6"></textarea></mosni-field>`,
    element: (
      <Field label="Bio">
        <textarea rows={6} />
      </Field>
    ),
  },

  {
    // mosni-switch is a host-reset tag (D-R11) - never safe as a fixture's OWN root (see
    // UNWRAPPED_HOSTS's comment in normalize-html.mjs), so both sides wrap it in a neutral <div>.
    name: "mosni-switch/default",
    html: `<div><mosni-switch label="On"></mosni-switch></div>`,
    element: (
      <div>
        <Switch label="On" />
      </div>
    ),
  },
  {
    name: "mosni-switch/disabled",
    html: `<div><mosni-switch label="Off" disabled></mosni-switch></div>`,
    element: (
      <div>
        <Switch label="Off" disabled />
      </div>
    ),
  },

  {
    // Below filter-threshold (default 8): no filter box on either side. Values deliberately equal
    // their labels - chips.ts derives the visible chip text from the checkbox's VALUE first
    // (falling back to the wrapping <label>'s text only when value is empty), so a fixture whose
    // value and label differ would show DIFFERENT text on the two sides for a reason that has
    // nothing to do with the React path (see Chips.tsx's own comment on this).
    name: "mosni-chips/below-threshold-none-selected",
    html: `<div><mosni-chips><label><input type="checkbox" value="Apples"> Apples</label><label><input type="checkbox" value="Bananas"> Bananas</label><label><input type="checkbox" value="Cherries"> Cherries</label></mosni-chips></div>`,
    element: (
      <div>
        <Chips
          options={[
            { value: "Apples", label: "Apples" },
            { value: "Bananas", label: "Bananas" },
            { value: "Cherries", label: "Cherries" },
          ]}
        />
      </div>
    ),
  },
  {
    // At/above the filter threshold (8 options): the filter box appears, and one option is
    // pre-selected (a `checked` attribute AUTHORED in the fixture HTML, parsed as literal markup
    // rather than set via `.checked =` afterward - the one path that survives serialization on the
    // element side, see the file-level comment above).
    name: "mosni-chips/at-threshold-with-selection",
    html: `<div><mosni-chips label="Fruit"><label><input type="checkbox" value="One" checked> One</label><label><input type="checkbox" value="Two"> Two</label><label><input type="checkbox" value="Three"> Three</label><label><input type="checkbox" value="Four"> Four</label><label><input type="checkbox" value="Five"> Five</label><label><input type="checkbox" value="Six"> Six</label><label><input type="checkbox" value="Seven"> Seven</label><label><input type="checkbox" value="Eight"> Eight</label></mosni-chips></div>`,
    element: (
      <div>
        <Chips
          label="Fruit"
          value={["One"]}
          options={[
            { value: "One", label: "One" },
            { value: "Two", label: "Two" },
            { value: "Three", label: "Three" },
            { value: "Four", label: "Four" },
            { value: "Five", label: "Five" },
            { value: "Six", label: "Six" },
            { value: "Seven", label: "Seven" },
            { value: "Eight", label: "Eight" },
          ]}
        />
      </div>
    ),
  },
];
