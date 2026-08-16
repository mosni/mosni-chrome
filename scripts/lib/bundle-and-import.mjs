// Shared by scripts/parity.mjs and scripts/react-behaviour.mjs: bundles a .tsx entry point with
// esbuild (react/react-dom kept external) and dynamic-imports the result, so both scripts can pull
// real React components straight from packages/react/src with no build step of their own.
//
// Written to a REAL FILE on disk inside the repo (not a data: URL, unlike docs.mjs's meta.ts trick)
// because these entries `import ... from "react"` - a bare specifier only resolves correctly if the
// importing module is a real file whose ancestor directories contain node_modules (Node's normal
// resolution algorithm). A data: URL module has no such ancestry, so a bare import from one is not
// reliably resolvable; a file written under the repo (which has react/react-dom as root
// devDependencies) resolves them the ordinary way. This also guarantees the SAME react/react-dom
// module instances the calling script itself imports are the ones the bundled components use -
// required for hooks to work at all (a second react copy inside the bundle would violate the
// rules-of-hooks "one react instance" invariant).
import { build } from "esbuild";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const scratchDir = path.join(rootDir, ".tmp-verify");

let counter = 0;

export async function bundleAndImport(entryFilePath) {
  await mkdir(scratchDir, { recursive: true });
  const outfile = path.join(
    scratchDir,
    `${path.basename(entryFilePath).replace(/\.[^.]+$/, "")}-${++counter}-${Date.now()}.mjs`,
  );
  await build({
    entryPoints: [entryFilePath],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2020",
    jsx: "automatic",
    external: [
      "react",
      "react-dom",
      "react-dom/*",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  });
  return import(pathToFileURL(outfile).href);
}

export async function cleanupScratch() {
  await rm(scratchDir, { recursive: true, force: true });
}
