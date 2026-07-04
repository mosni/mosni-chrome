import { build as esbuildBuild } from "esbuild";
import * as sass from "sass";
import { mkdir, rm, copyFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateDocs } from "./docs.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

// Third entry (D-23): the lazy Prism chunk, built with the exact same options as the two core
// entries but from a different relative source path — see implementation-waves.md §1.5. Core
// mosnicat.js never references this file; code.ts loads it via runtime script injection.
const JS_ENTRIES = [
  ["mosnicat", "src/js/mosnicat.ts"],
  ["cat", "src/js/cat.ts"],
  ["mosnicat-prism", "src/js/prism/index.ts"],
];

async function buildJs() {
  for (const [name, srcPath] of JS_ENTRIES) {
    await esbuildBuild({
      entryPoints: [path.join(rootDir, srcPath)],
      outfile: path.join(distDir, `${name}.js`),
      bundle: true,
      minify: true,
      format: "iife",
      target: "es2020",
    });
  }
}

async function buildCss() {
  const result = sass.compile(path.join(rootDir, "src/scss/mosnicat.scss"), {
    style: "compressed",
  });
  await writeFile(path.join(distDir, "mosnicat.css"), result.css);
}

async function copyAssets() {
  await copyFile(
    path.join(rootDir, "src/assets/mosnicat.png"),
    path.join(distDir, "mosnicat.png"),
  );
}

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await buildJs();
  await buildCss();
  await copyAssets();
  await generateDocs({ rootDir, distDir });
  console.log("build: OK — dist/ written");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
