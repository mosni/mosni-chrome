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
  "mosnicat-icons.js",
  "mosnicat.css",
  "mosnicat.png",
];
const BARE_IMPORT_PATTERN = /\brequire\(\s*['"](?!\.)/;
const BARE_ESM_IMPORT_PATTERN = /\bimport\s[^;]*?from\s*['"](?!\.)/;

// The Prism-language registry marker (D-23): proves core never statically bundles Prism, and
// that the lazy chunk actually contains the language data (not just an empty/failed import).
const PRISM_MARKER = "languages.markup";
const ICON_MARKER = "M12 15v5s3.03";

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

async function assertIconSplit() {
  const core = await readFile(path.join(distDir, "mosnicat.js"), "utf8");
  if (core.includes(ICON_MARKER)) {
    throw new Error(
      `mosnicat.js: core bundle must not statically bundle the full public icon set (found '${ICON_MARKER}')`,
    );
  }
  const iconChunk = await readFile(
    path.join(distDir, "mosnicat-icons.js"),
    "utf8",
  );
  if (!iconChunk.includes(ICON_MARKER)) {
    throw new Error(
      `mosnicat-icons.js: expected the public icon chunk to contain Rocket's path marker '${ICON_MARKER}'`,
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
  await assertDependencyFree("mosnicat-icons.js");
  await assertLeanCore();
  await assertIconSplit();
  console.log("check-shape: OK —", entries.join(", "));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
