import { Tooltip } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <p>
      Paste the key into the request{" "}
      <Tooltip text="Copies the API key to your clipboard.">
        <span className="tooltip-trigger" tabIndex={0}>
          header
        </span>
      </Tooltip>{" "}
      to authenticate.
    </p>
  );
}
