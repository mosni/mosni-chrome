import { build as esbuildBuild } from "esbuild";
import * as sass from "sass";
import { mkdir, rm, copyFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateDocs } from "./docs.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

async function buildJs() {
  for (const entry of ["mosnicat", "cat"]) {
    await esbuildBuild({
      entryPoints: [path.join(rootDir, "src/js", `${entry}.ts`)],
      outfile: path.join(distDir, `${entry}.js`),
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
