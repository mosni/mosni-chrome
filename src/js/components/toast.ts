import { icon, type IconName } from "../icons";
import { MosniElement, define } from "../base-element";

type ToastVariant = "info" | "success" | "error";

interface ToastOptions {
  variant?: ToastVariant;
  /** ms; default 5000. 0 = sticky (no auto-dismiss). */
  duration?: number;
}

interface ToastHandle {
  dismiss(): void;
}

declare global {
  interface Window {
    mosni?: {
      toast?: (message: string, options?: ToastOptions) => ToastHandle;
    };
  }
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 5000;
const EXIT_MS = 120;

const variantIcon: Record<ToastVariant, IconName> = {
  info: "info",
  success: "circle-check",
  error: "circle-alert",
};

const isVariant = (value: string | null): value is ToastVariant =>
  value === "info" || value === "success" || value === "error";

interface ToastEntry {
  el: HTMLDivElement;
  timer: number | undefined;
  duration: number;
  remaining: number;
  startedAt: number;
}

let host: HTMLDivElement | undefined;
const visible: ToastEntry[] = [];

const getHost = (): HTMLDivElement => {
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    host.setAttribute("role", "region");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  return host;
};

const startTimer = (entry: ToastEntry): void => {
  if (entry.duration <= 0) return;
  entry.startedAt = Date.now();
  entry.timer = window.setTimeout(() => removeToast(entry), entry.remaining);
};

const pauseTimer = (entry: ToastEntry): void => {
  if (entry.timer === undefined) return;
  window.clearTimeout(entry.timer);
  entry.timer = undefined;
  entry.remaining = Math.max(
    0,
    entry.remaining - (Date.now() - entry.startedAt),
  );
};

const resumeTimer = (entry: ToastEntry): void => {
  if (entry.duration <= 0 || entry.timer !== undefined) return;
  startTimer(entry);
};

function removeToast(entry: ToastEntry): void {
  const index = visible.indexOf(entry);
  if (index === -1) return;
  visible.splice(index, 1);
  if (entry.timer !== undefined) window.clearTimeout(entry.timer);
  entry.el.dispatchEvent(
    new CustomEvent("mosni-toast-dismiss", { bubbles: true }),
  );
  // Drop from the visible set immediately (so max-visible accounting is right away) but let the
  // element finish its CSS exit transition before detaching it.
  entry.el.classList.add("toast-leaving");
  window.setTimeout(() => entry.el.remove(), EXIT_MS + 30);
}

function createToast(message: string, options: ToastOptions = {}): ToastHandle {
  const variant = options.variant ?? "info";
  const duration = options.duration ?? DEFAULT_DURATION_MS;

  const el = document.createElement("div");
  el.className = `toast toast-${variant}`;
  el.setAttribute("role", "status");

  const iconSpan = document.createElement("span");
  iconSpan.className = "toast-icon";
  iconSpan.appendChild(icon(variantIcon[variant], 16));

  const msgSpan = document.createElement("span");
  msgSpan.className = "toast-msg";
  msgSpan.textContent = message;

  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.className = "toast-dismiss";
  dismissButton.setAttribute("aria-label", "Dismiss");
  dismissButton.appendChild(icon("x", 16));

  el.append(iconSpan, msgSpan, dismissButton);

  const entry: ToastEntry = {
    el,
    timer: undefined,
    duration,
    remaining: duration,
    startedAt: 0,
  };

  dismissButton.addEventListener("click", () => removeToast(entry));
  el.addEventListener("mouseenter", () => pauseTimer(entry));
  el.addEventListener("mouseleave", () => resumeTimer(entry));

  getHost().appendChild(el);
  visible.push(entry);
  startTimer(entry);

  while (visible.length > MAX_VISIBLE) {
    removeToast(visible[0]);
  }

  return { dismiss: () => removeToast(entry) };
}

window.mosni = window.mosni ?? {};
if (!window.mosni.toast) {
  window.mosni.toast = createToast;
}

class MosniToast extends MosniElement {
  protected render(): void {
    const variantAttr = this.getAttribute("variant");
    const variant = isVariant(variantAttr) ? variantAttr : "info";
    const message = this.textContent?.trim() ?? "";

    if (message) {
      createToast(message, { variant });
    }
    this.remove();
  }
}

define("mosni-toast", MosniToast);
