import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { JSX } from "react";

export interface LoginButtonProps {
  size?: "small" | "large";
  text?: "signin" | "continue";
  loading?: boolean;
  onLogin?: () => void;
}

// D-R1's SANCTIONED exception (react-plan.md §2): <mosni-login-button> has a shadow root and takes
// no light-DOM children, so React and the element never contend over child ownership - this is the
// one component where rendering the REAL custom element is correct instead of re-expressing its DOM
// in React. `size`/`text`/`loading` are passed straight through as JSX props: login-button.ts never
// defines them as class accessors (no `get`/`set loading()` etc.), so `"loading" in el` is false and
// React's custom-element handling falls back to `setAttribute` for plain boolean/string values -
// exactly the presence-based attribute login-button.ts's own `hasAttribute("loading")` reads
// (confirmed empirically before relying on it: renderToStaticMarkup emits `loading=""`/omits it,
// never `el.loading = true/false`).
export const LoginButton = forwardRef<HTMLElement, LoginButtonProps>(
  function LoginButton(
    { size, text, loading, onLogin },
    forwardedRef,
  ): JSX.Element {
    const elRef = useRef<HTMLElement>(null);
    useImperativeHandle(forwardedRef, () => elRef.current as HTMLElement);

    // mosni:login is a bubbling, composed CustomEvent dispatched on `document` (not the element
    // itself - login-button.ts's whole point is working from inside a closed shadow root, so it
    // bubbles out through the host and past it) - listening on the element still catches it via
    // bubbling, and scoping the listener here (rather than on document) means it never fires for a
    // DIFFERENT <LoginButton> instance elsewhere on the page.
    useEffect(() => {
      const el = elRef.current;
      if (!el || !onLogin) return;
      const handleLogin = (): void => onLogin();
      el.addEventListener("mosni:login", handleLogin);
      return () => el.removeEventListener("mosni:login", handleLogin);
    }, [onLogin]);

    return (
      <mosni-login-button
        ref={elRef}
        size={size}
        text={text}
        loading={loading}
      />
    );
  },
);
