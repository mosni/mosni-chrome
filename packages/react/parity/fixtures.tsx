// Parity fixtures (agent-docs → planning-artifacts/react-path-implementation-waves.md §5.1). Each case gives the SAME content twice: `html` is what a
// consumer writes against the custom element, `element` is what the same consumer writes in React.
// scripts/parity.mjs renders both and fails the build on any structural difference, which is what
// turns D-17's "renders pixel-identically" from prose into something enforced.
//
// Text content is deliberately boring and short - a fixture exists to compare STRUCTURE, and long
// prose only makes a failure diff harder to read.
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
  Panel,
  Slider,
  Switch,
  Tab,
  Tabs,
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
  // Field's `value` and Switch's `checked` are deliberately NEVER exercised here (agent-docs → planning-artifacts/react-path-implementation-waves.md
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

  // --- Wave 3: Lightbox, Accordion, AccordionItem, Tabs, Tab ----------------------------------
  //
  // <Modal> and <Tooltip> have NO fixtures here (agent-docs → planning-artifacts/react-path-implementation-waves.md §10): both eagerly portal their
  // real content to document.body, and react-dom/server THROWS on a portal target that doesn't
  // exist (verified - there is no document.body during renderToStaticMarkup) rather than silently
  // rendering nothing. Both components guard on a client-only `mounted` flag, so under
  // renderToStaticMarkup they correctly produce NO markup at all - which parity.mjs's
  // "React element produced no markup" check treats as a fixture error, not a comparable empty
  // state. scripts/react-behaviour.mjs (§5.2) verifies both against a live DOM instead, where
  // portals render for real. <Lightbox> has no such problem and gets a normal fixture below: its
  // overlay dialog is built lazily on click (matching lightbox.ts's own `open()`), so the DEFAULT
  // (unclicked) render has no dialog on either side.

  {
    // mosni-lightbox is UNWRAPPED_HOSTS (never classes its own host - only the enhanced <img>
    // carries a class), so it needs the same neutral-<div> wrapping Switch/Chips do.
    name: "mosni-lightbox/default",
    html: `<div><mosni-lightbox caption="A cat"><img src="cat.png" alt="a cat"></mosni-lightbox></div>`,
    element: (
      <div>
        <Lightbox src="cat.png" alt="a cat" caption="A cat" />
      </div>
    ),
  },

  {
    // mosni-accordion needs the same wrapping - it is RENAMED_HOSTS, but only via
    // IMPLICIT_HOST_CLASS (applied during the walk over DESCENDANTS), so it is not safe as a
    // fixture's own root either (root is exempt from the walk, §5.1).
    name: "mosni-accordion/default",
    html: `<div><mosni-accordion><details><summary>Q1</summary><p>A1</p></details><details open><summary>Q2</summary><p>A2</p></details></mosni-accordion></div>`,
    element: (
      <div>
        <Accordion>
          <AccordionItem summary="Q1">
            <p>A1</p>
          </AccordionItem>
          <AccordionItem summary="Q2" defaultOpen>
            <p>A2</p>
          </AccordionItem>
        </Accordion>
      </div>
    ),
  },
  {
    // `exclusive`'s generated <details name> is normalized away on both sides (see
    // normalize-html.mjs's <details> `name` handling) - it is an opaque, generated group
    // correlator, the same shape as an id, and jsdom (checked: v29.1.1) does not implement
    // `<details>.name` as a reflected attribute at all, so the element side could never show it.
    name: "mosni-accordion/exclusive",
    html: `<div><mosni-accordion exclusive><details><summary>Q1</summary>A1</details><details><summary>Q2</summary>A2</details></mosni-accordion></div>`,
    element: (
      <div>
        <Accordion exclusive>
          <AccordionItem summary="Q1">A1</AccordionItem>
          <AccordionItem summary="Q2">A2</AccordionItem>
        </Accordion>
      </div>
    ),
  },

  {
    // mosni-tabs is UNWRAPPED_HOSTS too (§10) - wrapped for the same reason as Switch/Chips/Lightbox.
    name: "mosni-tabs/default-selection",
    html: `<div><mosni-tabs><mosni-tab label="One"><p>one</p></mosni-tab><mosni-tab label="Two"><p>two</p></mosni-tab></mosni-tabs></div>`,
    element: (
      <div>
        <Tabs>
          <Tab label="One">
            <p>one</p>
          </Tab>
          <Tab label="Two">
            <p>two</p>
          </Tab>
        </Tabs>
      </div>
    ),
  },
  {
    // A meaningful variant per §5.1: a non-zero starting selection.
    name: "mosni-tabs/non-zero-selection",
    html: `<div><mosni-tabs><mosni-tab label="One"><p>one</p></mosni-tab><mosni-tab label="Two" selected><p>two</p></mosni-tab></mosni-tabs></div>`,
    element: (
      <div>
        <Tabs defaultSelectedIndex={1}>
          <Tab label="One">
            <p>one</p>
          </Tab>
          <Tab label="Two">
            <p>two</p>
          </Tab>
        </Tabs>
      </div>
    ),
  },

  // --- Wave 4: Dropdown, DropdownItem, Code, Icon -----------------------------------------------
  //
  // mosni-dropdown IS in RENAMED_HOSTS (§10 corrected this from Wave 0/1's UNWRAPPED_HOSTS entry -
  // dropdown.ts really does `classList.add("dropdown")` on itself), so it is safe as a fixture's
  // own root, unlike Switch/Chips/Tabs/Lightbox/Accordion.

  {
    name: "mosni-dropdown/default",
    html: `<mosni-dropdown label="Actions"><mosni-dropdown-item value="a">Edit</mosni-dropdown-item><mosni-dropdown-item value="b" variant="danger">Delete</mosni-dropdown-item></mosni-dropdown>`,
    element: (
      <Dropdown label="Actions">
        <DropdownItem value="a">Edit</DropdownItem>
        <DropdownItem value="b" variant="danger">
          Delete
        </DropdownItem>
      </Dropdown>
    ),
  },
  {
    // A meaningful variant per §5.1: icon-only trigger (text moves to aria-label).
    name: "mosni-dropdown/icon-only",
    html: `<mosni-dropdown label="More" icon-only><mosni-dropdown-item value="a">Edit</mosni-dropdown-item></mosni-dropdown>`,
    element: (
      <Dropdown label="More" iconOnly>
        <DropdownItem value="a">Edit</DropdownItem>
      </Dropdown>
    ),
  },

  {
    name: "mosni-code/default",
    html: `<mosni-code language="ts">const x = 1;</mosni-code>`,
    element: <Code language="ts">{"const x = 1;"}</Code>,
  },
  {
    name: "mosni-code/no-copy",
    html: `<mosni-code language="ts" no-copy>const x = 1;</mosni-code>`,
    element: (
      <Code language="ts" noCopy>
        {"const x = 1;"}
      </Code>
    ),
  },
  {
    name: "mosni-code/no-header",
    html: `<mosni-code language="ts" no-header>const x = 1;</mosni-code>`,
    element: (
      <Code language="ts" noHeader>
        {"const x = 1;"}
      </Code>
    ),
  },

  {
    // Both sides render an empty span in this harness (agent-docs → planning-artifacts/react-path-implementation-waves.md §10): the public icon chunk's
    // script-src injection never actually fetches under plain jsdom (no resource loader configured
    // - confirmed empirically, and the SAME reason smoke.mjs's mosni-code assertions never check
    // for Prism token spans either), so <mosni-icon> never reaches its `iconsLoaded` state despite
    // window.mosniIcons already existing, and <Icon>'s effect-driven paint never runs synchronously
    // under renderToStaticMarkup. This still earns its place as a real structural check (root tag
    // excluded, empty children on both sides) - scripts/react-behaviour.mjs is not extended for
    // Icon specifically since there is nothing further to verify that isn't identical to the Code/
    // Tooltip lazy-chunk pattern already covered.
    name: "mosni-icon/default",
    html: `<mosni-icon name="check"></mosni-icon>`,
    element: <Icon name="check" />,
  },

  // --- Row 010: Slider (mosni-slider, D-207) -----------------------------------------------------
  //
  // Neither fixture sets value/defaultValue - same rule Wave 2 established for Field/Switch.
  // Selection is covered by the behaviour case instead (packages/react/behaviour/cases.tsx).

  {
    name: "mosni-slider/default",
    html: `<mosni-slider stops="A|B|C"></mosni-slider>`,
    element: <Slider stops={["A", "B", "C"]} />,
  },
  {
    name: "mosni-slider/labelled",
    html: `<mosni-slider stops="A|B|C" label="Pick one"></mosni-slider>`,
    element: <Slider stops={["A", "B", "C"]} label="Pick one" />,
  },
];
