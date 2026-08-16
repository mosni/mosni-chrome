import { Logo } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <>
      <p>
        The mosni mark. Size it by setting <code>height</code> (or{" "}
        <code>font-size</code>) — it keeps its aspect ratio at any scale:
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5rem" }}>
        <Logo alt="mosni" style={{ height: "1.5rem" }} />
        <Logo alt="mosni" style={{ height: "3rem" }} />
        <Logo alt="mosni" style={{ height: "5rem" }} />
      </div>
    </>
  );
}
