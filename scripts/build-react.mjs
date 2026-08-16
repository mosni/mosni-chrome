// Builds packages/react (@mosni/react) and packs it into the root dist/ as a tarball (D-R5): no
// registry, consumers depend on a URL. Called from scripts/build.mjs's main().
import { build as esbuildBuild } from "esbuild";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, cp, writeFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

async function runTsc(reactDir) {
  const tscBin = path.join(reactDir, "..", "..", "node_modules", ".bin", "tsc");
  const tsconfig = path.join(reactDir, "tsconfig.json");
  // No --noEmit here (unlike verify's typecheck-only invocation): this is the declaration-emit pass,
  // driven entirely by tsconfig.json's own emitDeclarationOnly/declaration/rootDir/outDir.
  await execFileAsync(tscBin, ["-p", tsconfig]);
}

// packages/react/src imports two things outside its own directory: nothing at the JS-bundling layer
// (esbuild happily bundles src/js/shared/*.ts by relative path, no rootDir concept there) but tsc's
// declaration-emit pass DOES care - see tsconfig.json's rootDir comment. rootDir is set to the repo
// root so tsc can emit declarations for those cross-package imports at all (TS6059/TS5011
// otherwise), which means the *.d.ts land nested at dist/packages/react/src/* and
// dist/src/js/shared/*. This flattens the former up to dist/ (where package.json's "types"/"exports"
// expect them) and discards the latter (dist/src/js/shared/*.d.ts) - nothing in the public API
// surface re-exports those types (positionDropdownMenu/positionTooltip/loadChunk are internal
// implementation details of <Dropdown>/<Tooltip>/<Code>/<Icon>, never part of an exported Props
// type), so the stray declaration files are unreachable from a consumer and safe to drop.
async function flattenDeclarations(distDir) {
  const nested = path.join(distDir, "packages", "react", "src");
  const entries = await readdir(nested, { withFileTypes: true });
  for (const entry of entries) {
    await cp(path.join(nested, entry.name), path.join(distDir, entry.name), {
      recursive: true,
    });
  }
  await rm(path.join(distDir, "packages"), { recursive: true, force: true });
  await rm(path.join(distDir, "src"), { recursive: true, force: true });
}

// The generated elements.d.ts (D-R9 step 1) is a pure ambient `declare global` module with no
// runtime content - tsc's declaration-only pass above doesn't re-emit anything for a .d.ts INPUT
// file (there is nothing to emit; it's already a declaration), so it has to be copied across
// verbatim here instead. `import "@mosni/react/elements"` is a plain (non-`import type`) side-effect
// import, which TS always keeps in the emitted JS regardless of the imported module's contents - so
// module resolution needs a real, if trivial, runtime file behind it too.
async function writeElementsExport(reactDir, distDir) {
  await cp(
    path.join(reactDir, "src", "elements.d.ts"),
    path.join(distDir, "elements.d.ts"),
  );
  await writeFile(
    path.join(distDir, "elements.js"),
    '// Trivial runtime module backing the `./elements` export\'s "import" condition (D-R9 step 1).\n' +
      "// All the actual content is in the sibling elements.d.ts's ambient JSX.IntrinsicElements\n" +
      "// augmentation - importing this file is a types-only, zero-behaviour step.\nexport {};\n",
  );
}

async function packTarball(reactDir, rootDistDir) {
  const pkg = JSON.parse(
    await readFile(path.join(reactDir, "package.json"), "utf8"),
  );
  const { stdout } = await execFileAsync(
    "npm",
    ["pack", "--json", "--pack-destination", rootDistDir],
    { cwd: reactDir },
  );
  const [{ filename }] = JSON.parse(stdout);
  const versionedPath = path.join(rootDistDir, filename);
  const latestPath = path.join(rootDistDir, "mosni-react.tgz");
  await cp(versionedPath, latestPath);
  return { version: pkg.version, versionedPath, latestPath };
}

export async function buildReactPackage({ rootDir, distDir }) {
  const reactDir = path.join(rootDir, "packages/react");
  const reactDistDir = path.join(reactDir, "dist");

  await rm(reactDistDir, { recursive: true, force: true });
  await mkdir(reactDistDir, { recursive: true });

  await esbuildBuild({
    entryPoints: [path.join(reactDir, "src/index.ts")],
    outfile: path.join(reactDistDir, "index.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    // Zero runtime dependencies (D-R4): react/react-dom/its jsx-runtime stay external so the
    // consumer's own React is what actually renders, and so check-shape.mjs can assert none of it
    // got inlined.
    external: ["react", "react-dom", "react/jsx-runtime", "react-dom/*"],
  });

  await runTsc(reactDir);
  await flattenDeclarations(reactDistDir);
  await writeElementsExport(reactDir, reactDistDir);

  const { version } = await packTarball(reactDir, distDir);
  console.log(`build-react: OK - @mosni/react ${version} packed to dist/`);
}
