// Generates the docs page from the fragments in docs/examples/: each fragment is emitted both as a
// live demo and as its shown snippet, so the two can never drift apart.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { bundleAndImport, cleanupScratch } from "./lib/bundle-and-import.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const examplesDir = path.join(rootDir, "docs/examples");
const reactExamplesDir = path.join(examplesDir, "react");

function escapeHtml(source) {
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.html$/, "")
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

async function loadComponentMeta() {
  const { outputFiles } = await build({
    entryPoints: [path.join(rootDir, "src/js/components/meta.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
  });
  const code = outputFiles[0].text;
  const mod = await import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
  return mod.componentMeta;
}

// The section id IS the react example's filename (docs/examples/react/<id>.tsx) - "icons.html"'s
// react example is react/icons.tsx even though its documented tag is mosni-icon, matching how the
// section itself is keyed by filename, not by tag, everywhere else in this file.
async function loadReactExampleIds() {
  const entries = await readdir(reactExamplesDir).catch(() => []);
  return new Set(
    entries
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => f.replace(/\.tsx$/, "")),
  );
}

// Each docs/examples/react/<id>.tsx imports @mosni/react by a RELATIVE path into
// packages/react/src (the same reason parity fixtures/behaviour cases do - a bare "@mosni/react"
// specifier has no package.json/node_modules to resolve against from this repo, since the tarball
// is D-R5's whole point). That import is real for BUNDLING but wrong to show a reader, who has an
// actual @mosni/react dependency - so the DISPLAYED snippet rewrites it back to the public import a
// real consumer would write, while bundleAndImport still resolves the real relative one.
const REACT_PACKAGE_IMPORT_PATTERN =
  /from ["']\.\.\/\.\.\/\.\.\/packages\/react\/src\/index["']/g;

// Bundles and renders a docs/examples/react/<id>.tsx file exactly the way scripts/parity.mjs
// renders fixtures.tsx - real esbuild bundling (react/react-dom external) + a real scratch file
// (not the data: URL trick loadComponentMeta uses above, which only works because meta.ts imports
// nothing - see bundle-and-import.mjs's own header comment), then renderToStaticMarkup on the
// module's default export. The demo pane this produces is the React component's own real output,
// not a hand-maintained stand-in that could drift from what <Component> actually renders.
async function renderReactExample(id) {
  const file = path.join(reactExamplesDir, `${id}.tsx`);
  const rawSource = (await readFile(file, "utf8")).trimEnd();
  const displaySource = rawSource.replace(
    REACT_PACKAGE_IMPORT_PATTERN,
    'from "@mosni/react"',
  );
  const mod = await bundleAndImport(file);
  const html = renderToStaticMarkup(createElement(mod.default));
  return { displaySource, html };
}

function renderAttributeTable(meta) {
  if (meta.attributes.length === 0) return "";
  const rows = meta.attributes
    .map(
      (attr) => `          <tr>
            <td><code>${escapeHtml(attr.name)}</code></td>
            <td>${escapeHtml(attr.type)}</td>
            <td>${attr.observed ? "yes" : "no"}</td>
            <td><code>${escapeHtml(attr.default ?? "-")}</code></td>
            <td class="table-desc">${escapeHtml(attr.description)}</td>
          </tr>`,
    )
    .join("\n");
  return `      <h3>Attributes</h3>
      <div class="table-scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Observed</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
      </div>`;
}

function renderNamedTable(title, entries) {
  if (entries.length === 0) return "";
  const rows = entries
    .map(
      (entry) => `          <tr>
            <td><code>${escapeHtml(entry.name)}</code></td>
            <td class="table-desc">${escapeHtml(entry.description)}</td>
          </tr>`,
    )
    .join("\n");
  return `      <h3>${title}</h3>
      <div class="table-scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
      </div>`;
}

function renderComponentMetaTables(meta) {
  return [
    renderAttributeTable(meta),
    renderNamedTable("Slots", meta.slots),
    renderNamedTable("Events", meta.events),
  ]
    .filter(Boolean)
    .join("\n");
}

function renderSection(filename, source, componentMetaByTag) {
  const id = filename.replace(/\.html$/, "");
  const title = titleFromFilename(filename);
  const meta = componentMetaByTag.get(id);
  const metaTables = meta ? `\n${renderComponentMetaTables(meta)}` : "";
  return `    <section class="doc-example" id="${id}">
      <h2>${title}</h2>
      <div class="doc-example-demo">
${source}
      </div>
      <mosni-code language="html"><pre>${escapeHtml(source)}</pre></mosni-code>${metaTables}
    </section>`;
}

const PAIRS = [
  {
    title: "Header",
    tabs: [
      { id: "mosni-header", label: "Component" },
      { id: "header", label: "Class (HTML)" },
    ],
  },
  {
    title: "Layout",
    tabs: [
      { id: "mosni-layout", label: "Component" },
      { id: "layout", label: "Class (HTML)" },
    ],
  },
  {
    title: "Panel & containers",
    tabs: [
      { id: "mosni-panel", label: "Component" },
      { id: "panel", label: "Class (HTML)" },
      { id: "panel-input", label: "With inputs" },
      { id: "text-container", label: "Text container" },
    ],
    note: `<code>.text-container</code> is the same as <code>.content-container</code>. Kept around for backwards compatibility reasons.`,
  },
  {
    title: "Button",
    tabs: [
      { id: "btn", label: "Button" },
      { id: "btn-block", label: "Full-width" },
    ],
  },
];

// The generalised version of the old renderPairedSection (agent-docs → planning-artifacts/react-path-implementation-waves.md §6.2): up to three tabs,
// in the fixed order React, Component, Class (HTML) - React first (and so `selected`) when
// present, since it's the tab most consumers of THIS docs page - written for a React app - want by
// default. `htmlTabs` is exactly what PAIRS already provided (Component + Class(HTML) + any
// extras); a React tab is prepended in front of it whenever a docs/examples/react/<anchorId>.tsx
// example exists. Falls back to the original plain, tab-less `renderSection` when there would only
// ever be one tab (no React example, and exactly one html tab) - the same "only one exists" case
// §6.2 describes.
async function renderGroupSection(
  anchorId,
  title,
  note,
  htmlTabs,
  sourceById,
  componentMetaByTag,
  reactExampleIds,
) {
  const hasReactExample = reactExampleIds.has(anchorId);

  if (!hasReactExample && htmlTabs.length === 1) {
    return renderSection(
      `${htmlTabs[0].id}.html`,
      sourceById.get(htmlTabs[0].id),
      componentMetaByTag,
    );
  }

  const meta = htmlTabs
    .map((tab) => componentMetaByTag.get(tab.id))
    .find(Boolean);
  const metaTables = meta ? `\n${renderComponentMetaTables(meta)}` : "";
  const noteHtml = note ? `\n      <p>${note}</p>` : "";

  const panels = [];
  if (hasReactExample) {
    const { displaySource, html } = await renderReactExample(anchorId);
    panels.push(`        <mosni-tab label="React" selected>
          <div class="doc-example-demo" id="${anchorId}-react-demo">
${html}
          </div>
          <mosni-code language="tsx"><pre>${escapeHtml(displaySource)}</pre></mosni-code>
        </mosni-tab>`);
  }
  htmlTabs.forEach((tab, index) => {
    const source = sourceById.get(tab.id);
    const selected = !hasReactExample && index === 0;
    panels.push(`        <mosni-tab label="${tab.label}"${selected ? " selected" : ""}>
          <div class="doc-example-demo">
${source}
          </div>
          <mosni-code language="html"><pre>${escapeHtml(source)}</pre></mosni-code>
        </mosni-tab>`);
  });

  return `    <section class="doc-example" id="${anchorId}">
      <h2>${title}</h2>${noteHtml}
      <mosni-tabs>
${panels.join("\n")}
      </mosni-tabs>${metaTables}
    </section>`;
}

const COMPONENTS_INTRO = `    <section class="doc-example-intro">
      <h1>Components</h1>
      <p>
        Either use these as components, <mosni-comp> custom element, or as plain html with classes
      </p>
      <p>
        Examples include tabs for both versions when available.
      </p>
    </section>`;

// docs/examples/react.html (§6.1): a peer of "Component"/"Class (HTML)" at the nav level, not a
// component section - placed immediately before the components intro, exactly like the plan
// specifies, by pulling it out of the normal alphabetical filename loop below (its own filename
// would otherwise sort well before any mosni-* file) and inserting it by hand at that point.
const REACT_SECTION_ID = "react";

export async function generateDocs({ distDir }) {
  const filenames = (await readdir(examplesDir))
    .filter((f) => f.endsWith(".html"))
    .sort();

  const componentMeta = await loadComponentMeta();
  const componentMetaByTag = new Map(componentMeta.map((m) => [m.tag, m]));
  const reactExampleIds = await loadReactExampleIds();

  const sourceById = new Map();
  for (const filename of filenames) {
    const id = filename.replace(/\.html$/, "");
    const source = (
      await readFile(path.join(examplesDir, filename), "utf8")
    ).trimEnd();
    sourceById.set(id, source);
  }

  const pairByAnchorId = new Map(PAIRS.map((pair) => [pair.tabs[0].id, pair]));
  const consumedIds = new Set(
    PAIRS.flatMap((pair) => pair.tabs.map((tab) => tab.id)),
  );

  let insertedComponentsIntro = false;
  const sections = [];
  const navItems = [];

  for (const filename of filenames) {
    const id = filename.replace(/\.html$/, "");
    if (id === REACT_SECTION_ID) continue; // handled below, right before the components intro

    if (!insertedComponentsIntro && id.startsWith("mosni-")) {
      navItems.push({ id: REACT_SECTION_ID, title: "React" });
      sections.push(
        renderSection(
          `${REACT_SECTION_ID}.html`,
          sourceById.get(REACT_SECTION_ID),
          componentMetaByTag,
        ),
      );
      sections.push(COMPONENTS_INTRO);
      insertedComponentsIntro = true;
    }

    if (consumedIds.has(id)) {
      const pair = pairByAnchorId.get(id);
      if (pair) {
        navItems.push({ id, title: pair.title });
        sections.push(
          await renderGroupSection(
            id,
            pair.title,
            pair.note,
            pair.tabs,
            sourceById,
            componentMetaByTag,
            reactExampleIds,
          ),
        );
      }
      continue;
    }

    navItems.push({ id, title: titleFromFilename(filename) });
    sections.push(
      await renderGroupSection(
        id,
        titleFromFilename(filename),
        undefined,
        [{ id, label: "Component" }],
        sourceById,
        componentMetaByTag,
        reactExampleIds,
      ),
    );
  }

  await cleanupScratch();

  const navItemsHtml = navItems
    .map(
      (item, index) =>
        `<mosni-menu-item title="${item.title}" href="#${item.id}"${index === 0 ? " selected" : ""}></mosni-menu-item>`,
    )
    .join("\n        ");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Hannah's design library</title>
    <script src="mosnicat.js"></script>
    <style>
      @media (prefers-reduced-motion: no-preference) {
        html {
          scroll-behavior: smooth;
        }
      }
      .docs-content {
        /* min(), not a bare 60rem: this flex item's margin-inline:auto disables cross-axis
           stretch, so without the 100% cap it sizes to a long code line and scrolls the page on
           mobile. Wide children (code, tables) still scroll within their own boxes. */
        max-width: min(60rem, 100%);
        margin-inline: auto;
      }
      .doc-example {
        margin: 2rem 0;
        scroll-margin-top: calc(var(--header-height) + 1rem);
      }
      .doc-example-intro {
        margin-inline: 0;
      }
      .doc-example-demo {
        border: 1px dashed #666;
        padding: 1rem;
        margin: 1rem 0;
        max-height: 480px;
        overflow: auto;
      }
      .table-desc {
        overflow-wrap: anywhere;
      }
      .icon-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .icon-grid figure {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        margin: 0;
        font-size: 0.75rem;
        color: var(--mosni-text-muted);
      }
    </style>
  </head>
  <body>
    <mosni-layout>
      <mosni-header slot="header" brand="MOSNI'S" accent="DESIGN KIT" href="https://mosni.dev" tagline="hannah's design system"></mosni-header>
      <mosni-menu id="docs-nav" slot="menu" label="Sections">
        ${navItemsHtml}
      </mosni-menu>
      <div class="docs-content">
        <h1>Hannah's design library</h1>
        <p>
          A drop-in design system - no framework, no build step. Add one tag and every class and
          <code>&lt;mosni-*&gt;</code> element below just works:
        </p>
        <mosni-code language="html"><pre>&lt;script src="https://mosni.dev/mosnicat.js"&gt;&lt;/script&gt;</pre></mosni-code>
${sections.join('\n        <hr class="divider" />\n')}
      </div>
      <mosni-footer slot="footer">made with love by <a slot="links" href="https://mosni.dev">mosni.dev</a></mosni-footer>
    </mosni-layout>
    <script>
      (function () {
        // Scoped to the page's own nav so it never touches a nested mosni-menu demo's selected state.
        var items = Array.prototype.slice.call(
          document.querySelectorAll('#docs-nav mosni-menu-item[href^="#"]'),
        );
        var entries = items
          .map(function (item) {
            return {
              item: item,
              section: document.getElementById(
                item.getAttribute("href").slice(1),
              ),
            };
          })
          .filter(function (entry) {
            return entry.section;
          });
        if (!entries.length) return;

        var setActive = function (id) {
          items.forEach(function (item) {
            item.toggleAttribute("selected", item.getAttribute("href") === "#" + id);
          });
        };

        var headerHeight =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--header-height",
            ),
          ) || 0;

        var observer = new IntersectionObserver(
          function (observed) {
            var visible = observed.filter(function (entry) {
              return entry.isIntersecting;
            });
            if (!visible.length) return;
            visible.sort(function (a, b) {
              return a.boundingClientRect.top - b.boundingClientRect.top;
            });
            setActive(visible[0].target.id);
          },
          { rootMargin: -headerHeight - 1 + "px 0px -70% 0px", threshold: 0 },
        );
        entries.forEach(function (entry) {
          observer.observe(entry.section);
        });
      })();
    </script>
  </body>
</html>
`;

  await writeFile(path.join(distDir, "index.html"), html);
}
