import { describe, it, expect, vi, beforeEach } from "vitest";
import { h } from "preact";
import { render, waitFor } from "@testing-library/preact";

/**
 * The page restores whatever the draft store holds — including a diagram whose
 * shape looks like a freshly generated template. That distinction used to
 * decide whether the draft was loaded at all, which meant an opened file could
 * come back as a brand new template and the next autosave wrote that template
 * over the draft.
 */

const { drafts } = vi.hoisted(() => ({ drafts: new Map() }));

let mock_params = {};
vi.mock("preact-iso", () => ({
  useRoute: () => ({ params: mock_params, query: {}, path: "/modeler" }),
  useLocation: () => ({ route: vi.fn(), path: "/modeler" }),
}));

vi.mock("../helper/leave_guard.js", () => ({
  set_leave_guard: () => () => {},
}));

vi.mock("../components/modeler/draft_store.js", () => ({
  load_draft: vi.fn(async (kind) => drafts.get(kind) ?? null),
  save_draft: vi.fn(async (kind, draft) => {
    drafts.set(kind, { ...draft, kind, saved_at: Date.now() });
    return `draft:${kind}`;
  }),
  clear_draft: vi.fn(async (kind) => {
    drafts.delete(kind);
  }),
}));

// bpmn-js cannot render in happy-dom; the stub reports imports the way the real
// editor does and echoes the document it was asked to show.
vi.mock("../components/modeler/BPMNModeler.jsx", async () => {
  const { h: create } = await import("preact");
  const { forwardRef } = await import("preact/compat");
  const { useEffect, useImperativeHandle } = await import("preact/hooks");

  return {
    BPMNModeler: forwardRef(({ source, on_dirty, on_import, on_process_id }, ref) => {
      useImperativeHandle(ref, () => ({
        export_xml: async () => source?.xml ?? null,
        mark_draft_saved: () => {},
        mark_saved: () => {},
      }));

      useEffect(() => {
        if (!source?.xml) return undefined;
        const timer = setTimeout(() => {
          on_dirty?.(false);
          on_process_id?.("Process_stub01");
          on_import?.(true);
        }, 0);
        return () => clearTimeout(timer);
        // The stub mirrors the real editor: a new source is what starts an
        // import, so the callbacks are read from the render that scheduled it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [source]);

      return create("pre", { "data-testid": "canvas" }, source?.xml ?? "");
    }),
  };
});

import { ModelerPage } from "./Modeler.jsx";

/** A document that `is_blank_bpmn` reads as "untouched template": only a
 *  start and an end event, and no name on the process. */
const blank_shaped = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_abc1234" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
    <bpmn:endEvent id="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>`;

const render_page = () => render(h(ModelerPage, {}));

beforeEach(() => {
  drafts.clear();
  mock_params = {};
});

describe("ModelerPage draft restore", () => {
  it("restores an opened file even when its shape looks like a template", async () => {
    drafts.set("bpmn", {
      xml: blank_shaped,
      name: "opened.bpmn",
      saved_at: Date.now(),
    });

    const { getByTestId, container } = render_page();

    await waitFor(() =>
      expect(getByTestId("canvas").textContent).toContain("Process_abc1234"),
    );
    // The name the user opened the file under survives too.
    expect(container.querySelector(".modeler-file code").textContent).toBe(
      "opened.bpmn",
    );
  });

  it("shows no restored banner for a draft that is still blank", async () => {
    drafts.set("bpmn", {
      xml: blank_shaped,
      name: "process.bpmn",
      saved_at: Date.now(),
    });

    const { getByTestId, queryByText } = render_page();

    await waitFor(() =>
      expect(getByTestId("canvas").textContent).toContain("Process_abc1234"),
    );
    expect(queryByText("modeler.draft.restored")).toBeNull();
  });

  it("falls back to a new document when nothing was stored", async () => {
    const { getByTestId } = render_page();

    await waitFor(() =>
      expect(getByTestId("canvas").textContent).toContain("<bpmn:process"),
    );
    expect(getByTestId("canvas").textContent).not.toContain("Process_abc1234");
  });
});
