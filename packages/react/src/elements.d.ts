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
import type * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "mosni-header": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        brand?: string;
        accent?: string;
        href?: string;
        tagline?: string;
        "no-logo"?: boolean;
      };
      "mosni-layout": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {};
      "mosni-menu": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
      };
      "mosni-menu-item": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        title?: string;
        subtitle?: string;
        href?: string;
        selected?: boolean;
      };
      "mosni-panel": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        heading?: string;
        size?: string;
      };
      "mosni-footer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {};
      "mosni-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
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
      "mosni-switch": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        checked?: boolean;
        disabled?: boolean;
        label?: string;
        name?: string;
        value?: string;
      };
      "mosni-chips": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
        placeholder?: string;
        "filter-threshold"?: number;
        "max-height"?: string;
        "empty-text"?: string;
      };
      "mosni-modal": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        open?: boolean;
        heading?: string;
      };
      "mosni-tooltip": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        text?: string;
      };
      "mosni-dropdown": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
      };
      "mosni-dropdown-item": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        value?: string;
        variant?: string;
        disabled?: boolean;
      };
      "mosni-icon": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        name?: string;
        size?: number;
      };
      "mosni-logo": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        alt?: string;
      };
      "mosni-toast": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        variant?: string;
      };
      "mosni-lightbox": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        full?: string;
        caption?: string;
      };
      "mosni-code": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        language?: string;
        label?: string;
        "no-copy"?: boolean;
        "no-header"?: boolean;
      };
      "mosni-accordion": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        exclusive?: boolean;
      };
      "mosni-tabs": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {};
      "mosni-tab": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        label?: string;
        selected?: boolean;
      };
      "mosni-login-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
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
