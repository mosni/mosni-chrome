// Single-source docs/examples generator (D-13). Each example is authored once as a fragment in
// docs/examples/; this generator emits both the live-rendered demo and the shown snippet from
// that one fragment, so the two can never drift apart. Framework-free HTML output.
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

// Wave 2 (D-13 "Components" section): compile the side-effect-free components/meta.ts with
// esbuild and pull the componentMeta array out of the compiled ESM via a data: URI import - this
// runs Node-side (no DOM/customElements), so meta.ts must stay side-effect-free (see its own
// header comment).
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
            <td><code>${escapeHtml(attr.default ?? "—")}</code></td>
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
  // Component fragments are named after their tag exactly (e.g. mosni-header.html -> tag
  // mosni-header) - every non-component fragment (the original 10 + new utility fragments) has no
  // matching entry and renders exactly as before.
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

// Wave 3 (D2/D3): the class-authored fragment and its component twin render pixel-identically
// (D-17), so instead of two near-duplicate standalone sections, each pair below becomes one
// <mosni-tabs> section (dogfooding our own tabs widget). Every fragment id listed in `tabs` is
// consumed here and never rendered as its own standalone section. The section is anchored at the
// first (Component) tab's fragment id, so it takes that fragment's place in the page.
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
    note: `<code>.text-container</code> is kept as a working alias of <code>.content-container</code>
      &mdash; the chrome-light reading surface for content pages (guidelines &sect;5.7), which is
      why it shares <code>.panel</code>'s card look.`,
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
      <h2>Components</h2>
      <p>
        Every surface below ships two first-class authoring paths that render identically: drop in
        the custom element tag for terse markup, or hand-write the plain HTML/class version for
        full control and the strongest no-JS story.
      </p>
      <p>
        The demos below show both paths side by side where it matters, followed by the
        attribute/slot/event contract for each component.
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
  for (const filename of filenames) {
    const id = filename.replace(/\.html$/, "");
    if (!insertedComponentsIntro && id.startsWith("mosni-")) {
      sections.push(COMPONENTS_INTRO);
      insertedComponentsIntro = true;
    }
    if (consumedIds.has(id)) {
      const pair = pairByAnchorId.get(id);
      if (pair)
        sections.push(
          renderPairedSection(pair, sourceById, componentMetaByTag),
        );
      continue;
    }
    sections.push(
      renderSection(filename, sourceById.get(id), componentMetaByTag),
    );
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>mosnicat</title>
    <link rel="stylesheet" href="mosnicat.css" />
    <!-- In <head> (blocking) so the bundle registers components + injects styles/fonts BEFORE the body
         is parsed — otherwise the page paints, then the late script reflows it (component upgrade + style
         + font swap). This is the recommended drop-in placement for consumers too (D-27: CSS lives in JS). -->
    <script src="mosnicat.js"></script>
    <style>
      body {
        padding-inline: 1rem;
      }
      .doc-example {
        margin: 2rem 0;
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
    <h1>mosnicat</h1>
    <p>
      A drop-in design system - no framework, no build step. Add two tags and every class and
      <code>&lt;mosni-*&gt;</code> element below just works:
    </p>
    <mosni-code language="html"><pre>&lt;link rel="stylesheet" href="https://ui.mosni.dev/mosnicat.css"&gt;
&lt;script src="https://ui.mosni.dev/mosnicat.js" defer&gt;&lt;/script&gt;</pre></mosni-code>
    <p>
      Every example below is rendered from, and shows its snippet verbatim from, the same fragment
      &mdash; the two can't drift apart.
    </p>
${sections.join('\n    <hr class="divider" />\n')}
  </body>
</html>
`;

  await writeFile(path.join(distDir, "index.html"), html);
}
