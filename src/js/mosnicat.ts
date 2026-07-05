declare const __MOSNICAT_CSS__: string;
declare const __MOSNICAT_PNG__: string;

import { initCat } from "./cat";

(() => {
  if ((window as { __MOSNI_BOOTSTRAPPED__?: boolean }).__MOSNI_BOOTSTRAPPED__)
    return;
  (window as { __MOSNI_BOOTSTRAPPED__?: boolean }).__MOSNI_BOOTSTRAPPED__ =
    true;

  const injectStyle = (): void => {
    if (document.getElementById("mosni-styles")) return;
    const style = document.createElement("style");
    style.id = "mosni-styles";
    style.textContent = __MOSNICAT_CSS__;
    document.head.appendChild(style);
  };

  // Responsive out of the box: give the page a viewport meta if it forgot one, so a consumer never
  // has to remember it (mosnicat's design philosophy — plug in without much thinking).
  const ensureViewport = (): void => {
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content =
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
      document.head.appendChild(meta);
    }
  };

  // --- head-safe work: document.head always exists while <head> is parsing, so this can run
  // immediately regardless of where the consumer put the <script> tag.
  // injectStyle() also carries the self-hosted @font-face rules (fonts inlined as base64 in the bundled
  // CSS — D-27), so there is no external font fetch and no fallback→web-font swap.
  injectStyle();
  ensureViewport();

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.href = "https://mosni.dev/images/icon.png";
  document.head.appendChild(favicon);

  // --- body-dependent work: the cat image appends to document.body, which does NOT exist yet
  // if mosnicat.js is included in <head> as a plain script. Defer until the DOM is ready so a naive
  // <head> include can't throw.
  const mountBody = (): void => {
    const catImg = document.createElement("img");
    catImg.className = "cat";
    catImg.id = "cat-image";
    catImg.src = __MOSNICAT_PNG__;
    document.body.appendChild(catImg);
    initCat();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountBody, { once: true });
  } else {
    mountBody();
  }
})();

import "./components/index";
