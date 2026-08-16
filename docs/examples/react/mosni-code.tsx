import { Code } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <Code language="ts">
      {`export const define = (tag: string, cls: CustomElementConstructor): void => {
  if (!customElements.get(tag)) customElements.define(tag, cls);
};`}
    </Code>
  );
}
