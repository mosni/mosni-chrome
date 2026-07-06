declare const __MOSNICAT_PNG__: string;

import { initCat } from "./cat";
import "./components/index";

(() => {
  const flags = window as { __MOSNI_CORE_STARTED__?: boolean };
  if (flags.__MOSNI_CORE_STARTED__) return;
  flags.__MOSNI_CORE_STARTED__ = true;

  const mountCat = (): void => {
    if (document.getElementById("cat-image")) return;
    const catImg = document.createElement("img");
    catImg.className = "cat";
    catImg.id = "cat-image";
    catImg.src = __MOSNICAT_PNG__;
    document.body.appendChild(catImg);
    initCat();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountCat, { once: true });
  } else {
    mountCat();
  }
})();
