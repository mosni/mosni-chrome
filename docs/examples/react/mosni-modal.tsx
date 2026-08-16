import { useState } from "react";
import { Modal } from "../../../packages/react/src/index";

// The dialog itself is portalled to document.body (agent-docs → planning-artifacts/react-path-implementation-waves.md §10) - under the static render
// this docs page uses, that portal renders nothing (there is no live document.body to attach to
// during renderToStaticMarkup), so the demo pane below only ever shows the trigger button. That is
// the real, accurate output of this component under static rendering, not a stand-in.
export default function Example() {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel">
      <button className="btn" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        heading="Delete project?"
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn" onClick={() => setOpen(false)}>
              Delete
            </button>
          </>
        }
      >
        <p>This action can't be undone.</p>
      </Modal>
    </div>
  );
}
