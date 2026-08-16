import { Menu, MenuItem } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <Menu label="Primary">
      <MenuItem
        title="Overview"
        subtitle="Summary and status"
        href="#"
        selected
      />
      <MenuItem title="Settings" subtitle="Preferences" href="#" />
    </Menu>
  );
}
