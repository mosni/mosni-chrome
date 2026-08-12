// Shared normalization for scripts/parity.mjs (react-plan.md §5.1 step 3): the custom-element side
// and the React side use different id-generation strategies (a module counter vs. useId()) and
// carry runtime-measured inline styles (dropdown menu position, tooltip position) that can never
// match between a jsdom run and a renderToStaticMarkup pass with no real layout - both are expected
// noise, not real drift, so both sides get stripped of it identically before comparison.
const ID_REFERENCING_ATTRS = new Set([
  "id",
  "for",
  "aria-controls",
  "aria-labelledby",
  "aria-describedby",
  // `slot` is the light-DOM region marker (D-16) - purely an instruction to the custom element's
  // own render(), which reads it, relocates the child, and leaves the now-meaningless attribute
  // behind. Nothing selects it in the SCSS (checked), and the React path expresses the same regions
  // as ReactNode props instead (§3), so it has no counterpart to compare against.
  "slot",
]);

// Only these three CSS properties are runtime measurements (dropdown menu top/left/position,
// tooltip top/left) - everything else in a `style` attribute (e.g. chips' max-height) is real,
// authored content and must still be compared.
const MEASUREMENT_STYLE_PROPS = new Set(["top", "left", "position"]);

// Reformats every KEPT declaration to a single canonical "prop: value" spacing, not just filters
// measurement props out: a live DOM's `style` attribute (what jsdom serializes for the
// custom-element side) always has a space after the colon, while React's inline `style={{…}}`
// serializes with none (`max-height:13rem`) - real, authored styles like chips' `maxHeight` would
// otherwise fail the comparison on formatting alone, not on any actual difference in the
// declaration.
function stripMeasurementStyle(styleValue) {
  const kept = styleValue
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const prop = decl.split(":")[0]?.trim().toLowerCase();
      return !MEASUREMENT_STYLE_PROPS.has(prop);
    })
    .map((decl) => {
      const [prop, ...rest] = decl.split(":");
      return `${prop.trim()}: ${rest.join(":").trim()}`;
    });
  return kept.join("; ");
}

// The two paths differ in exactly one systematic way beyond ids and measurements: the custom
// element leaves its own HOST tag in the DOM, and the React component does not (D-R1). There are
// two shapes of that, and they need opposite treatment - which is why this is two tables (plus the
// small IMPLICIT_HOST_CLASS exception below, for the one tag that styles itself through a bare tag
// selector instead of a class). Both tables are applied to BOTH sides; on the React side they are
// no-ops, which is the point (a rule that only ever fires on one side would be hiding drift rather
// than normalizing noise).
//
// 1. RENAMED: the host IS the component's box, and React renders the same box under a plain tag.
//    Its class list and children must still match exactly - only the tag name differs.
// Membership here is NOT "which SCSS twin exists" - it is "does the custom element's JS put the
// styled class on ITS OWN host, or on a child it generates?" Verified against each component's
// render() individually (react-plan.md §10 records two the plan's own draft table got backwards):
// mosni-chips, mosni-tabs, and mosni-lightbox all build their real, classed box as a CHILD and
// leave the host itself class-less - renaming the host would produce a spurious extra wrapper level
// with an empty class, not the single classed box React renders - so they belong in UNWRAPPED_HOSTS
// below, not here. mosni-dropdown is the opposite mistake: dropdown.ts DOES `classList.add("dropdown")`
// on itself, so it belongs here, not in UNWRAPPED_HOSTS.
const RENAMED_HOSTS = new Map([
  ["mosni-layout", "div"],
  ["mosni-header", "header"],
  ["mosni-footer", "footer"],
  ["mosni-menu", "nav"],
  ["mosni-panel", "div"],
  ["mosni-logo", "span"],
  ["mosni-field", "div"],
  ["mosni-code", "div"],
  ["mosni-icon", "span"],
  ["mosni-accordion", "div"],
  ["mosni-dropdown", "div"],
]);

