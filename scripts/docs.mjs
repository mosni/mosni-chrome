// Generates the docs page from the fragments in docs/examples/: each fragment is emitted both as a
// live demo and as its shown snippet, so the two can never drift apart.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const examplesDir = path.join(rootDir, "docs/examples");

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

function renderPairedSection(pair, sourceById, componentMetaByTag) {
  const meta = pair.tabs
    .map((tab) => componentMetaByTag.get(tab.id))
    .find(Boolean);
  const metaTables = meta ? `\n${renderComponentMetaTables(meta)}` : "";
  const note = pair.note ? `\n      <p>${pair.note}</p>` : "";
  const tabPanels = pair.tabs
    .map((tab, index) => {
      const source = sourceById.get(tab.id);
      return `        <mosni-tab label="${tab.label}"${index === 0 ? " selected" : ""}>
          <div class="doc-example-demo">
${source}
          </div>
          <mosni-code language="html"><pre>${escapeHtml(source)}</pre></mosni-code>
        </mosni-tab>`;
    })
    .join("\n");
  return `    <section class="doc-example" id="${pair.tabs[0].id}">
      <h2>${pair.title}</h2>${note}
      <mosni-tabs>
${tabPanels}
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

export async function generateDocs({ distDir }) {
  const filenames = (await readdir(examplesDir))
    .filter((f) => f.endsWith(".html"))
    .sort();

  const componentMeta = await loadComponentMeta();
  const componentMetaByTag = new Map(componentMeta.map((m) => [m.tag, m]));

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
    if (!insertedComponentsIntro && id.startsWith("mosni-")) {
      sections.push(COMPONENTS_INTRO);
      insertedComponentsIntro = true;
    }

    if (consumedIds.has(id)) {
      const pair = pairByAnchorId.get(id);
      if (pair) {
        navItems.push({ id, title: pair.title });
        sections.push(
          renderPairedSection(pair, sourceById, componentMetaByTag),
        );
      }
      continue;
    }

    navItems.push({ id, title: titleFromFilename(filename) });
    sections.push(
      renderSection(filename, sourceById.get(id), componentMetaByTag),
    );
  }

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
      .table-scroll {
        overflow-x: auto;
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
        <mosni-code language="html"><pre>&lt;script src="https://ui.mosni.dev/mosnicat.js"&gt;&lt;/script&gt;</pre></mosni-code>
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
