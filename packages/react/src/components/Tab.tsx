import type { ReactNode } from "react";

export interface TabProps {
  label: string;
  children?: ReactNode;
}

// Data-only, exactly like mosni-tab (`display: contents`; all of its content is physically
// relocated by its PARENT, tabs.ts's own render()). <Tabs> reads `label`/`children` directly off
// each <Tab> element in its own `children` prop via React.Children - this function is never
// actually invoked as a component; <Tab> exists so JSX authoring reads naturally
// (`<Tabs><Tab label="One">…</Tab></Tabs>`), matching `<mosni-tabs><mosni-tab label="One">…`.
export function Tab(_props: TabProps): null {
  return null;
}
