// Real-browser visual-parity harness (agent-docs → planning-artifacts/visual-parity-implementation-waves.md,
// D-17, D-R6). scripts/parity.mjs proves the three authoring paths agree on DOM STRUCTURE inside jsdom;
// jsdom computes no layout, applies no stylesheet, runs no lazy chunk and paints nothing, so two
// renderings can pass it and still look different in a browser. This renders the same fixture through
// all three paths — the custom element, hand-written classes, and React — in the SAME browser, in the
// SAME run, screenshots each, and fails on any pixel difference. Because every comparison happens
// within one run there are no committed baseline images, no refresh ritual, and the tolerance can
// honestly be zero differing pixels.
//
// Own tier, not part of `npm run verify` — see package.json's `test:visual` and the
// mosni/files D-53/D-61 precedent this follows: the fast jsdom-only inner loop stays fast, and a
// session that changes rendering is not done until both `verify` and `test:visual` are green.
import { createServer } from "node:http";
import { readFile, stat, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { bundleAndImport, cleanupScratch } from "./lib/bundle-and-import.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, "dist");
const diffDir = path.join(distDir, "visual-diff");
const browserBundlePath = path.join(distDir, ".visual-fixtures-bundle.js");
const fixturesEntry = path.join(
  rootDir,
  "packages/react/parity/visual-fixtures.tsx",
);

const DEFAULT_WIDTHS = [1280, 360];

let failed = false;
const classGaps = [];
function fail(message) {
  failed = true;
  console.error(`test:visual: FAIL — ${message}`);
}

async function assertBuilt() {
  for (const f of ["mosnicat.js", "mosnicat-core.js", "mosnicat.css"]) {
    try {
      await stat(path.join(distDir, f));
    } catch {
      throw new Error(
        `dist/${f} missing — run \`node scripts/build.mjs\` first`,
      );
    }
  }
}

// The Node-side orchestrator only ever reads name/html/classHtml/widths — react/react-dom stay
// external here (same as scripts/parity.mjs's read of fixtures.tsx), so this bundle never touches
// `element` and never needs a real React runtime.
async function loadCaseMetadata() {
  const { visualCases } = await bundleAndImport(fixturesEntry);
  return visualCases.map(({ name, html, classHtml, classGap, widths }) => {
    if (classHtml === null && !classGap) {
      throw new Error(
        `${name}: classHtml is null but no classGap reason was given`,
      );
    }
    return {
      name,
      html,
      classHtml,
      classGap,
      widths: widths ?? DEFAULT_WIDTHS,
    };
  });
}

// Path C is mounted as a REAL live createRoot() render, not renderToStaticMarkup output — a
// deliberate deviation from a literal (and, on inspection, self-contradicting) reading of the plan's
// §1: Icon and Code paint/highlight entirely inside a useEffect (the lazy icon/Prism chunk load),
// which never fires from static markup alone — confirmed by reproducing the exact same blank-icon /
// unhighlighted-code gap the docs page (renderToStaticMarkup only, no hydration) shows today. A real
// client mount is the only way this harness can deliver what §0/W2-2 actually promise: Icon's real
// glyph and Code's real Prism highlighting becoming comparable for the first time. Client-only
// INTERACTION (as opposed to initial paint) stays covered by react-behaviour.mjs, unchanged.
async function buildBrowserBundle() {
  await mkdir(distDir, { recursive: true });
  const scratchEntry = path.join(
    rootDir,
    ".tmp-verify",
    "visual-harness-entry.tsx",
  );
  await mkdir(path.dirname(scratchEntry), { recursive: true });
  await writeFile(
    scratchEntry,
    `import { createRoot } from "react-dom/client";
import { visualCases } from ${JSON.stringify(fixturesEntry)};
window.__mosniVisualHarness = {
  mount(name, container) {
    const found = visualCases.find((c) => c.name === name);
    if (!found) throw new Error("visual case not found: " + name);
    const root = createRoot(container);
    root.render(found.element);
    return root;
  },
};
`,
  );
  await build({
    entryPoints: [scratchEntry],
    outfile: browserBundlePath,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    jsx: "automatic",
    // react/react-dom deliberately NOT external — this bundle has to run standalone in a bare
    // browser page with no bundler of its own, so it carries its own React runtime. This is test
    // tooling only (stays in gitignored dist/), not the published @mosni/react package, so it does
    // not touch D-R2 (the package itself still ships zero CSS and no runtime is added to it).
  });
  await rm(scratchEntry, { force: true });
}

function firstTagName(html) {
  const m = html.match(/^\s*<([a-z][a-z0-9-]*)/i);
  if (!m) throw new Error(`could not find a root tag in: ${html.slice(0, 80)}`);
  return m[1].toLowerCase();
}

// Each container sits at the SAME fixed (0,0) position (W1-2) rather than stacked in normal flow —
// three same-content boxes at different Y offsets on one page can anti-alias text very slightly
// differently (sub-pixel font hinting depends on fractional screen position), which is real
// rendering noise, not a component difference. Only one is screenshotted at a time, so the visual
// overlap is harmless.
function renderHarnessPage(kase, width) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
html,body{margin:0;padding:0;background:#282828;}
*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
#path-a, #path-b, #path-c { box-sizing: border-box; width:${width}px; position: absolute; top: 0; left: 0; }
</style>
<script src="/mosnicat.js"></script>
</head><body>
<div id="path-a">${kase.html}</div>
${kase.classHtml !== null ? `<div id="path-b">${kase.classHtml}</div>` : ""}
<div id="path-c"></div>
<script src="/.visual-fixtures-bundle.js"></script>
<script>window.__mosniVisualHarness.mount(${JSON.stringify(kase.name)}, document.getElementById("path-c"));</script>
</body></html>`;
}

async function startServer(cases) {
  const server = createServer(async (req, res) => {
    const m = req.url.match(/^\/__visual\/(\d+)\/(\d+)$/);
    if (m) {
      const kase = cases[Number(m[1])];
      const width = Number(m[2]);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderHarnessPage(kase, width));
      return;
    }
    // Static file serving from dist/, defaulting to index.html — mirrors the shape of `http-server`
    // closely enough for this harness's needs, with no new dependency.
    let filePath = path.join(
      distDir,
      decodeURIComponent(req.url.split("?")[0]),
    );
    if (req.url === "/") filePath = path.join(distDir, "index.html");
    try {
      const data = await readFile(filePath);
      res.writeHead(200);
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

// W0-2: the pixel comparison runs INSIDE the browser (ImageBitmap + OffscreenCanvas), not via a
// Node-side image-diffing dependency (pixelmatch/pngjs) — keeps the Wave-0 dependency ask to one
// package. Returns a diff PNG (base64) highlighting differing pixels in red, only when unequal.
async function comparePixels(page, bufferA, bufferB) {
  return page.evaluate(
    async ({ a, b }) => {
      async function toImageData(base64) {
        const res = await fetch(`data:image/png;base64,${base64}`);
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        return {
          imageData: ctx.getImageData(0, 0, bitmap.width, bitmap.height),
          width: bitmap.width,
          height: bitmap.height,
        };
      }
      const imgA = await toImageData(a);
      const imgB = await toImageData(b);
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        return {
          equal: false,
          diffCount: -1,
          reason: `size differs: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`,
          diffPngBase64: null,
        };
      }
      const dataA = imgA.imageData.data;
      const dataB = imgB.imageData.data;
      let diffCount = 0;
      const diffCanvas = new OffscreenCanvas(imgA.width, imgA.height);
      const diffCtx = diffCanvas.getContext("2d");
      const diffData = diffCtx.createImageData(imgA.width, imgA.height);
      for (let i = 0; i < dataA.length; i += 4) {
        const same =
          dataA[i] === dataB[i] &&
          dataA[i + 1] === dataB[i + 1] &&
          dataA[i + 2] === dataB[i + 2] &&
          dataA[i + 3] === dataB[i + 3];
        if (!same) {
          diffCount++;
          diffData.data[i] = 255;
          diffData.data[i + 1] = 0;
          diffData.data[i + 2] = 0;
          diffData.data[i + 3] = 255;
        } else {
          // Dimmed grayscale so the diff image still shows the shape of the component.
          const gray = Math.round(
            0.3 * dataA[i] + 0.59 * dataA[i + 1] + 0.11 * dataA[i + 2],
          );
          diffData.data[i] = gray;
          diffData.data[i + 1] = gray;
          diffData.data[i + 2] = gray;
          diffData.data[i + 3] = 80;
        }
      }
      if (diffCount === 0) {
        return { equal: true, diffCount: 0, reason: null, diffPngBase64: null };
      }
      diffCtx.putImageData(diffData, 0, 0);
      const blob = await diffCanvas.convertToBlob({ type: "image/png" });
      const buf = await blob.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]);
      return {
        equal: false,
        diffCount,
        reason: null,
        diffPngBase64: btoa(binary),
      };
    },
    { a: bufferA.toString("base64"), b: bufferB.toString("base64") },
  );
}

async function writeDiffArtifacts(
  fixtureName,
  width,
  label,
  bufA,
  bufB,
  result,
) {
  await mkdir(diffDir, { recursive: true });
  const base = `${fixtureName.replace(/\//g, "-")}-${width}-${label}`;
  await writeFile(path.join(diffDir, `${base}-a.png`), bufA);
  await writeFile(path.join(diffDir, `${base}-b.png`), bufB);
  if (result.diffPngBase64) {
    await writeFile(
      path.join(diffDir, `${base}-diff.png`),
      Buffer.from(result.diffPngBase64, "base64"),
    );
  }
  return base;
}

async function runFixtureAtWidth(page, baseUrl, kase, index, width) {
  const url = `${baseUrl}/__visual/${index}/${width}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const tagA = firstTagName(kase.html);
  await page.evaluate((tag) => customElements.whenDefined(tag), tagA);
  // Catches any pending network work (Icon/Code's lazy chunk fetch) generically, without a
  // per-fixture "ready" selector.
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );

  const pathA = page.locator("#path-a");
  const pathC = page.locator("#path-c");
  const bufA = await pathA.screenshot();
  const bufC = await pathC.screenshot();

  const resultAC = await comparePixels(page, bufA, bufC);
  if (!resultAC.equal) {
    const base = await writeDiffArtifacts(
      kase.name,
      width,
      "react",
      bufA,
      bufC,
      resultAC,
    );
    fail(
      `${kase.name} @ ${width}px: element vs React differ (${resultAC.reason ?? `${resultAC.diffCount} px`}) — see dist/visual-diff/${base}-{a,b,diff}.png`,
    );
  }

  if (kase.classHtml !== null) {
    const pathB = page.locator("#path-b");
    const bufB = await pathB.screenshot();
    const resultAB = await comparePixels(page, bufA, bufB);
    if (!resultAB.equal) {
      const base = await writeDiffArtifacts(
        kase.name,
        width,
        "class",
        bufA,
        bufB,
        resultAB,
      );
      fail(
        `${kase.name} @ ${width}px: element vs class differ (${resultAB.reason ?? `${resultAB.diffCount} px`}) — see dist/visual-diff/${base}-{a,b,diff}.png`,
      );
    }
  } else {
    classGaps.push(`${kase.name}: ${kase.classGap}`);
  }
}

async function main() {
  await assertBuilt();
  const cases = await loadCaseMetadata();
  await buildBrowserBundle();

  const { server, baseUrl } = await startServer(cases);
  // --no-sandbox: required to launch Chromium as root in this environment. --no-proxy-server +
  // --ignore-certificate-errors: Icon/Code deliberately hard-code their lazy-chunk URL at
  // https://ui.mosni.dev/... (D-R5 — no script tag for a React consumer to read an origin from), so
  // this harness needs real network egress for those two fixtures specifically, and this sandbox's
  // HTTPS proxy resets Chromium's connections outright (curl through the same proxy works fine —
  // this is Chromium-specific, not a network policy). A normal CI runner only needs real internet
  // access, not these flags.
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--no-sandbox", "--no-proxy-server", "--ignore-certificate-errors"],
  });

  try {
    for (let i = 0; i < cases.length; i++) {
      const kase = cases[i];
      for (const width of kase.widths) {
        const context = await browser.newContext({
          viewport: { width, height: 2000 },
          deviceScaleFactor: 1,
          colorScheme: "dark",
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        try {
          await runFixtureAtWidth(page, baseUrl, kase, i, width);
        } catch (err) {
          fail(`${kase.name} @ ${width}px: ${err.message}`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
    await rm(browserBundlePath, { force: true });
    await cleanupScratch();
  }

  if (classGaps.length > 0) {
    console.log(
      `\ntest:visual — ${classGaps.length} declared class-path gap(s):`,
    );
    for (const g of classGaps) console.log(`  - ${g}`);
  }

  if (failed) process.exit(1);
  console.log(
    `\ntest:visual: OK - ${cases.length} fixture(s) × widths, zero pixel differences`,
  );
}

main().catch(async (err) => {
  console.error(`test:visual: FAIL — ${err.stack ?? err.message}`);
  process.exit(1);
});
