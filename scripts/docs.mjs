// Single-source docs/examples generator (D-13). Each example is authored once as a fragment in
// docs/examples/; this generator emits both the live-rendered demo and the shown snippet from
// that one fragment, so the two can never drift apart. Framework-free HTML output.
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

function renderSection(filename, source) {
  const id = filename.replace(/\.html$/, "");
  const title = titleFromFilename(filename);
  return `    <section class="doc-example" id="${id}">
      <h2>${title}</h2>
      <div class="doc-example-demo">
${source}
      </div>
      <pre class="doc-example-snippet"><code>${escapeHtml(source)}</code></pre>
    </section>`;
}

export async function generateDocs({ distDir }) {
  const filenames = (await readdir(examplesDir))
    .filter((f) => f.endsWith(".html"))
    .sort();

  const sections = await Promise.all(
    filenames.map(async (filename) => {
      const source = (
        await readFile(path.join(examplesDir, filename), "utf8")
      ).trimEnd();
      return renderSection(filename, source);
    }),
  );

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>mosnicat</title>
    <link rel="stylesheet" href="mosnicat.css" />
    <style>
      .doc-example {
        margin: 2rem;
      }
      .doc-example-demo {
        border: 1px dashed #666;
        padding: 1rem;
        margin: 1rem 0;
        max-height: 480px;
        overflow: auto;
      }
      .doc-example-snippet {
        background: #222;
        color: #eee;
        padding: 1rem;
        overflow-x: auto;
      }
    </style>
  </head>
  <body>
    <h1>mosnicat</h1>
    <p>
      Live examples and copy-paste snippets for every documented class in the drop-in stylesheet.
      Each example is rendered from, and its snippet shown verbatim from, the same fragment in
      <code>docs/examples/</code> &mdash; the two cannot drift apart.
    </p>
${sections.join("\n")}
    <script src="mosnicat.js"></script>
  </body>
</html>
`;

  await writeFile(path.join(distDir, "index.html"), html);
}
