import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

// The mosnicat drop-in contract (D-2b): these four assets must exist in every build. Wave 3 adds
// the docs site (index.html + any generated assets) alongside them.
const REQUIRED_ASSETS = [
  "mosnicat.js",
  "mosnicat-prism.js",
  "mosnicat.css",
  "mosnicat.png",
];
const BARE_IMPORT_PATTERN = /\brequire\(\s*['"](?!\.)/;
const BARE_ESM_IMPORT_PATTERN = /\bimport\s[^;]*?from\s*['"](?!\.)/;

// The Prism-language registry marker (D-23): proves core never statically bundles Prism, and
// that the lazy chunk actually contains the language data (not just an empty/failed import).
const PRISM_MARKER = "languages.markup";

async function assertDependencyFree(file) {
  const contents = await readFile(path.join(distDir, file), "utf8");
  if (
    BARE_IMPORT_PATTERN.test(contents) ||
    BARE_ESM_IMPORT_PATTERN.test(contents)
  ) {
    throw new Error(
      `${file}: emitted JS must be dependency-free (found a bare require()/import of a node_modules package)`,
    );
  }
}

async function assertLeanCore() {
  const core = await readFile(path.join(distDir, "mosnicat.js"), "utf8");
  if (core.includes(PRISM_MARKER)) {
    throw new Error(
      `mosnicat.js: core bundle must not statically bundle Prism (found '${PRISM_MARKER}' — Prism's language registry marker; D-23 requires Prism to live only in the lazy mosnicat-prism.js chunk)`,
    );
  }
  const prismChunk = await readFile(
    path.join(distDir, "mosnicat-prism.js"),
    "utf8",
  );
  if (!prismChunk.includes(PRISM_MARKER)) {
    throw new Error(
      `mosnicat-prism.js: expected Prism language data (missing '${PRISM_MARKER}') — the lazy chunk did not bundle Prism's languages`,
    );
  }
}

// Self-contained fonts (D-27): the built CSS must carry the inlined base64 @font-face, and the core JS
// must NOT reach out to an external font host — otherwise the fallback→web-font swap returns.
async function assertSelfHostedFonts() {
  const css = await readFile(path.join(distDir, "mosnicat.css"), "utf8");
  if (!css.includes("@font-face") || !css.includes("data:font/woff2;base64,")) {
    throw new Error(
      "mosnicat.css: missing the inlined base64 @font-face (self-hosted fonts, D-27)",
    );
  }
  const core = await readFile(path.join(distDir, "mosnicat.js"), "utf8");
  if (core.includes("fonts.googleapis.com")) {
    throw new Error(
      "mosnicat.js: must not inject an external font stylesheet (fonts.googleapis.com) — fonts are self-hosted (D-27)",
    );
  }
}

async function main() {
  const entries = await readdir(distDir);
  for (const file of REQUIRED_ASSETS) {
    if (!entries.includes(file)) {
      throw new Error(`dist/ is missing required asset: ${file}`);
    }
  }
  await assertDependencyFree("mosnicat.js");
  await assertDependencyFree("mosnicat-prism.js");
  await assertLeanCore();
  await assertSelfHostedFonts();
  console.log("check-shape: OK —", entries.join(", "));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
