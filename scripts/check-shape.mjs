import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

// These assets must exist in every build. mosnicat.js is the light bootstrap; mosnicat-core.js is
// the body-half it loads (components + cat).
const REQUIRED_ASSETS = [
  "mosnicat.js",
  "mosnicat-core.js",
  "mosnicat-prism.js",
  "mosnicat-icons.js",
  "login-button.js",
  "mosnicat.css",
  "mosnicat.png",
  "mosni.svg",
];
const BARE_IMPORT_PATTERN = /\brequire\(\s*['"](?!\.)/;
const BARE_ESM_IMPORT_PATTERN = /\bimport\s[^;]*?from\s*['"](?!\.)/;

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
  const core = await readFile(path.join(distDir, "mosnicat-core.js"), "utf8");
  if (core.includes(PRISM_MARKER)) {
    throw new Error(
      `mosnicat-core.js: core bundle must not statically bundle Prism (found '${PRISM_MARKER}' - Prism's language registry marker; Prism must live only in the lazy mosnicat-prism.js chunk)`,
    );
  }
  const prismChunk = await readFile(
    path.join(distDir, "mosnicat-prism.js"),
    "utf8",
  );
  if (!prismChunk.includes(PRISM_MARKER)) {
    throw new Error(
      `mosnicat-prism.js: expected Prism language data (missing '${PRISM_MARKER}') - the lazy chunk did not bundle Prism's languages`,
    );
  }
}

async function assertIconSplit() {
  const core = await readFile(path.join(distDir, "mosnicat-core.js"), "utf8");
  if (core.includes(ICON_MARKER)) {
    throw new Error(
      `mosnicat-core.js: core bundle must not statically bundle the full public icon set (found '${ICON_MARKER}')`,
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

async function assertLoginButtonSelfContained() {
  const src = await readFile(path.join(distDir, "login-button.js"), "utf8");
  const forbidden = [
    "mosnicat.css",
    "mosnicat-core",
    "__MOSNI_BOOTSTRAPPED__",
    'name="viewport"',
  ];
  for (const marker of forbidden) {
    if (src.includes(marker)) {
      throw new Error(
        `login-button.js: must have zero global side effects but contains '${marker}' (contract §2.2)`,
      );
    }
  }
  if (!src.includes("mosni:login")) {
    throw new Error(
      "login-button.js: missing the CONTRACT event name 'mosni:login'",
    );
  }
  if (!src.includes("attachShadow")) {
    throw new Error(
      "login-button.js: expected a shadow root (attachShadow) - must be fully encapsulated",
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
  await assertDependencyFree("mosnicat-core.js");
  await assertDependencyFree("mosnicat-prism.js");
  await assertDependencyFree("mosnicat-icons.js");
  await assertDependencyFree("login-button.js");
  await assertLeanCore();
  await assertIconSplit();
  await assertLoginButtonSelfContained();
  console.log("check-shape: OK -", entries.join(", "));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
