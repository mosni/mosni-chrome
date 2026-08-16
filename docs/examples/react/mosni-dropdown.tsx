import { Dropdown, DropdownItem } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <>
      <Dropdown label="Actions" onSelect={(value) => console.log(value)}>
        <DropdownItem value="rename">Rename</DropdownItem>
        <DropdownItem value="duplicate">Duplicate</DropdownItem>
        <DropdownItem value="delete" variant="danger">
          Delete
        </DropdownItem>
      </Dropdown>
      <p>
        Click the trigger to open, use <kbd>↑</kbd>/<kbd>↓</kbd> to move between
        items, <kbd>Esc</kbd> or an outside click to dismiss. Selecting an item
        calls <code>onSelect(value)</code>.
      </p>
      <Dropdown label="Actions for report.pdf" iconOnly="more-vertical">
        <DropdownItem value="rename">Rename</DropdownItem>
        <DropdownItem value="duplicate">Duplicate</DropdownItem>
        <DropdownItem value="delete" variant="danger">
          Delete
        </DropdownItem>
      </Dropdown>
      <p>
        With <code>iconOnly</code> set, the trigger renders just the named glyph
        (default <code>more-vertical</code>) with no visible text or chevron.{" "}
        <code>label</code> still supplies the trigger's accessible name via{" "}
        <code>aria-label</code> — useful for a compact per-row action menu.
      </p>
    </>
  );
}