// mosni-accordion is the one RENAMED_HOSTS tag that styles itself through a bare TAG selector
// (`mosni-accordion { … }` in _accordion.scss) rather than a class on its own host - D-R11's
// `.accordion` comma twin exists precisely so the class-path and React equivalents (which cannot
// select by custom-element tag) get the same rules via a class instead. accordion.ts never adds
// that class to itself (confirmed: no `classList.add` anywhere in the file), so a plain
// attribute-copying rename would produce a class-less div - CSS-equivalent to `mosni-accordion`,
// but not attribute-equal to `.accordion`, and this harness only compares attributes. This table
// adds back the class the tag-selector styling implies, so the comparison reflects the real CSS
// equivalence D-R11 established instead of failing on a literal (and, for this tag, never-true)
// class match. Every other RENAMED_HOSTS tag needs no entry here because it already self-classes.
const IMPLICIT_HOST_CLASS = new Map([["mosni-accordion", "accordion"]]);

// 2. UNWRAPPED: the host exists ONLY because a custom element needs somewhere to live, and carries
//    no box of its own - either by design (`display: contents` or equivalent in the SCSS, and the
//    generated/enhanced box is a CHILD the host merely holds) or because the host's own children
//    pass through untouched (mosni-tooltip's anchor, mosni-lightbox's <img>). React renders the
//    generated/enhanced child directly with no wrapper, so the host is replaced by its own children.
//    A fixture using one of these tags AS ITS OWN ROOT must wrap it in a neutral element (both
//    sides) - the root itself is exempt from this table (§5.1: root tag name is excluded from the
//    comparison already), so an unwrapped-eligible tag left as the fixture root would compare its
//    own [never-classed] self against React's [classed] root instead of unwrapping down to the
//    child that actually carries the class.
const UNWRAPPED_HOSTS = new Set([
  "mosni-menu-item",
  "mosni-tab",
  "mosni-dropdown-item",
  "mosni-modal",
  "mosni-switch",
  "mosni-tooltip",
  "mosni-chips",
  "mosni-tabs",
  "mosni-lightbox",
]);

// A custom element keeps the attributes it was CONFIGURED with sitting on its host after render()
// has consumed them (`<mosni-header brand="B">` stays `brand="B"` forever). The React path passes the
// same information as props, which leave no trace in the markup. The authoritative list of what
// counts as configuration is meta.ts - the same source the docs tables are generated from - so this
// takes it as a parameter rather than hard-coding a second copy that could drift from it.
function stripConfigAttributes(el, attributesByTag) {
  const documented = attributesByTag.get(el.tagName.toLowerCase());
  if (!documented) return;
  for (const name of documented) el.removeAttribute(name);
}

// Renaming an element in place is not a DOM operation - it needs a fresh element with the same
// attributes and children, swapped for the original.
function renameElement(el, tagName) {
  const replacement = el.ownerDocument.createElement(tagName);
  for (const attr of Array.from(el.attributes)) {
    replacement.setAttribute(attr.name, attr.value);
  }
  while (el.firstChild) replacement.appendChild(el.firstChild);
  el.replaceWith(replacement);
  return replacement;
}

function normalizeHostTags(root, attributesByTag) {
  // Depth-first over a SNAPSHOT of the children: both branches below replace the node being
  // visited, so iterating the live collection would skip siblings.
  const walk = (el) => {
    for (const child of Array.from(el.children)) walk(child);
    const tag = el.tagName.toLowerCase();
    if (UNWRAPPED_HOSTS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }
    const renamed = RENAMED_HOSTS.get(tag);
    if (renamed) {
      stripConfigAttributes(el, attributesByTag);
      const implicitClass = IMPLICIT_HOST_CLASS.get(tag);
      if (implicitClass) el.classList.add(implicitClass);
      renameElement(el, renamed);
    }
  };
  for (const child of Array.from(root.children)) walk(child);
  // The root host itself is never renamed (§5.1 excludes the root tag from the comparison outright),
  // but it carries the same configuration attributes as any nested host and needs them stripped too.
  stripConfigAttributes(root, attributesByTag);
}

