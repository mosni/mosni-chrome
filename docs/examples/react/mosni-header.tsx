import { Header } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <Header
      brand="MOSNI'S"
      accent="HEADER"
      tagline={
        <span>
          made with love by <a href="https://mosni.dev">mosni</a>
        </span>
      }
    />
  );
}
