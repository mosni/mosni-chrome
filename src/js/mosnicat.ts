declare const __MOSNICAT_CSS__: string;

(() => {
  const flags = window as {
    __MOSNI_BOOTSTRAPPED__?: boolean;
  };
  if (flags.__MOSNI_BOOTSTRAPPED__) return;
  flags.__MOSNI_BOOTSTRAPPED__ = true;

  // The core + lazy chunks always load from ui.mosni.dev, even when this bootstrap tag is served
  // from mosni.dev — so they version together off one origin and mosni.dev only needs to host this
  // single file.
  const base = "https://ui.mosni.dev/";

  // The compiled CSS is inlined into this bootstrap and injected as a <style> synchronously during
  // head parse, so styles are in the CSSOM before the body ever paints — a guaranteed no-flash, not
  // the best-effort of a JS-inserted <link> (which does NOT reliably block the first paint, worst of
  // all cross-origin — that fragility is what kept letting the unstyled flash back in). No second
  // request, no cross-origin fetch. mosnicat.css is still emitted for explicit-<link> consumers.
  if (!document.getElementById("mosni-styles")) {
    const style = document.createElement("style");
    style.id = "mosni-styles";
    style.textContent = __MOSNICAT_CSS__;
    document.head.appendChild(style);
  }

  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content =
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    document.head.appendChild(meta);
  }

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.href = "https://mosni.dev/images/icon.png";
  document.head.appendChild(favicon);

  // Start fetching the core now, in parallel with body parsing, rather than only at
  // DOMContentLoaded. The core is cross-origin (ui.mosni.dev) and must still *execute* after the DOM
  // is parsed (it upgrades light-DOM components that read their children), so it is injected at
  // end-of-body below — but preloading it here means that injection is a cache hit and the component
  // upgrade fires with minimal delay, shrinking how long the shell stays hidden (see the
  // mosni-layout:not(:defined) guard in the CSS).
  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "script";
  preload.href = base + "mosnicat-core.js";
  document.head.appendChild(preload);

  const loadCore = (): void => {
    if (document.getElementById("mosni-core")) return;
    const script = document.createElement("script");
    script.id = "mosni-core";
    script.src = base + "mosnicat-core.js";
    document.body.appendChild(script);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadCore, { once: true });
  } else {
    loadCore();
  }
})();
