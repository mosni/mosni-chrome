// The idempotent lazy-<script> loader (D-R8), extracted verbatim from the duplicated load-state
// machine that used to live separately in code.ts (for the Prism chunk) and icon.ts (for the public
// icon chunk) - same existing-script detection, same load/error wiring, now one function instead of
// two copies that could drift. Shared by the custom elements AND the React <Code>/<Icon> components.
//
// BEHAVIOUR-PRESERVING extraction: per-URL state starts undefined ("unloaded"), moves to "loading"
// once a <script> tag is wired (either a freshly created one or a same-URL tag already found in the
// document), and only "loaded" short-circuits future calls. Deliberately NOT "fixed" to retry more
// robustly after an error: an error leaves state at "error", and the next call re-wires listeners
// onto whatever tag is already in the DOM (which will never fire again if it already fired its one
// `error` event) - exactly what the original two call sites did. That is an existing, accepted
// quirk, not something this extraction should change.
type ChunkState = "loading" | "loaded" | "error";

interface Waiter {
  resolve: () => void;
  reject: (err: Error) => void;
}

const states = new Map<string, ChunkState>();
const waiters = new Map<string, Waiter[]>();

export function loadChunk(url: string): Promise<void> {
  if (states.get(url) === "loaded") return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const list = waiters.get(url) ?? [];
    list.push({ resolve, reject });
    waiters.set(url, list);

    // Already loading (or a previous caller already wired a listener after an error) - this call's
    // waiter will be settled by that in-flight attempt, so don't wire a second one.
    if (states.get(url) === "loading") return;

    const settle = (state: "loaded" | "error", err?: Error): void => {
      states.set(url, state);
      const pending = waiters.get(url) ?? [];
      waiters.delete(url);
      for (const waiter of pending) {
        if (state === "loaded") waiter.resolve();
        else
          waiter.reject(err ?? new Error(`loadChunk: failed to load ${url}`));
      }
    };

    const existing = document.querySelector(`script[src="${url}"]`);
    states.set(url, "loading");
    if (existing) {
      existing.addEventListener("load", () => settle("loaded"));
      existing.addEventListener("error", () => settle("error"));
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.addEventListener("load", () => settle("loaded"));
    script.addEventListener("error", () => settle("error"));
    document.head.appendChild(script);
  });
}
