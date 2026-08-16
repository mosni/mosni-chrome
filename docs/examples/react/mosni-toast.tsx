import { useToast } from "../../../packages/react/src/index";

export default function Example() {
  const toast = useToast();
  return (
    <div className="panel">
      <button
        className="btn"
        onClick={() => toast("Saved successfully.", { variant: "success" })}
      >
        Show toast
      </button>
    </div>
  );
}
