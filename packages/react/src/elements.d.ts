// GENERATED FILE - do not edit by hand.
// Produced by `node scripts/gen-element-types.mjs` from src/js/components/meta.ts (D-R9 step 1).
// Import this module for its side effect (the ambient JSX.IntrinsicElements augmentation below) to
// author <mosni-*> custom elements directly in JSX/TSX with attribute-level type checking and no
// runtime change at all:
//
//   import "@mosni/react/elements";
//
// Regenerate after changing src/js/components/meta.ts; `npm run verify` runs `--check` mode and
// fails the build if this file is stale.
//
// Augments "react"'s OWN JSX namespace (React.JSX), not a bare `declare global { namespace JSX }`
// (react-plan.md §10): @types/react 19 moved JSX.IntrinsicElements from the global JSX namespace
// into `declare namespace React { namespace JSX { … } }`, and with "jsx": "react-jsx" (automatic
// runtime), TypeScript resolves JSX types through the JSX namespace exported by "react/jsx-runtime"
// (itself a re-export of React.JSX) - a global-namespace augmentation silently merges with nothing
// under this scheme, and every <mosni-*> tag fails "does not exist on type JSX.IntrinsicElements"
// the moment anything actually authors one. Caught building <LoginButton> (Wave 4), the first place
// in this repo that ever wrote a raw <mosni-*> tag in TSX - nothing before it exercised this path.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "mosni-header": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        brand?: string;
        accent?: string;
        href?: string;
        tagline?: string;
        "no-logo"?: boolean;
      };
      "mosni-layout": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {};
      "mosni-menu": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
      };
      "mosni-menu-item": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        title?: string;
        subtitle?: string;
        href?: string;
        selected?: boolean;
      };
      "mosni-panel": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        heading?: string;
        size?: string;
      };
      "mosni-footer": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {};
      "mosni-field": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
        type?: string;
        name?: string;
        value?: string;
        required?: boolean;
        help?: string;
        error?: string;
      };
      "mosni-switch": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        checked?: boolean;
        disabled?: boolean;
        label?: string;
        name?: string;
        value?: string;
      };
      "mosni-chips": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
        placeholder?: string;
        "filter-threshold"?: number;
        "max-height"?: string;
        "empty-text"?: string;
      };
      "mosni-modal": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        open?: boolean;
        heading?: string;
      };
      "mosni-tooltip": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        text?: string;
      };
      "mosni-dropdown": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
      };
      "mosni-dropdown-item": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        value?: string;
        variant?: string;
        disabled?: boolean;
      };
      "mosni-icon": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        name?: string;
        size?: number;
      };
      "mosni-logo": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        alt?: string;
      };
      "mosni-toast": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        variant?: string;
      };
      "mosni-lightbox": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        full?: string;
        caption?: string;
      };
      "mosni-code": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        language?: string;
        label?: string;
        "no-copy"?: boolean;
        "no-header"?: boolean;
      };
      "mosni-accordion": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        exclusive?: boolean;
      };
      "mosni-tabs": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {};
      "mosni-tab": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
        selected?: boolean;
      };
      "mosni-login-button": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        text?: string;
        loading?: boolean;
        size?: string;
      };
    }
  }
}

export {};
