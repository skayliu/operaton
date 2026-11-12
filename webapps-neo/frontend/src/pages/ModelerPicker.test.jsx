import { describe, it, expect, vi } from "vitest";
import { h } from "preact";
import { render } from "@testing-library/preact";

/**
 * Guard for the picker / editor split.
 *
 * `Modeler.jsx` used to import `BPMNModeler` at module scope, so opening
 * `/modeler` — the "what do you want to model?" screen, which draws no canvas —
 * still paid for bpmn-js, the properties panel and bpmnlint (~297 kB gzip).
 * The editor is now fetched from an effect that only runs once the route
 * carries a `:kind`, and this file locks that in.
 *
 * The counter lives in `vi.hoisted` state and is bumped inside the mock factory,
 * which runs the first time anything imports the module — so a static import
 * creeping back into `Modeler.jsx` fails here even though the picker never
 * renders an editor.
 */

const { state } = vi.hoisted(() => ({ state: { editor_imports: 0 } }));

vi.mock("preact-iso", () => ({
  useRoute: () => ({ params: {}, query: {}, path: "/modeler" }),
  useLocation: () => ({ route: vi.fn(), path: "/modeler" }),
}));

vi.mock("../helper/leave_guard.js", () => ({
  set_leave_guard: () => () => {},
}));

// The page mounts its draft-restore effect before the picker branch returns, so
// the store has to answer without reaching for IndexedDB.
vi.mock("../components/modeler/draft_store.js", () => ({
  load_draft: vi.fn(async () => null),
  save_draft: vi.fn(async () => "draft"),
  clear_draft: vi.fn(async () => {}),
}));

vi.mock("../components/modeler/BPMNModeler.jsx", async () => {
  state.editor_imports += 1;
  const { h: create } = await import("preact");
  return {
    BPMNModeler: () => create("pre", { "data-testid": "canvas" }, ""),
  };
});

import { ModelerPage } from "./Modeler.jsx";

/** Lets any queued dynamic import resolve before asserting it never happened. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 25));

describe("ModelerPage picker route", () => {
  it("renders the picker without loading the editor module", async () => {
    const { getByText, queryByTestId } = render(h(ModelerPage, {}));

    expect(getByText("modeler.title")).toBeTruthy();
    expect(getByText("modeler.pick.lead")).toBeTruthy();
    expect(queryByTestId("canvas")).toBeNull();

    await settle();
    expect(state.editor_imports).toBe(0);
  });

  it("keeps the BPMN card a real link and the DMN card a placeholder", () => {
    const { container } = render(h(ModelerPage, {}));

    const cards = container.querySelectorAll(".modeler-pick");
    expect(cards.length).toBe(2);

    const bpmn = container.querySelector(".modeler-pick[href]");
    expect(bpmn).toBeTruthy();
    expect(bpmn.getAttribute("href")).toContain("/modeler/bpmn");

    const pending = container.querySelector(".modeler-pick.is-pending");
    expect(pending).toBeTruthy();
    expect(pending.getAttribute("aria-disabled")).toBe("true");
    expect(pending.querySelector("a")).toBeNull();
  });
});
