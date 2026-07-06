// Docs-table source, consumed by the Node-side docs generator. Must never import a component
// module: components self-register on import, and customElements does not exist in Node.
export interface AttributeMeta {
  name: string;
  type: string;
  observed: boolean;
  description: string;
  default?: string;
}
export interface ComponentMeta {
  tag: string;
  summary: string;
  attributes: AttributeMeta[];
  slots: { name: string; description: string }[];
  events: { name: string; description: string }[];
}

export const componentMeta: ComponentMeta[] = [
  {
    tag: "mosni-header",
    summary: "The site header bar - composes .header.",
    attributes: [
      {
        name: "brand",
        type: "string",
        observed: false,
        default: "—",
        description: "Brand text (left). Plain leading text of the brand.",
      },
      {
        name: "accent",
        type: "string",
        observed: false,
        default: "—",
        description:
          "Optional trailing brand text wrapped in .purple (exordium's split-brand look).",
      },
      {
        name: "href",
        type: "string",
        observed: false,
        default: "—",
        description: "If set, the brand is a link to it.",
      },
      {
        name: "tagline",
        type: "string",
        observed: false,
        default: "—",
        description: "Plain text for the right-side little-link region.",
      },
    ],
    slots: [
      {
        name: "brand",
        description:
          "Rich brand content overriding brand/accent (wrapped in an <a href> if href is set).",
      },
      {
        name: "tagline",
        description: "Rich right-side content overriding tagline.",
      },
    ],
    events: [],
  },
  {
    tag: "mosni-layout",
    summary:
      "The app frame grid (header + menu + main + footer) - composes .layout.",
    attributes: [],
    slots: [
      { name: "header", description: "A <mosni-header> or any header." },
      { name: "menu", description: "A <mosni-menu>." },
      { name: "footer", description: "An optional <mosni-footer>." },
    ],
    events: [],
  },
  {
    tag: "mosni-menu",
    summary:
      "The navigation container for <mosni-menu-item> children - composes .menu.",
    attributes: [
      {
        name: "label",
        type: "string",
        observed: false,
        default: "—",
        description: "Sets aria-label on the nav (role=navigation).",
      },
    ],
    slots: [],
    events: [],
  },
  {
    tag: "mosni-menu-item",
    summary: "A single menu row, generated from attributes. display: contents.",
    attributes: [
      {
        name: "title",
        type: "string",
        observed: false,
        default: "—",
        description: "Entry title (required).",
      },
      {
        name: "subtitle",
        type: "string",
        observed: false,
        default: "—",
        description: "Optional second line.",
      },
      {
        name: "href",
        type: "string",
        observed: false,
        default: "—",
        description: "If set, the whole row is an <a> (full-row hit area).",
      },
      {
        name: "selected",
        type: "boolean",
        observed: true,
        default: "false",
        description:
          'Current page - adds .selected + aria-current="page"; mirrored property.',
      },
    ],
    slots: [],
    events: [],
  },
  {
    tag: "mosni-panel",
    summary:
      "The centred single-purpose-page card, enhanced from authored content - composes .panel.",
    attributes: [
      {
        name: "heading",
        type: "string",
        observed: false,
        default: "—",
        description:
          "Injected as <h1> unless an authored heading child is present.",
      },
    ],
    slots: [
      {
        name: "heading",
        description:
          'Enhance-first: an authored <h1> or slot="heading" child always wins over the heading attribute.',
      },
    ],
    events: [],
  },
  {
    tag: "mosni-footer",
    summary: "The page footer - composes .footer.",
    attributes: [],
    slots: [
      {
        name: "links",
        description:
          "Right-side link row; unslotted default children go to the left (copyright/tagline).",
      },
    ],
    events: [],
  },
  {
    tag: "mosni-field",
    summary: "A labelled form control with help/error text - composes .field.",
    attributes: [
      {
        name: "label",
        type: "string",
        observed: false,
        default: "—",
        description: "Field label text.",
      },
      {
        name: "type",
        type: "string",
        observed: false,
        default: "text",
        description:
          "Control kind when generating: text (default)/password/email/number/url/search/tel/date/textarea/select/checkbox/radio.",
      },
      {
        name: "name",
        type: "string",
        observed: false,
        default: "—",
        description: "Control name (form submission).",
      },
      {
        name: "value",
        type: "string",
        observed: false,
        default: "—",
        description: "Initial value.",
      },
      {
        name: "required",
        type: "boolean",
        observed: false,
        default: "false",
        description: "Adds the * marker + control required.",
      },
      {
        name: "help",
        type: "string",
        observed: false,
        default: "—",
        description: "Help text under the control.",
      },
      {
        name: "error",
        type: "string",
        observed: true,
        default: "—",
        description:
          "Error message; presence sets .field.error + aria-invalid + shows the message.",
      },
    ],
    slots: [],
    events: [
      {
        name: "change",
        description:
          "Native change from the (authored or generated) control; bubbles from light DOM already.",
      },
      {
        name: "input",
        description:
          "Native input from the (authored or generated) control; bubbles from light DOM already.",
      },
    ],
  },
  {
    tag: "mosni-switch",
    summary:
      "An enhance-or-generate boolean toggle - composes .switch. display: inline-block.",
    attributes: [
      {
        name: "checked",
        type: "boolean",
        observed: true,
        default: "false",
        description: "On/off; mirrors the inner checkbox.",
      },
      {
        name: "disabled",
        type: "boolean",
        observed: true,
        default: "false",
        description: "Disabled.",
      },
      {
        name: "label",
        type: "string",
        observed: false,
        default: "—",
        description: "Optional inline label (clickable).",
      },
      {
        name: "name",
        type: "string",
        observed: false,
        default: "—",
        description: "Form field name.",
      },
      {
        name: "value",
        type: "string",
        observed: false,
        default: "—",
        description: "Submitted value when checked.",
      },
    ],
    slots: [],
    events: [
      {
        name: "change",
        description: "Native change; bubbles from the inner checkbox.",
      },
    ],
  },
  {
    tag: "mosni-modal",
    summary: "A dialog over a generated native <dialog> - composes .modal.",
    attributes: [
      {
        name: "open",
        type: "boolean",
        observed: true,
        default: "false",
        description:
          "Open state - drives dialog.showModal()/close(); reflects back on native close.",
      },
      {
        name: "heading",
        type: "string",
        observed: false,
        default: "—",
        description: 'Dialog heading (<h1 class="modal-heading">).',
      },
    ],
    slots: [
      {
        name: "heading",
        description: "Rich heading, overrides the heading attribute.",
      },
      { name: "footer", description: "The action button row." },
    ],
    events: [
      {
        name: "close",
        description:
          "Native <dialog> close (dialog.returnValue carries the value).",
      },
      { name: "cancel", description: "Native <dialog> cancel (Esc)." },
    ],
  },
  {
    tag: "mosni-tooltip",
    summary:
      "A hover/focus tip appended to document.body - composes .tooltip. display: contents.",
    attributes: [
      {
        name: "text",
        type: "string",
        observed: true,
        default: "—",
        description:
          'Tooltip text (ignored once a slot="tip" child is used); mirrored property.',
      },
    ],
    slots: [
      {
        name: "tip",
        description: "Rich tip content, overrides the text attribute.",
      },
    ],
    events: [],
  },
  {
    tag: "mosni-icon",
    summary:
      "A public by-name Lucide icon element backed by the lazy mosnicat-icons.js chunk.",
    attributes: [
      {
        name: "name",
        type: "string",
        observed: false,
        default: "-",
        description: "Lucide icon name (kebab-case).",
      },
      {
        name: "size",
        type: "number",
        observed: false,
        default: "20",
        description: "Pixel size.",
      },
    ],
    slots: [],
    events: [],
  },
  {
    tag: "mosni-toast",
    summary:
      "The declarative secondary path onto the imperative window.mosni.toast(...) host - composes .toast.",
    attributes: [
      {
        name: "variant",
        type: "string",
        observed: false,
        default: "info",
        description:
          "info (default)/success/error - read once on connect, forwarded to the created toast.",
      },
    ],
    slots: [],
    events: [
      {
        name: "mosni-toast-dismiss",
        description:
          "Bubbles from a toast element when it is dismissed (button, timeout, or handle.dismiss()).",
      },
    ],
  },
  {
    tag: "mosni-lightbox",
    summary:
      "An enhanced <img> that opens a full-resolution overlay - composes .lightbox-thumb / dialog.lightbox.",
    attributes: [
      {
        name: "full",
        type: "string",
        observed: false,
        default: "thumbnail src",
        description:
          "Full-resolution src for the overlay (defaults to the thumbnail's src).",
      },
      {
        name: "caption",
        type: "string",
        observed: false,
        default: "—",
        description: "Optional caption under the enlarged image.",
      },
    ],
    slots: [],
    events: [
      {
        name: "close",
        description: "Native <dialog> close on the generated overlay.",
      },
    ],
  },
  {
    tag: "mosni-code",
    summary:
      "A code block with an optional copy button and lazy Prism highlighting - composes .code.",
    attributes: [
      {
        name: "language",
        type: "string",
        observed: false,
        default: "—",
        description: "Prism language id (ts, js, html, css, bash, json, md).",
      },
      {
        name: "label",
        type: "string",
        observed: false,
        default: "language",
        description:
          "Header label (defaults to language when the header shows).",
      },
      {
        name: "no-copy",
        type: "boolean",
        observed: false,
        default: "false",
        description: "Hide the copy button (shown by default).",
      },
      {
        name: "no-header",
        type: "boolean",
        observed: false,
        default: "false",
        description: "Hide the header row entirely.",
      },
    ],
    slots: [],
    events: [],
  },
  {
    tag: "mosni-accordion",
    summary:
      "A flat divided list of native <details> sections - styles mosni-accordion details/summary.",
    attributes: [
      {
        name: "exclusive",
        type: "boolean",
        observed: false,
        default: "false",
        description:
          "Only one section open at a time - sets a shared generated name on every child <details>.",
      },
    ],
    slots: [],
    events: [
      {
        name: "toggle",
        description: "Native toggle, bubbling from each child <details>.",
      },
    ],
  },
  {
    tag: "mosni-tabs",
    summary:
      "The tablist controller built from <mosni-tab> children - composes .tabs.",
    attributes: [],
    slots: [],
    events: [
      {
        name: "mosni-tab-change",
        description:
          "Bubbles on selection change; detail: { index, label }. Also settable via tabs.selectedIndex.",
      },
    ],
  },
  {
    tag: "mosni-tab",
    summary:
      "The authored tab unit; its content is moved into the generated panel. display: contents.",
    attributes: [
      {
        name: "label",
        type: "string",
        observed: false,
        default: "—",
        description: "Tab button text.",
      },
      {
        name: "selected",
        type: "boolean",
        observed: true,
        default: "false",
        description: "This tab is active; mirrored property.",
      },
    ],
    slots: [],
    events: [],
  },
];
