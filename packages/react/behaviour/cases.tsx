// Behaviour tests (react-plan.md §5.2): the interaction paths static markup comparison (parity.mjs)
// cannot see - real clicks, live state updates, effect-driven async behaviour, unmount cleanup.
// Each case gets its own connected container and is responsible for unmounting it when done.
// scripts/react-behaviour.mjs bundles this file (react/react-dom kept external, same trick
// parity.mjs uses for fixtures.tsx) and runs every exported case against a live jsdom document.
import { act, useState } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Chips, Field, Modal, Switch, Tab, Tabs, Tooltip } from "../src/index";

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

  {
    name: "Tabs: clicking tab 2 swaps aria-selected/hidden and fires onChange(1, label); Arrow keys move focus",
    run: () => {
      let lastChange: [number, string] | undefined;

      const { container, unmount } = mount(
        <Tabs
          onChange={(index, label) => {
            lastChange = [index, label];
          }}
        >
          <Tab label="One">
            <p>one</p>
          </Tab>
          <Tab label="Two">
            <p>two</p>
          </Tab>
        </Tabs>,
      );

      const buttons = () =>
        Array.from(
          container.querySelectorAll("button.tab"),
        ) as HTMLButtonElement[];
      const panels = () =>
        Array.from(
          container.querySelectorAll('[role="tabpanel"]'),
        ) as HTMLElement[];

      assert(
        buttons()[0]?.getAttribute("aria-selected") === "true",
        "tab 0 starts selected",
      );
      assert(panels()[1]?.hidden === true, "panel 1 starts hidden");

      click(buttons()[1]);

      assert(
        buttons()[1]?.getAttribute("aria-selected") === "true",
        "clicking tab 2 selects it",
      );
      assert(
        buttons()[0]?.getAttribute("aria-selected") === "false",
        "clicking tab 2 deselects tab 1",
      );
      assert(panels()[1]?.hidden === false, "clicking tab 2 unhides its panel");
      assert(
        panels()[0]?.hidden === true,
        "clicking tab 2 hides the other panel",
      );
      assert(
        lastChange?.[0] === 1 && lastChange?.[1] === "Two",
        'onChange fired with (1, "Two")',
      );

      // Arrow keys move FOCUS only - tabs.ts is a manual-activation tablist, so this must NOT
      // change the selection.
      buttons()[1]?.focus();
      act(() => {
        buttons()[1]?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
        );
      });
      assert(
        document.activeElement === buttons()[0],
        "ArrowRight from the last tab wraps focus to the first",
      );
      assert(
        buttons()[1]?.getAttribute("aria-selected") === "true",
        "moving focus with arrow keys does not change the selection",
      );

      unmount();
    },
  },

  {
    name: "Modal: open toggling calls showModal()/close(); backdrop pointerdown fires onClose",
    run: () => {
      let closeCount = 0;

      function Harness(): ReactElement {
        const [open, setOpen] = useState(false);
        return (
          <div>
            <button
              type="button"
              data-action="open"
              onClick={() => setOpen(true)}
            />
            <Modal
              open={open}
              heading="Hi"
              onClose={() => {
                closeCount += 1;
                setOpen(false);
              }}
            >
              <p>Body</p>
            </Modal>
          </div>
        );
      }

      const { container, unmount } = mount(<Harness />);
      const dialog = () =>
        document.querySelector("dialog.modal") as HTMLDialogElement | null;

      assert(
        !!dialog(),
        "the dialog renders (portalled to document.body) even while closed",
      );
      assert(dialog()?.open === false, "starts closed");

      click(container.querySelector('[data-action="open"]'));
      assert(
        dialog()?.open === true,
        "open=true calls the (stubbed) showModal()",
      );

      act(() => {
        dialog()?.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true }),
        );
      });

      assert(dialog()?.open === false, "backdrop pointerdown calls close()");
      assert(
        closeCount === 1,
        "backdrop pointerdown fired onClose exactly once",
      );

      unmount();
    },
  },

  {
    name: "Tooltip: hover shows the portalled tip; unmount removes it and its document listener",
    run: async () => {
      // Spying on document.addEventListener/removeEventListener rather than reaching into
      // Tooltip's internals: the requirement (§5.2) is specifically that unmount does not leak a
      // document-level listener, and counting adds vs. removes verifies that symmetry directly.
      let addCount = 0;
      let removeCount = 0;
      const originalAdd = document.addEventListener.bind(document);
      const originalRemove = document.removeEventListener.bind(document);
      document.addEventListener = ((type: string, ...rest: unknown[]) => {
        if (type === "pointerdown") addCount += 1;
        return (originalAdd as (...args: unknown[]) => void)(type, ...rest);
      }) as typeof document.addEventListener;
      document.removeEventListener = ((type: string, ...rest: unknown[]) => {
        if (type === "pointerdown") removeCount += 1;
        return (originalRemove as (...args: unknown[]) => void)(type, ...rest);
      }) as typeof document.removeEventListener;

      try {
        const { container, unmount } = mount(
          <Tooltip text="Helpful">
            <button type="button">Anchor</button>
          </Tooltip>,
        );
        const anchor = container.querySelector("button") as HTMLButtonElement;
        const tip = () =>
          document.querySelector(".tooltip") as HTMLDivElement | null;

        assert(
          !!tip(),
          "the tip renders (portalled to document.body) even before hover",
        );
        assert(tip()?.hidden === true, "starts hidden");

        // tooltip.ts's SHOW_DELAY_MS is 0 but still a deferred macrotask, not an immediate flip -
        // matched here with a real setTimeout rather than assuming synchronous state. React
        // implements onMouseEnter via a delegated, bubbling "mouseover" listener (native
        // "mouseenter" does not bubble, so a delegated root listener can't observe it directly) -
        // "mouseover" is the event that actually needs dispatching here.
        await act(async () => {
          anchor.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 10));
        });

        assert(tip()?.hidden === false, "hovering the anchor shows the tip");
        assert(
          tip()?.textContent === "Helpful",
          "the tip shows the `text` prop",
        );

        unmount();
        assert(
          !document.querySelector(".tooltip"),
          "unmount removes the portalled tip",
        );
        assert(
          addCount === removeCount,
          "unmount removed as many document pointerdown listeners as were added",
        );
      } finally {
        document.addEventListener = originalAdd;
        document.removeEventListener = originalRemove;
      }
    },
  },
];
