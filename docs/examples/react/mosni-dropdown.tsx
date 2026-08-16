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
      <Dropdown label="Actions for report.pdf" iconOnly="more-vertical">
        <DropdownItem value="rename">Rename</DropdownItem>
        <DropdownItem value="duplicate">Duplicate</DropdownItem>
        <DropdownItem value="delete" variant="danger">
          Delete
        </DropdownItem>
      </Dropdown>
    </>
  );
}
