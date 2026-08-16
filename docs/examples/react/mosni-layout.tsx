import {
  Header,
  Layout,
  Menu,
  MenuItem,
} from "../../../packages/react/src/index";

export default function Example() {
  return (
    <Layout
      header={<Header brand="MOSNI'S" accent="APP" />}
      menu={
        <Menu label="Primary">
          <MenuItem
            title="Overview"
            subtitle="Summary and status"
            href="#"
            selected
          />
          <MenuItem title="Settings" subtitle="Preferences" href="#" />
        </Menu>
      }
    >
      <p>Main content goes here.</p>
    </Layout>
  );
}
