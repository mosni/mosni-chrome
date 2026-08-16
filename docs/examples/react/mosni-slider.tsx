import { Slider } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <Slider
      stops={[
        "30 minutes",
        "1 hour",
        "2 hours",
        "6 hours",
        "12 hours",
        "24 hours",
        "2 days",
        "7 days",
        "30 days",
        "90 days",
      ]}
      defaultValue={1}
      label="Link expires after"
    />
  );
}
