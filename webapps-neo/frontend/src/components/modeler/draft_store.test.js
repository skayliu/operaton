import { beforeEach, describe, expect, it } from "vitest";
import { clear_draft, load_draft, save_draft } from "./draft_store.js";

/**
 * IndexedDB is absent in some test environments and blocked in some browsers.
 * The module promises to degrade to "no draft" there rather than throw, so the
 * round-trip assertions only run when the API exists.
 */
const has_indexed_db = () => {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
};

const KIND = "test";

describe.skipIf(!has_indexed_db())("draft_store", () => {
  beforeEach(async () => {
    await clear_draft(KIND);
  });

  it("round-trips a draft and stamps it with a save time", async () => {
    await save_draft(KIND, { xml: "<a/>", name: "a.bpmn" });

    const draft = await load_draft(KIND);

    expect(draft.xml).toBe("<a/>");
    expect(draft.name).toBe("a.bpmn");
    expect(draft.kind).toBe(KIND);
    expect(typeof draft.saved_at).toBe("number");
  });

  it("replaces the previous draft instead of appending", async () => {
    await save_draft(KIND, { xml: "<a/>", name: "a.bpmn" });
    await save_draft(KIND, { xml: "<b/>", name: "b.bpmn" });

    expect((await load_draft(KIND)).xml).toBe("<b/>");
  });

  it("clears a draft", async () => {
    await save_draft(KIND, { xml: "<a/>", name: "a.bpmn" });
    await clear_draft(KIND);

    expect(await load_draft(KIND)).toBeNull();
  });

  it("refuses to store an empty document", async () => {
    await save_draft(KIND, { xml: "", name: "a.bpmn" });

    expect(await load_draft(KIND)).toBeNull();
  });
});
