import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

// The mosnicat drop-in contract (D-2b): these four assets must exist in every build. Wave 3 adds
// the docs site (index.html + any generated assets) alongside them.
const REQUIRED_ASSETS = [
  "mosnicat.js",
  "cat.js",
  "mosnicat.css",
  "mosnicat.png",
];
const BARE_IMPORT_PATTERN = /\brequire\(\s*['"](?!\.)/;
const BARE_ESM_IMPORT_PATTERN = /\bimport\s[^;]*?from\s*['"](?!\.)/;

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

async function main() {
  const entries = await readdir(distDir);
  for (const file of REQUIRED_ASSETS) {
    if (!entries.includes(file)) {
      throw new Error(`dist/ is missing required asset: ${file}`);
    }
  }
  await assertDependencyFree("mosnicat.js");
  await assertDependencyFree("cat.js");
  console.log("check-shape: OK —", entries.join(", "));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
