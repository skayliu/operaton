/**
 * Saving an in-memory blob as a file the user keeps.
 *
 * Two details decide whether the browser actually writes anything, and getting
 * either of them wrong makes the click look like it did nothing at all:
 *
 * 1. **The anchor has to be in the document.** A detached `<a>` is ignored by
 *    WebKit — Safari and every WKWebView — and is unreliable in other engines
 *    too, so `link.click()` on an element that was never appended silently
 *    returns without a download.
 * 2. **The object URL has to outlive the click.** Revoking it in the same tick
 *    (or on a `setTimeout(..., 0)`, which runs before the download has opened
 *    the blob) cancels the write in Chromium and Firefox.
 *
 * The anchor itself is removed right after the click; only the URL is kept
 * alive, for long enough that even a slow "save as" dialog can finish reading
 * it.
 */

/** Kept alive well past the click: a save dialog may sit open for a while. */
const REVOKE_DELAY = 60_000;

/**
 * Hand `blob` to the browser as `name`.
 *
 * Returns `false` when the environment cannot download at all (no document, no
 * `URL.createObjectURL`), so callers can say so instead of leaving the user
 * with a button that appears to do nothing.
 *
 * The parameters exist for the tests; production calls pass two arguments.
 */
export const save_blob = (
  blob,
  name,
  {
    doc = globalThis.document,
    url_api = globalThis.URL,
    revoke_delay = REVOKE_DELAY,
  } = {},
) => {
  if (!doc?.body || typeof url_api?.createObjectURL !== "function") return false;

  const url = url_api.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = url;
  link.download = name;
  // Hidden rather than `hidden`: a `display: none` anchor still activates.
  link.style.display = "none";
  link.rel = "noopener";

  doc.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => url_api.revokeObjectURL(url), revoke_delay);
  }

  return true;
};

/**
 * Save a blob, preferring the File System Access API.
 *
 * `<a download>` is a *download*: the browser routes it through the download
 * manager, which can silently discard it (automatic-download policy, enterprise
 * policy, a page Chrome has decided downloads too much). When that happens the
 * click has no visible effect at all and there is no error to report.
 *
 * `showSaveFilePicker` does not use that channel — it opens the OS save dialog
 * and writes the bytes through a file handle — so it both avoids the block and
 * gives the user immediate feedback. It needs a user gesture; the callers run it
 * directly from the click, before any long await.
 *
 * Returns `"saved"`, `"downloaded"`, `"cancelled"` (the user closed the dialog)
 * or `false` (nothing could be saved).
 */
export const save_file = async (blob, name, options = {}) => {
  const picker = options.picker ?? globalThis.showSaveFilePicker;

  if (typeof picker === "function") {
    let handle = null;
    try {
      handle = await picker({ suggestedName: name });
    } catch (error) {
      // Closing the dialog is an answer, not a failure.
      if (error?.name === "AbortError") return "cancelled";
    }

    if (handle) {
      try {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return "saved";
      } catch {
        // A handle that cannot be written falls back to a plain download.
      }
    }
  }

  return save_blob(blob, name, options) ? "downloaded" : false;
};
