import { useEffect, useRef } from "react";

export type ToastVariant = "info" | "success" | "error";

export interface ToastOptions {
  variant?: ToastVariant;
  /** ms; default 5000 (toast.ts's own default). 0 = sticky (no auto-dismiss). */
  duration?: number;
}

export interface ToastHandle {
  dismiss(): void;
}

declare global {
  interface Window {
    mosni?: {
      toast?: (message: string, options?: ToastOptions) => ToastHandle;
    };
  }
}

// Delegates to the existing global window.mosni.toast(...) host - "the declarative secondary path
// onto the imperative window.mosni.toast(...) host" (mosnicat.md's own description of
// <mosni-toast>) is equally true of this hook: it is NOT a second toast implementation. The host
// (stacking, timers, pause-on-hover, exit transition) lives once, in toast.ts, and both the custom
// element and this hook are thin callers of it.
export function useToast(): (
  message: string,
  options?: ToastOptions,
) => ToastHandle | undefined {
  return (message, options) => {
    // Guards `window` even though hooks only run on the client (never during SSR) - the returned
    // closure is what actually touches `window`, and nothing stops a consumer from holding onto it
    // past unmount or (in a test) calling it outside a browser-like environment.
    if (typeof window === "undefined") return undefined;
    return window.mosni?.toast?.(message, options);
  };
}

export interface ToastProps {
  variant?: ToastVariant;
  children: string;
}

// Renders nothing (mosnicat.md's <mosni-toast>: "generate-role", no visible box of its own) and
// fires window.mosni.toast(...) exactly ONCE, on mount - matches toast.ts's MosniToast, whose
// render() (called once, ever, per element instance) reads its text content, creates one toast,
// and removes itself.
export function Toast({ variant = "info", children }: ToastProps): null {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const message = children.trim();
    if (message) window.mosni?.toast?.(message, { variant });
    // Deliberately fires once on mount only (empty deps, `children`/`variant` intentionally
    // excluded) - re-firing on every prop change would turn a declarative "show this toast" into a
    // repeat-toast machine, which is not what <mosni-toast> does (it fires once, then removes
    // itself).
  }, []);

  return null;
}
