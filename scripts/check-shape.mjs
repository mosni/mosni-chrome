import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { bundleAndImport, cleanupScratch } from "./lib/bundle-and-import.mjs";

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

// A README.md mentions of "react" would false-positive a naive substring search, so these look for
// an actual bare import/require of the package - the same shape BARE_IMPORT_PATTERN/
// BARE_ESM_IMPORT_PATTERN already check for the core bundles, just anchored to these two names.
const REACT_IMPORT_PATTERN =
  /\b(?:require\(\s*['"]react|from\s*['"]react(?:\/|['"]))/;
// React tags its internals export with this suffix in every version (…_DO_NOT_USE_OR_YOU_WILL_BE_
// FIRED), so it appears iff React's own implementation was inlined into the bundle - a marker that
// survives minification, unlike a version string or a comment.
const REACT_INLINED_PATTERN = /_DO_NOT_USE_OR_YOU_WILL_BE_FIRED/;
const LUCIDE_IMPORT_PATTERN =
  /\b(?:require\(\s*['"]lucide|from\s*['"]lucide['"])/;

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

// D-R5 (distribution is a tarball, not a registry) + D-R4 (zero runtime dependencies) — see §5.3.
async function assertReactPackageShape() {
  const pkg = JSON.parse(
    await readFile(path.join(rootDir, "packages/react/package.json"), "utf8"),
  );
  const versionedName = `mosni-react-${pkg.version}.tgz`;
  const entries = await readdir(distDir);
  if (!entries.includes(versionedName)) {
    throw new Error(`dist/ is missing required asset: ${versionedName}`);
  }
  if (!entries.includes("mosni-react.tgz")) {
    throw new Error("dist/ is missing required asset: mosni-react.tgz");
  }

  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
    throw new Error(
      "packages/react/package.json: must declare ZERO runtime dependencies (D-R4) - found " +
        Object.keys(pkg.dependencies).join(", "),
    );
  }
  if (!pkg.peerDependencies?.react) {
    throw new Error(
      "packages/react/package.json: react must be declared as a peerDependency (D-R4)",
    );
  }
  // `import "@mosni/react/elements"` is a side-effect import, which TS always keeps in the emitted
  // JS - so the ./elements subpath needs a real runtime file behind it, not only a "types"
  // condition, or every consumer taking D-R9 step 1 fails module resolution at runtime.
  if (!pkg.exports?.["./elements"]?.import) {
    throw new Error(
      'packages/react/package.json: the "./elements" export needs an "import" condition - a ' +
        "types-only condition breaks the side-effect import that D-R9 step 1 tells consumers to write",
    );
  }

  const bundle = await readFile(
    path.join(rootDir, "packages/react/dist/index.js"),
    "utf8",
  );
  // "react is not bundled" means the OPPOSITE of the core bundles' dependency-free rule: react must
  // appear as a bare EXTERNAL import (the consumer's own copy renders), and React's implementation
  // must not have been inlined. Asserting the absence of `from "react"` would demand exactly the
  // wrong thing - esbuild emits that import precisely because react stayed external.
  if (!REACT_IMPORT_PATTERN.test(bundle)) {
    throw new Error(
      "packages/react/dist/index.js: expected a bare external import of react - the consumer's own " +
        "React must be what renders (D-R4)",
    );
  }
  if (REACT_INLINED_PATTERN.test(bundle)) {
    throw new Error(
      "packages/react/dist/index.js: React's implementation got inlined into the bundle - react " +
        "must stay external (D-R4)",
    );
  }
  if (LUCIDE_IMPORT_PATTERN.test(bundle)) {
    throw new Error(
      "packages/react/dist/index.js: must not bundle lucide - the nine internal glyphs are baked " +
        "in as static JSX by scripts/gen-react-icons.mjs instead (D-R7)",
    );
  }
}

// meta.ts's tag/attribute naming is kebab-case throughout (mosnicat.md's own contract); the React
// side is camelCase throughout (react-plan.md §3) - both conversions are systematic enough to
// derive rather than hand-list, and every one of the 21 documented tags does follow it (verified:
// mosni-menu-item -> MenuItem, filter-threshold -> filterThreshold, no-logo -> noLogo, etc).
function toPascalCase(tag) {
  return tag
    .replace(/^mosni-/, "")
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}
function toCamelCase(attr) {
  const [first, ...rest] = attr.split("-");
  return (
    first + rest.map((part) => part[0].toUpperCase() + part.slice(1)).join("")
  );
}

// react-plan.md §4's own component table deliberately gives <Tab> no per-tab `selected` prop -
// selection is lifted to the PARENT <Tabs> (`selectedIndex`/`defaultSelectedIndex`), a more
// idiomatic React shape than a boolean repeated on every child. This is the one documented,
// intentional gap between a tag's attribute set and its React Props type; every other tag's
// attributes must show up as camelCase props with no exceptions.
const ATTRIBUTE_COVERAGE_EXCEPTIONS = new Set(["mosni-tab:selected"]);

// D-R9's converse (§5.3): every documented tag needs a React export, and every documented
// attribute needs a camelCase prop on that component - otherwise the React layer can silently fall
// behind the custom elements as meta.ts grows new attributes and nothing catches it. A textual scan
// (not full type introspection) matches this file's existing style of structural/marker checks
// (PRISM_MARKER, ICON_MARKER, the forbidden-string list above) rather than pulling in the TS
// compiler API for one check.
async function assertReactApiCoverage() {
  const { componentMeta } = await bundleAndImport(
    path.join(rootDir, "src/js/components/meta.ts"),
  );
  const indexSrc = await readFile(
    path.join(rootDir, "packages/react/src/index.ts"),
    "utf8",
  );
  const componentsDir = path.join(rootDir, "packages/react/src/components");

  for (const meta of componentMeta) {
    const componentName = toPascalCase(meta.tag);
    // Not a fixed `export { X }` substring: some exports share a line with a sibling (Toast's
    // `export { Toast, useToast } from "./components/Toast";`) - a word-boundary match against any
    // `export { … }` block is what actually matters.
    const exportPattern = new RegExp(
      `export\\s*\\{[^}]*\\b${componentName}\\b[^}]*\\}`,
    );
    if (!exportPattern.test(indexSrc)) {
      throw new Error(
        `packages/react/src/index.ts: missing an "export { ${componentName} }" for documented tag ${meta.tag} (§5.3)`,
      );
    }

    const componentFile = path.join(componentsDir, `${componentName}.tsx`);
    let componentSrc;
    try {
      componentSrc = await readFile(componentFile, "utf8");
    } catch {
      throw new Error(
        `packages/react/src/components/${componentName}.tsx does not exist for documented tag ${meta.tag} (§5.3)`,
      );
    }

    for (const attr of meta.attributes) {
      if (ATTRIBUTE_COVERAGE_EXCEPTIONS.has(`${meta.tag}:${attr.name}`))
        continue;
      const camel = toCamelCase(attr.name);
      if (!componentSrc.includes(camel)) {
        throw new Error(
          `packages/react/src/components/${componentName}.tsx: no "${camel}" prop found for ` +
            `${meta.tag}'s documented "${attr.name}" attribute (§5.3)`,
        );
      }
    }
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
  await assertReactPackageShape();
  await assertReactApiCoverage();
  await cleanupScratch();
  console.log("check-shape: OK -", entries.join(", "));
}

main().catch(async (err) => {
  await cleanupScratch();
  console.error(err.message);
  process.exit(1);
});
