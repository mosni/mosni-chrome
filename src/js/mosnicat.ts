(() => {
  const flags = window as {
    __MOSNI_BOOTSTRAPPED__?: boolean;
  };
  if (flags.__MOSNI_BOOTSTRAPPED__) return;
  flags.__MOSNI_BOOTSTRAPPED__ = true;

  // Assets always load from ui.mosni.dev, even when this bootstrap tag is served from
  // mosni.dev — so the stylesheet + core + lazy chunks version together off one origin and
  // mosni.dev only needs to host this single file.
  const base = "https://ui.mosni.dev/";

  if (!document.getElementById("mosni-styles")) {
    const link = document.createElement("link");
    link.id = "mosni-styles";
    link.rel = "stylesheet";
    link.href = base + "mosnicat.css";
    document.head.appendChild(link);
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
