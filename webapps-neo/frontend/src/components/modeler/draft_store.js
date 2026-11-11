/**
 * Local autosave for the modeler.
 *
 * A diagram is minutes of work, and leaving `/modeler` for another page tears
 * the editor down. The draft is kept in IndexedDB rather than localStorage: a
 * large BPMN quickly outgrows the ~5 MB string quota, and a quota error thrown
 * inside the save path would surface as a crash while the user is typing.
 *
 * Every entry point swallows its own failure. A browser with storage disabled
 * (private mode, blocked site data) must still be able to model — it just
 * cannot restore the draft afterwards.
 */

const DB_NAME = "webapps-neo-modeler";
const STORE_NAME = "drafts";
const DB_VERSION = 1;

const has_indexed_db = () => {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
};

const open_db = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/**
 * Run one request inside its own transaction and resolve with the request
 * result once the transaction completes. Never rejects: storage problems are
 * reported as `null`, so callers can stay linear.
 */
const with_store = async (mode, run) => {
  if (!has_indexed_db()) return null;

  let db = null;
  try {
    db = await open_db();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      let value = null;
      const request = run(transaction.objectStore(STORE_NAME));
      if (request) request.onsuccess = () => (value = request.result);
      transaction.oncomplete = () => resolve(value ?? null);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch {
    return null;
  } finally {
    // Closing an already-closed connection is a no-op; the guard keeps the
    // open failure path quiet.
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
};

const key_for = (kind) => `draft:${kind}`;

/** The stored draft for a kind, or `null`. */
export const load_draft = (kind = "bpmn") =>
  with_store("readonly", (store) => store.get(key_for(kind)));

/** Store `{ xml, name }` as the draft for a kind. `saved_at` is added here so
 *  every writer records the same timestamp shape. */
export const save_draft = async (kind, draft) => {
  if (!draft?.xml) return null;
  return with_store("readwrite", (store) =>
    store.put({ ...draft, kind, saved_at: Date.now() }, key_for(kind)),
  );
};

/** Forget the draft — after a successful deployment the engine holds the
 *  authoritative copy. */
export const clear_draft = (kind = "bpmn") =>
  with_store("readwrite", (store) => store.delete(key_for(kind)));
