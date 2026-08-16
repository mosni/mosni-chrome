import { Tab, Tabs } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <Tabs>
      <Tab label="Overview">
        <p>The chrome ships components and utility classes from one file.</p>
      </Tab>
      <Tab label="Installation">
        <p>Add one script tag to your page's head.</p>
      </Tab>
      <Tab label="Theming">
        <p>Override the CSS custom properties in :root.</p>
      </Tab>
    </Tabs>
  );
}
