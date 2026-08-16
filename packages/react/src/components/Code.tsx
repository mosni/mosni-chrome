import { forwardRef, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { mergeClassName } from "../internal/merge-class-name";
import { CheckGlyph, CopyGlyph } from "../icons.generated";
import { loadChunk } from "../../../../src/js/shared/load-chunk";

declare global {
  interface Window {
    mosniPrism?: { highlight: (el: Element) => void };
  }
}

// code.ts resolves this against document.currentScript's own origin (base-element.ts's
// assetBase); a React consumer has no such script tag, so this is a fixed default instead - same
// choice, same origin, as <Logo>'s ASSET_BASE (D-R5's tarball is served from the same host).
const PRISM_CHUNK_URL = "https://ui.mosni.dev/mosnicat-prism.js";
const COPY_REVERT_MS = 1500;

export interface CodeProps {
  children: string;
  language?: string;
  label?: string;
  noCopy?: boolean;
  noHeader?: boolean;
  className?: string;
}

// The raw text renders SYNCHRONOUSLY, in the same pass as everything else - the exact bug D-R1's
// rationale calls out (agent-docs → planning-artifacts/react-path-implementation-waves.md §1): mosni/files' hand-rolled CodeBlock wrapper inserted the
// host EMPTY and appended text in a useEffect, and <mosni-code> (reading `this.textContent` in
// connectedCallback) rendered an empty block against it. Only the HIGHLIGHTING needs an effect -
// that is inherent to Prism (an imperative library that mutates a DOM subtree directly), not
// something this component adds; code.ts has exactly the same lazy-highlight-after-paint shape.
export const Code = forwardRef<HTMLDivElement, CodeProps>(function Code(
  {
    children,
    language = "",
    label,
    noCopy = false,
    noHeader = false,
    className,
  },
  ref,
): JSX.Element {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  // Prism mutates codeRef's subtree directly (tokenizes the text into span.token children) -
  // SAFE alongside React because nothing here re-renders that subtree afterward unless `children`/
  // `language` themselves change, at which point React's own diff of the plain text node runs
  // again and Prism's markup is naturally superseded, same as code.ts re-rendering from scratch on
  // a fresh connectedCallback would be.
  useEffect(() => {
    let cancelled = false;
    const highlight = (): void => {
      if (cancelled || !codeRef.current) return;
      window.mosniPrism?.highlight(codeRef.current);
    };
    if (window.mosniPrism) {
      highlight();
    } else {
      loadChunk(PRISM_CHUNK_URL)
        .then(highlight)
        .catch(() => {
          /* the chunk failed to load - code stays unhighlighted, same fallback code.ts has */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [children, language]);

  const copy = (): void => {
    navigator.clipboard
      .writeText(children)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPY_REVERT_MS);
      })
      .catch(() => {
        /* clipboard can reject (no permission / insecure context) - leave the icon unchanged */
      });
  };

  return (
    <div className={mergeClassName("code", className)} ref={ref}>
      {!noHeader && (
        <div className="code-header">
          <span className="code-lang">{label || language}</span>
          {!noCopy && (
            <button
              type="button"
              className={copied ? "code-copy code-copy-done" : "code-copy"}
              aria-label="Copy"
              onClick={copy}
            >
              {copied ? <CheckGlyph size={16} /> : <CopyGlyph size={16} />}
            </button>
          )}
        </div>
      )}
      <pre>
        <code ref={codeRef} className={`language-${language}`}>
          {children}
        </code>
      </pre>
    </div>
  );
});
