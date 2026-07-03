(() => {
  if ((window as { __MOSNI_BOOTSTRAPPED__?: boolean }).__MOSNI_BOOTSTRAPPED__)
    return;
  (window as { __MOSNI_BOOTSTRAPPED__?: boolean }).__MOSNI_BOOTSTRAPPED__ =
    true;

  const injectCSS = (href: string): void => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  };

  const injectScript = (src: string): void => {
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      document.body.appendChild(script);
    }
  };

  // Responsive out of the box: give the page a viewport meta if it forgot one, so a consumer never
  // has to remember it (mosnicat's design philosophy — plug in without much thinking).
  const ensureViewport = (): void => {
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1";
      document.head.appendChild(meta);
    }
  };

  // --- head-safe work: document.head always exists while <head> is parsing, so this can run
  // immediately regardless of where the consumer put the <script> tag.
  injectCSS("https://mosni.dev/mosnicat.css");
  injectCSS("https://fonts.googleapis.com/css?family=Roboto|Staatliches");
  ensureViewport();

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.href = "https://mosni.dev/images/icon.png";
  document.head.appendChild(favicon);

  // --- body-dependent work: the cat image + cat.js append to document.body, which does NOT exist yet
  // if mosnicat.js is included in <head> as a plain script. Defer until the DOM is ready so a naive
  // <head> include can't throw (and cat.js still finds img#cat-image, which we append first).
  const mountBody = (): void => {
    const catImg = document.createElement("img");
    catImg.className = "cat";
    catImg.id = "cat-image";
    catImg.src = "https://mosni.dev/mosnicat.png";
    document.body.appendChild(catImg);

    injectScript("https://mosni.dev/cat.js");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountBody, { once: true });
  } else {
    mountBody();
  }
})();
