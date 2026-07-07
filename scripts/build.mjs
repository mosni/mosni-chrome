import { build as esbuildBuild } from "esbuild";
import * as sass from "sass";
import { mkdir, rm, copyFile, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateDocs } from "./docs.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");

const JS_ENTRIES = [
  ["mosnicat", "src/js/mosnicat.ts"],
  ["mosnicat-core", "src/js/core.ts"],
  ["mosnicat-prism", "src/js/prism/index.ts"],
  ["mosnicat-icons", "src/js/icons-all/index.ts"],
  ["login-button", "src/js/login-button.ts"],
];

async function buildJs({ png, staatliches, mark }) {
  for (const [name, srcPath] of JS_ENTRIES) {
    await esbuildBuild({
      entryPoints: [path.join(rootDir, srcPath)],
      outfile: path.join(distDir, `${name}.js`),
      bundle: true,
      minify: true,
      format: "iife",
      target: "es2020",
      define: {
        __MOSNICAT_PNG__: JSON.stringify(png),
        __STAATLICHES_WOFF2__: JSON.stringify(staatliches),
        __MOSNI_MARK_SVG__: JSON.stringify(mark),
      },
    });
  }
}

// Inline the Latin woff2 fonts as base64 @font-face so the fonts travel inside mosnicat.css with no
// external fetch and no fallback→web-font swap. Roboto (Apache-2.0) is variable — one file covers
// every weight; Staatliches (OFL-1.1). Latin subset only; other scripts fall back to sans-serif.
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

async function staatlichesDataUri() {
  const bytes = await readFile(
    path.join(rootDir, "src/assets/fonts/staatliches-latin.woff2"),
  );
  return "data:font/woff2;base64," + bytes.toString("base64");
}

async function markSvg() {
  const raw = await readFile(
    path.join(rootDir, "src/assets/mosni.svg"),
    "utf8",
  );
  return raw.replace(/^[\s\S]*?(?=<svg)/, "").trim();
}

async function copyAssets() {
  await copyFile(
    path.join(rootDir, "src/assets/mosnicat.png"),
    path.join(distDir, "mosnicat.png"),
  );
  await copyFile(
    path.join(rootDir, "src/assets/mosni.svg"),
    path.join(distDir, "mosni.svg"),
  );
}

async function writeLoginButtonDemo() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>mosni login button - demo</title>
  </head>
  <body style="margin:0;font-family:system-ui">
    <section style="background:#fff;color:#111;padding:2rem;display:flex;flex-direction:column;gap:1rem;align-items:flex-start">
      <h1>on a light page</h1>
      <mosni-login-button></mosni-login-button>
      <mosni-login-button size="small"></mosni-login-button>
      <mosni-login-button size="large"></mosni-login-button>
      <mosni-login-button text="continue"></mosni-login-button>
      <mosni-login-button loading></mosni-login-button>
    </section>
    <section style="background:#1b1b1b;color:#eee;padding:2rem;display:flex;flex-direction:column;gap:1rem;align-items:flex-start">
      <h1>on a dark page</h1>
      <mosni-login-button></mosni-login-button>
    </section>
    <p id="log" style="padding:2rem;margin:0">no event yet</p>
    <script src="login-button.js"></script>
    <script>
      document.addEventListener("mosni:login", () => {
        document.getElementById("log").textContent = "mosni:login received @ " + Date.now();
      });
    </script>
  </body>
</html>
`;
  await writeFile(path.join(distDir, "login-button.html"), html);
}

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await buildCss();
  const png = await pngDataUri();
  const staatliches = await staatlichesDataUri();
  const mark = await markSvg();
  await buildJs({ png, staatliches, mark });
  await copyAssets();
  await generateDocs({ rootDir, distDir });
  await writeLoginButtonDemo();
  console.log("build: OK - dist/ written");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
