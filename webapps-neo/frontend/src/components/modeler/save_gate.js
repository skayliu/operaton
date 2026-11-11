/**
 * A one-shot gate that holds a save until the canvas shows the document it is
 * supposed to export.
 *
 * Exporting is not instantaneous with respect to the page: `load_document`
 * replaces `source`, and the editor imports the new XML asynchronously. A save
 * that runs inside that window calls `saveXML` on the *previous* document and
 * writes it over the draft — the draft restore has the same shape, because the
 * template is on screen before IndexedDB answers.
 *
 * A gate is created when such a job starts and settled when it ends. `fail`
 * exists because a document that did not parse must not be "saved" as whatever
 * was on the canvas before it.
 */
export const create_gate = () => {
  let settle;
  const gate = {
    // "pending" | "open" | "failed"
    state: "pending",
    promise: new Promise((resolve) => (settle = resolve)),
    release() {
      if (gate.state !== "pending") return;
      gate.state = "open";
      settle();
    },
    fail() {
      if (gate.state !== "pending") return;
      gate.state = "failed";
      settle();
    },
  };
  return gate;
};
