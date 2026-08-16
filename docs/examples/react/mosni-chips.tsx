import { Chips } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <Chips
      label="Roles"
      placeholder="Filter roles…"
      filterThreshold={4}
      defaultValue={["files:read", "stream:key"]}
      options={[
        { value: "files:read", label: "files:read" },
        { value: "files:write", label: "files:write" },
        { value: "stream:key", label: "stream:key" },
        { value: "hub:lights", label: "hub:lights" },
        { value: "hub:heating", label: "hub:heating" },
        { value: "photos:upload", label: "photos:upload" },
      ]}
    />
  );
}
