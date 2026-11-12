import { describe, it, expect, vi } from "vitest";
import { render_with_state } from "../test/render.jsx";
import {
  create_mock_state,
  signal_response,
  RESPONSE_STATE,
} from "../test/helpers.js";
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

// Only the routing hooks are faked. LocationProvider has to stay real, since
// render_with_state wraps every render in it.
vi.mock("preact-iso", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRoute: () => ({ params: {}, query: {}, path: "/modeler" }),
    useLocation: () => ({ route: vi.fn(), path: "/modeler" }),
  };
});

vi.mock("../api/engine_rest.jsx", () => ({
  default: { process_definition: { latest: vi.fn() } },
  RESPONSE_STATE: {
    NOT_INITIALIZED: "NOT_INITIALIZED",
    LOADING: "LOADING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
  },
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

import engine_rest from "../api/engine_rest.jsx";
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

  it("keeps the BPMN row a real link and shows no placeholder card", () => {
    const { container } = render(h(ModelerPage, {}));

    const rows = container.querySelectorAll("a.modeler-row");
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute("href")).toContain("/modeler/bpmn");

    // A card that promises nothing is not shown at all: the DMN placeholder and
    // its "coming soon" badge are gone.
    expect(container.querySelector(".modeler-pick")).toBeNull();
  });
});

/**
 * The deployed-models list: what makes versioning reachable at all.
 *
 * Picking a row opens that definition's XML in the editor, and deploying the
 * result creates the next version of the same process.
 */
describe("ModelerPicker deployed models", () => {
  it("lists the definitions the engine reports and links each to its editor route", async () => {
    const state = create_mock_state();
    signal_response(state.api.process.definition.definitions, [
      {
        id: "invoice:3:deploy-1",
        key: "invoice",
        name: "Invoice",
        version: 3,
        resource: "invoice.bpmn",
      },
    ]);

    // The component reads its request slot from the AppState context, so the
    // state carrying the deployed definition has to be the one it renders with.
    const { container } = render_with_state(h(ModelerPage, {}), { state });
    await settle();

    const rows = container.querySelectorAll("a.modeler-row");
    expect(rows.length).toBe(2);
    expect(rows[1].getAttribute("href")).toContain(
      "/modeler/bpmn/invoice%3A3%3Adeploy-1",
    );
    expect(rows[1].textContent).toContain("Invoice");
    expect(rows[1].textContent).toContain("v3");
  });

  it("asks the engine once and says where drafts are kept", async () => {
    const { container } = render_with_state(h(ModelerPage, {}));
    await settle();

    expect(engine_rest.process_definition.latest).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("modeler.storage.note");
  });
});
