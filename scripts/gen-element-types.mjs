// Generates packages/react/src/elements.d.ts: JSX.IntrinsicElements declarations for every
// <mosni-*> custom element tag, from src/js/components/meta.ts (D-R9 step 1). This is the "one
// import deletes four hand-maintained declare-module blocks" step - it adds ZERO runtime behaviour,
// only types, so a consumer can keep authoring `<mosni-header brand="...">` etc. directly in JSX
// with no React wrapper at all. `--check` mode fails the build on drift, same contract as
// gen-react-icons.mjs.
//
// meta.ts documents 21 of the 22 tags (every tag under src/js/components/). The 22nd,
// <mosni-login-button>, lives outside components/ (src/js/login-button.ts) and is not part of the
// docs-table generator's data, so its declaration is hand-written below from login-button.ts's own
// observed attributes (text/loading/size) rather than generated from meta.ts.
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import prettier from "prettier";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outFile = path.join(rootDir, "packages/react/src/elements.d.ts");

async function loadComponentMeta() {
  const { outputFiles } = await build({
    entryPoints: [path.join(rootDir, "src/js/components/meta.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
  });
  const code = outputFiles[0].text;
  const mod = await import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
  return mod.componentMeta;
}

// meta.ts's AttributeMeta.type is a loose doc string ("string"/"boolean"/"number"); every documented
// attribute uses exactly one of those three today, so this stays a small explicit map rather than
// eval-ing the doc string as a TS type.
function tsType(attr) {
  if (attr.type === "boolean") return "boolean";
  if (attr.type === "number") return "number";
  return "string";
}

function renderTagInterface(meta) {
  const props = meta.attributes
    .map((attr) => `  "${attr.name}"?: ${tsType(attr)};`)
    .join("\n");
  return `    "${meta.tag}": DetailedHTMLProps<
      HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
${props}
    };`;
}

// Hand-written: see the file header comment for why this one isn't sourced from meta.ts.
const LOGIN_BUTTON_INTERFACE = `    "mosni-login-button": DetailedHTMLProps<
      HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      text?: string;
      loading?: boolean;
      size?: string;
    };`;

async function generate() {
  const componentMeta = await loadComponentMeta();
  const tagInterfaces = componentMeta.map(renderTagInterface).join("\n");

  const source = `// GENERATED FILE - do not edit by hand.
// Produced by \`node scripts/gen-element-types.mjs\` from src/js/components/meta.ts (D-R9 step 1).
// Import this module for its side effect (the ambient JSX.IntrinsicElements augmentation below) to
// author <mosni-*> custom elements directly in JSX/TSX with attribute-level type checking and no
// runtime change at all:
//
//   import "@mosni/react/elements";
//
// Regenerate after changing src/js/components/meta.ts; \`npm run verify\` runs \`--check\` mode and
// fails the build if this file is stale.
//
// Augments "react"'s OWN JSX namespace (React.JSX), not a bare \`declare global { namespace JSX }\`
// (react-plan.md §10): @types/react 19 moved JSX.IntrinsicElements from the global JSX namespace
// into \`declare namespace React { namespace JSX { … } }\`, and with "jsx": "react-jsx" (automatic
// runtime), TypeScript resolves JSX types through the JSX namespace exported by "react/jsx-runtime"
// (itself a re-export of React.JSX) - a global-namespace augmentation silently merges with nothing
// under this scheme, and every <mosni-*> tag fails "does not exist on type JSX.IntrinsicElements"
// the moment anything actually authors one. Caught building <LoginButton> (Wave 4), the first place
// in this repo that ever wrote a raw <mosni-*> tag in TSX - nothing before it exercised this path.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
${tagInterfaces}
${LOGIN_BUTTON_INTERFACE}
    }
  }
}

export {};
`;
  return prettier.format(source, { filepath: outFile });
}

async function main() {
  const checkMode = process.argv.includes("--check");
  const generated = await generate();

  if (checkMode) {
    let existing = "";
    try {
      existing = await readFile(outFile, "utf8");
    } catch {
      console.error(
        `gen-element-types --check: ${outFile} does not exist - run \`node scripts/gen-element-types.mjs\` to generate it`,
      );
      process.exit(1);
    }
    if (existing !== generated) {
      console.error(
        `gen-element-types --check: ${outFile} is stale - run \`node scripts/gen-element-types.mjs\` and commit the result`,
      );
      process.exit(1);
    }
    console.log("gen-element-types --check: OK - elements.d.ts is fresh");
    return;
  }

  await writeFile(outFile, generated);
  console.log(`gen-element-types: wrote ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
