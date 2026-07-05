import { build as esbuildBuild } from "esbuild";
import * as sass from "sass";
import { mkdir, rm, copyFile, writeFile, readFile } from "node:fs/promises";
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
  ["mosnicat-prism", "src/js/prism/index.ts"],
];

async function buildJs({ css, png }) {
  for (const [name, srcPath] of JS_ENTRIES) {
    await esbuildBuild({
      entryPoints: [path.join(rootDir, srcPath)],
      outfile: path.join(distDir, `${name}.js`),
      bundle: true,
      minify: true,
      format: "iife",
      target: "es2020",
      define: {
        __MOSNICAT_CSS__: JSON.stringify(css),
        __MOSNICAT_PNG__: JSON.stringify(png),
      },
    });
  }
}

// Self-hosted fonts (D-27): inline the Latin woff2 as base64 @font-face so the fonts travel inside the
// bundled CSS (→ inside mosnicat.js) with zero external fetch and zero fallback→web-font swap. Roboto v51
// is a variable font — one file covers every weight (font-weight range). Roboto = Apache-2.0, Staatliches
// = OFL-1.1 (both embeddable). Latin subset only; non-Latin text falls back to the sans-serif stack.
async function fontFaceCss() {
  const face = async (family, weight, file) => {
    const b64 = (
      await readFile(path.join(rootDir, "src/assets/fonts", file))
    ).toString("base64");
    return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
  };
  return (
    (await face("Roboto", "100 900", "roboto-latin.woff2")) +
    (await face("Staatliches", "400", "staatliches-latin.woff2"))
  );
}

async function buildCss() {
  const result = sass.compile(path.join(rootDir, "src/scss/mosnicat.scss"), {
    style: "compressed",
  });
  const css = (await fontFaceCss()) + result.css;
  await writeFile(path.join(distDir, "mosnicat.css"), css);
  return css;
}

async function pngDataUri() {
  const bytes = await readFile(path.join(rootDir, "src/assets/mosnicat.png"));
  return "data:image/png;base64," + bytes.toString("base64");
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
  const css = await buildCss();
  const png = await pngDataUri();
  await buildJs({ css, png });
  await copyAssets();
  await generateDocs({ rootDir, distDir });
  console.log("build: OK — dist/ written");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