// Mutates `root` (and its descendants) in place - callers pass a DOM subtree they own for the
// duration of one comparison, so this never needs to clone.
function normalizeAttributes(root) {
  const walk = (el) => {
    for (const attr of ID_REFERENCING_ATTRS) {
      if (el.hasAttribute(attr)) el.removeAttribute(attr);
    }
    if (el.hasAttribute("style")) {
      const kept = stripMeasurementStyle(el.getAttribute("style"));
      if (kept) el.setAttribute("style", kept);
      else el.removeAttribute("style");
    }
    for (const child of Array.from(el.children)) walk(child);
  };
  walk(root);
}

function escapeAttrValue(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// A canonical serializer, not element.innerHTML: outerHTML/innerHTML preserve each attribute's
// original insertion order, but §5.1 step 3 requires attributes sorted alphabetically so the two
// sides' otherwise-identical markup can never fail the diff purely on attribute ORDER.
function serializeNode(node) {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) {
    return "";
  }
  const tag = node.tagName.toLowerCase();
  const attrNames = Array.from(node.attributes)
    .map((a) => a.name)
    .sort();
  const attrsStr = attrNames
    .map(
      (name) => ` ${name}="${escapeAttrValue(node.getAttribute(name) ?? "")}"`,
    )
    .join("");
  if (VOID_TAGS.has(tag)) return `<${tag}${attrsStr}>`;
  const childrenStr = Array.from(node.childNodes).map(serializeNode).join("");
  return `<${tag}${attrsStr}>${childrenStr}</${tag}>`;
}

function collapseWhitespaceBetweenTags(html) {
  return html.replace(/>\s+</g, "><").trim();
}

// jsdom evaluates the core bundle as an INLINE <script>, so `document.currentScript.src` is empty
// and base-element.ts's assetBase falls back to its hard-coded https://mosni.dev/. In production the
// core is a real <script src="https://ui.mosni.dev/mosnicat-core.js">, so assetBase resolves to
// ui.mosni.dev - which is what the React path hard-codes. Rewriting the fallback origin to the real
// one keeps the harness from failing on its own artifact, and is narrow enough that a component
// pointing at a genuinely wrong host still fails.
const ASSET_ORIGIN_ARTIFACT = /https:\/\/mosni\.dev\//g;
const ASSET_ORIGIN_CANONICAL = "https://ui.mosni.dev/";

/**
 * @param {Element} host
 * @param {Map<string, string[]>} attributesByTag documented attributes per tag, from meta.ts
 * @returns {{ className: string, innerHtml: string }}
 */
export function normalizeHost(host, attributesByTag = new Map()) {
  // Operate on a CLONE, never the live host: some documented config attributes (mosni-field's
  // `error`, the same shape as mosni-modal's `open`/mosni-switch's `checked`) are also OBSERVED,
  // meaning the custom element is still watching them for live updates. Calling
  // `el.removeAttribute(name)` on the connected original would fire `attributeChangedCallback` for
  // real and undo the very state (the .error class, aria-invalid, the .field-error paragraph) the
  // comparison exists to check - discovered via mosni-field/error failing parity with the WRONG
  // side missing its error markup (react-plan.md §10). `cloneNode(true)` sidesteps this cleanly:
  // every component's `attributeChangedCallback` guards on `this.rendered` (set only by
  // `connectedCallback`), and a clone is never connected, so its callbacks stay inert no matter
  // what this function goes on to mutate.
  const clone = host.cloneNode(true);
  normalizeHostTags(clone, attributesByTag);
  normalizeAttributes(clone);
  const className = clone.getAttribute("class") ?? "";
  const innerHtml = collapseWhitespaceBetweenTags(
    Array.from(clone.childNodes).map(serializeNode).join(""),
  ).replace(ASSET_ORIGIN_ARTIFACT, ASSET_ORIGIN_CANONICAL);
  return { className, innerHtml };
}
