import { Icon } from "../../../packages/react/src/index";

// The glyph itself paints lazily, client-side, via the same lazy mosnicat-icons.js chunk
// <mosni-icon> uses (react-plan.md §4/§10) - under this page's static render there is no browser
// to run that effect in, so the demo below shows the (accurate) unpainted state: an empty span per
// icon. The class path / component path examples above show the painted glyphs for real.
export default function Example() {
  return (
    <div className="icon-grid">
      <figure>
        <Icon name="rocket" size={24} />
        <figcaption>rocket</figcaption>
      </figure>
      <figure>
        <Icon name="heart" size={24} />
        <figcaption>heart</figcaption>
      </figure>
      <figure>
        <Icon name="star" size={24} />
        <figcaption>star</figcaption>
      </figure>
    </div>
  );
}
