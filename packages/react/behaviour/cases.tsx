// Behaviour tests (react-plan.md §5.2): the interaction paths static markup comparison (parity.mjs)
// cannot see - real clicks, live state updates, effect-driven async behaviour, unmount cleanup.
// Each case gets its own connected container and is responsible for unmounting it when done.
// scripts/react-behaviour.mjs bundles this file (react/react-dom kept external, same trick
// parity.mjs uses for fixtures.tsx) and runs every exported case against a live jsdom document.
import { act, useState } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Chips, Field, Switch } from "../src/index";

export interface BehaviourCase {
  name: string;
  run: () => void | Promise<void>;
}

interface Mounted {
  container: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(element: ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    root,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function click(el: Element | null): void {
  if (!el) throw new Error("click(): element not found");
  act(() => {
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export const cases: BehaviourCase[] = [
  {
    name: "Field: error prop toggles .error / aria-invalid / .field-error",
    run: () => {
      function Harness(): ReactElement {
        const [error, setError] = useState<string | undefined>(undefined);
        return (
          <div>
            <Field label="Email" type="email" error={error} />
            <button
              type="button"
              data-action="set"
              onClick={() => setError("Invalid address")}
            />
            <button
              type="button"
              data-action="clear"
              onClick={() => setError(undefined)}
            />
          </div>
        );
      }

      const { container, unmount } = mount(<Harness />);
      const field = () => container.querySelector(".field")!;
      const control = () => container.querySelector("input")!;

      assert(!field().classList.contains("error"), "starts without .error");
      assert(
        !control().hasAttribute("aria-invalid"),
        "starts without aria-invalid",
      );
      assert(
        !container.querySelector(".field-error"),
        "starts without .field-error",
      );

      click(container.querySelector('[data-action="set"]'));

      assert(field().classList.contains("error"), "error prop adds .error");
      assert(
        control().getAttribute("aria-invalid") === "true",
        "error prop sets aria-invalid=true",
      );
      assert(
        container.querySelector(".field-error")?.textContent ===
          "Invalid address",
        "error message renders in .field-error",
      );

      click(container.querySelector('[data-action="clear"]'));

      assert(
        !field().classList.contains("error"),
        "clearing error removes .error",
      );
      assert(
        !control().hasAttribute("aria-invalid"),
        "clearing error removes aria-invalid",
      );
      assert(
        !container.querySelector(".field-error"),
        "clearing error removes .field-error",
      );

      unmount();
    },
  },

  {
    name: "Switch: checked (controlled) + onChange stay in sync with a real click",
    run: () => {
      let lastChecked: boolean | undefined;

      function Harness(): ReactElement {
        const [checked, setChecked] = useState(false);
        return (
          <Switch
            label="Notifications"
            checked={checked}
            onChange={(event) => {
              lastChecked = event.target.checked;
              setChecked(event.target.checked);
            }}
          />
        );
      }

      const { container, unmount } = mount(<Harness />);
      const input = container.querySelector("input") as HTMLInputElement;

      assert(input.checked === false, "starts unchecked");
      click(input);
      assert(input.checked === true, "clicking the input checks it");
      assert(lastChecked === true, "onChange fired with checked=true");
      click(input);
      assert(input.checked === false, "clicking again unchecks it");
      assert(lastChecked === false, "onChange fired with checked=false");

      unmount();
    },
  },

  {
    name: "Chips: checking an option adds a chip; the chip's × unchecks it and fires onChange",
    run: () => {
      const seen: string[][] = [];
      const lastSeen = (): string[] => seen[seen.length - 1] ?? [];
      const options = [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ];

      const { container, unmount } = mount(
        <Chips options={options} onChange={(value) => seen.push(value)} />,
      );

      assert(!!container.querySelector(".chips-empty"), "starts empty");

      const alphaBox = container.querySelector(
        'input[type="checkbox"][value="a"]',
      ) as HTMLInputElement;
      click(alphaBox);

      assert(
        !container.querySelector(".chips-empty"),
        "checking an option clears the empty state",
      );
      const chip = container.querySelector(".chip");
      assert(
        chip?.querySelector(".chip-text")?.textContent === "Alpha",
        "a chip for the checked option appears, labelled from `options`",
      );
      assert(
        lastSeen().join(",") === "a",
        "onChange fired with the new selection",
      );

      const removeButton = chip!.querySelector(".chip-x");
      click(removeButton);

      assert(
        !!container.querySelector(".chips-empty"),
        "removing the chip restores the empty state",
      );
      assert(
        alphaBox.checked === false,
        "removing the chip unchecks the source checkbox",
      );
      assert(
        lastSeen().join(",") === "",
        "onChange fired again with an empty selection",
      );

      unmount();
    },
  },
];
