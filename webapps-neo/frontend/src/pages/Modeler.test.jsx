import { describe, it, expect, vi, beforeEach } from "vitest";
import { h } from "preact";
import { render, waitFor } from "@testing-library/preact";

/**
 * The editor route's contract with the draft store.
 *
 * Two things are locked here, and both were broken at some point:
 *
 * 1. Whatever the store holds is put back on the canvas — including a diagram
 *    whose shape looks like a freshly generated template. That distinction used
 *    to decide whether the draft was loaded at all, which meant an opened file
 *    could come back as a brand new template and the next autosave wrote that
 *    template over the draft.
 * 2. The canvas really appears on a first visit, when the editor module is not
 *    in the cache yet. The loader used to guard `set_Canvas` on a flag that was
 *    cleared by the cleanup of the very effect that set it, so only a cached
 *    module ever rendered and everything else sat on "loading" forever.
 */

const { drafts } = vi.hoisted(() => ({ drafts: new Map() }));

let mock_params = {};
const mock_route = vi.fn();

vi.mock("preact-iso", () => ({
  useRoute: () => ({ params: mock_params, query: {}, path: "/modeler" }),
  useLocation: () => ({ route: mock_route, path: "/modeler" }),
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

/** The editor route. `mock_params` used to be `{}` here, which made the page
 *  render the picker and silently skip every restore below. */
const render_editor = (params = { kind: "bpmn" }) => {
  mock_params = params;
  return render(h(ModelerPage, {}));
};

beforeEach(async () => {
  drafts.clear();
  mock_params = { kind: "bpmn" };
  mock_route.mockClear();
  const store = await import("../components/modeler/draft_store.js");
  store.load_draft.mockClear();
  store.save_draft.mockClear();
  store.clear_draft.mockClear();
});

describe("ModelerPage draft restore", () => {
  it("restores an opened file even when its shape looks like a template", async () => {
    drafts.set("bpmn", {
      xml: blank_shaped,
      name: "opened.bpmn",
      saved_at: Date.now(),
    });

    const { getByTestId, container } = render_editor();

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

    const { getByTestId, queryByText } = render_editor();

    await waitFor(() =>
      expect(getByTestId("canvas").textContent).toContain("Process_abc1234"),
    );
    expect(queryByText("modeler.draft.restored")).toBeNull();
  });

  it("falls back to a new document when nothing was stored", async () => {
    const { getByTestId } = render_editor();

    await waitFor(() =>
      expect(getByTestId("canvas").textContent).toContain("<bpmn:process"),
    );
    expect(getByTestId("canvas").textContent).not.toContain("Process_abc1234");
  });

  it("puts the canvas on screen when the editor chunk was not loaded yet", async () => {
    drafts.clear();

    // A first visit: nothing in the module cache. `waitFor` alone is not
    // enough here — the loader settles outside `act`, and the assertion would
    // otherwise pass on the loading state before the chunk arrives.
    const { findByTestId } = render_editor();
    const canvas = await findByTestId("canvas");

    expect(canvas).toBeTruthy();
  });

  it("reads the draft only once per visit", async () => {
    drafts.set("bpmn", {
      xml: blank_shaped,
      name: "process.bpmn",
      saved_at: Date.now(),
    });

    const { load_draft } = await import("../components/modeler/draft_store.js");
    const { getByTestId } = render_editor();

    await waitFor(() =>
      expect(getByTestId("canvas").textContent).toContain("Process_abc1234"),
    );
    // The picker decides where to send the user by reading the store, and the
    // editor reads it again to load the document. Two reads across two mounts
    // is the design; a third would mean the load ran twice.
    expect(load_draft.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("clears the stored draft after the question is confirmed", async () => {
    drafts.set("bpmn", {
      xml: blank_shaped,
      name: "opened.bpmn",
      saved_at: Date.now(),
    });

    const { clear_draft } = await import("../components/modeler/draft_store.js");
    const { getAllByText, getByTestId, queryByText } = render_editor();

    await waitFor(() =>
      expect(getByTestId("canvas").textContent).toContain("Process_abc1234"),
    );

    // The tool bar's button is the only discard, and it asks first. The
    // question's own confirm carries the same label, so the click below is the
    // second match.
    getAllByText("modeler.draft.discard")[0].click();

    const confirm = await waitFor(() => {
      const matches = getAllByText("modeler.draft.discard");
      expect(matches.length).toBeGreaterThan(1);
      return matches[matches.length - 1];
    });
    confirm.click();

    await waitFor(() => expect(clear_draft).toHaveBeenCalled());
    await waitFor(() =>
      expect(getByTestId("canvas").textContent).not.toContain("Process_abc1234"),
    );

    expect(drafts.has("bpmn")).toBe(false);
    expect(queryByText("modeler.draft.restored")).toBeNull();
  });

  it("keeps the draft when the discard question is cancelled", async () => {
    drafts.set("bpmn", {
      xml: blank_shaped,
      name: "opened.bpmn",
      saved_at: Date.now(),
    });

    const { clear_draft } = await import("../components/modeler/draft_store.js");
    const { getAllByText, getByTestId } = render_editor();

    await waitFor(() =>
      expect(getByTestId("canvas").textContent).toContain("Process_abc1234"),
    );

    const discard = getAllByText("modeler.draft.discard");
    discard[discard.length - 1].click();

    // Two dialogs are mounted and both have a cancel button; the confirm one
    // comes before the export/deploy dialogs in the tree.
    const cancels = getAllByText("common.cancel");
    cancels[cancels.length - 1].click();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(clear_draft).not.toHaveBeenCalled();
    expect(drafts.has("bpmn")).toBe(true);
    expect(getByTestId("canvas").textContent).toContain("Process_abc1234");
  });

  it("leaves the editor for the picker when the back button is used", async () => {
    const { findByText } = render_editor();

    // The chunk arrives outside `act`, so the button is awaited rather than
    // read straight off the first render.
    const back = await findByText("modeler.back");
    back.click();

    await waitFor(() => expect(mock_route).toHaveBeenCalled());
    expect(mock_route.mock.calls[0][0]).toContain("/modeler");
    expect(mock_route.mock.calls[0][0]).not.toContain("/modeler/bpmn");
  });
});

/**
 * The picker is the way in.
 *
 * `/modeler` used to read the store and `route("/modeler/bpmn")` when a draft
 * existed, which meant a returning user never saw the type picker at all — the
 * "what do you want to model?" screen only survived a first visit. The route
 * now stays put, and the editor is reached only by picking a kind.
 */
describe("ModelerPage picker route", () => {
  it("stays on the type picker even when a draft exists", async () => {
    drafts.set("bpmn", {
      xml: blank_shaped,
      name: "opened.bpmn",
      saved_at: Date.now(),
    });

    const { getByText, queryByTestId } = render_editor({});

    expect(getByText("modeler.pick.lead")).toBeTruthy();
    expect(queryByTestId("canvas")).toBeNull();

    // The store is read once to decide nothing; a redirect would show up here
    // as a route call, and a stray second read would as a load.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mock_route).not.toHaveBeenCalled();
    expect(queryByTestId("canvas")).toBeNull();
  });
});
