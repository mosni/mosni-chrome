// Generates packages/react/src/icons.generated.tsx from lucide's icon node data (D-R7). The React
// package must ship zero runtime dependencies - it must NOT depend on `lucide` at all - so this
// script runs at build/verify time (lucide is a devDependency of the repo root only) and bakes the
// nine internal glyphs `src/js/icons.ts` uses into plain, static JSX. `--check` mode regenerates in
// memory and diffs against the committed file, so a stale generated file fails the build instead of
// silently drifting from icons.ts.
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import prettier from "prettier";
import {
  X,
  Check,
  Info,
  CircleCheck,
  CircleAlert,
  ChevronDown,
  Copy,
  Menu,
  MoreVertical,
} from "lucide";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outFile = path.join(rootDir, "packages/react/src/icons.generated.tsx");

// Same glyph set, same names, as src/js/icons.ts's `glyphs` map - the two must stay in lockstep by
// hand (this script has no way to import icons.ts's TS source directly), which is why the header
// comment below points back at it explicitly.
const GLYPHS = {
  x: X,
  check: Check,
  info: Info,
  "circle-check": CircleCheck,
  "circle-alert": CircleAlert,
  "chevron-down": ChevronDown,
  copy: Copy,
  menu: Menu,
  "more-vertical": MoreVertical,
};

// Same attribute set src/js/icons.ts's icon() helper applies via lucide's defaultAttributes + its
// own overrides (width/height set to the requested size, aria-hidden added).
const SVG_PROPS = `xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"`;

const toPascal = (kebab) =>
  kebab
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");

// lucide's per-icon module exports an array of [tag, attrs] child tuples (no nested children in the
// nine glyphs used here). Attribute keys (d, cx, cy, r, x1, x2, y1, y2, rx, ry, width, height, x, y)
// are already valid JSX attribute names as-is - none of lucide's own icon data uses a hyphenated
// attribute, so no camelCase conversion is needed at this layer (unlike the wrapping <svg>'s own
// stroke-width/stroke-linecap/stroke-linejoin, which SVG_PROPS above already spells camelCase).
function renderChild([tag, attrs]) {
  const attrString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
  return `<${tag} ${attrString} />`;
}

function renderComponent(name, node) {
  const componentName = `${toPascal(name)}Glyph`;
  const children = node.map(renderChild).join("\n      ");
  return `export function ${componentName}({ size = 20 }: GlyphProps): JSX.Element {
  return (
    <svg ${SVG_PROPS}>
      ${children}
    </svg>
  );
}`;
}

function generate() {
  const components = Object.entries(GLYPHS)
    .map(([name, node]) => renderComponent(name, node))
    .join("\n\n");

  const glyphEntries = Object.keys(GLYPHS)
    .map((name) => `  "${name}": ${toPascal(name)}Glyph,`)
    .join("\n");

  return `// GENERATED FILE - do not edit by hand.
// Produced by \`node scripts/gen-react-icons.mjs\` from the same lucide icon data
// \`src/js/icons.ts\` uses for the nine internal glyphs (D-R7) - the React package ships zero
// runtime dependencies, so these are baked-in static JSX instead of a lucide import. Regenerate
// after changing src/js/icons.ts's glyph set; \`npm run verify\` runs \`--check\` mode and fails the
// build if this file is stale.
import type { JSX } from "react";

export interface GlyphProps {
  size?: 16 | 20;
}

${components}

export const glyphs = {
${glyphEntries}
} as const;

export type IconName = keyof typeof glyphs;
`;
}

// Formatted through prettier (not just hand-indented) so the committed file passes the repo's own
// `prettier --check .` gate in verify, and so --check mode's byte comparison is stable regardless of
// how this script's own string-building happens to lay things out.
async function formatted(source) {
  return prettier.format(source, { filepath: outFile });
}

async function main() {
  const checkMode = process.argv.includes("--check");
  const generated = await formatted(generate());

  if (checkMode) {
    let existing = "";
    try {
      existing = await readFile(outFile, "utf8");
    } catch {
      console.error(
        `gen-react-icons --check: ${outFile} does not exist - run \`node scripts/gen-react-icons.mjs\` to generate it`,
      );
      process.exit(1);
    }
    if (existing !== generated) {
      console.error(
        `gen-react-icons --check: ${outFile} is stale - run \`node scripts/gen-react-icons.mjs\` and commit the result`,
      );
      process.exit(1);
    }
    console.log("gen-react-icons --check: OK - icons.generated.tsx is fresh");
    return;
  }

  await writeFile(outFile, generated);
  console.log(`gen-react-icons: wrote ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
