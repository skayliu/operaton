import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { save_blob, save_file } from "./download.js";

describe("save_blob", () => {
  let click, seen;

  beforeEach(() => {
    vi.useFakeTimers();
    seen = [];
    click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        // Where the element is at click time is the whole point.
        seen.push({
          mounted: document.body.contains(this),
          href: this.href,
          download: this.download,
        });
      });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clicks an anchor that is attached to the document", () => {
    // A detached <a> is ignored by WebKit, which is what made the modeler's
    // Download buttons do nothing.
    save_blob(new Blob(["<xml/>"], { type: "application/xml" }), "process.bpmn");

    expect(click).toHaveBeenCalledTimes(1);
    expect(seen[0].mounted).toBe(true);
    expect(seen[0].download).toBe("process.bpmn");
    expect(seen[0].href).toMatch(/^blob:/);
  });

  it("takes the anchor back out of the document", () => {
    save_blob(new Blob(["x"]), "a.svg");

    expect(document.querySelector('a[download="a.svg"]')).toBeNull();
  });

  it("keeps the object URL alive until the download has started", () => {
    // Revoking in the same tick cancels the write in Chromium and Firefox.
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    save_blob(new Blob(["x"]), "a.png");
    expect(revoke).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith(expect.stringMatching(/^blob:/));
  });

  it("reports an environment that cannot download instead of pretending", () => {
    expect(save_blob(new Blob(["x"]), "a.png", { doc: null })).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });
});

describe("save_file", () => {
  let click;

  const blob = () => new Blob(["<xml/>"], { type: "application/xml" });

  beforeEach(() => {
    click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("writes through the picker when the File System Access API exists", async () => {
    // The picker bypasses the download manager entirely, which is the point:
    // a blocked download channel is why the modeler's buttons did nothing.
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const createWritable = vi.fn().mockResolvedValue({ write, close });
    const picker = vi.fn().mockResolvedValue({ createWritable });

    const result = await save_file(blob(), "process.bpmn", { picker });

    expect(result).toBe("saved");
    expect(picker).toHaveBeenCalledWith({ suggestedName: "process.bpmn" });
    expect(createWritable).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    // Saved through the handle, so no anchor and no download were involved.
    expect(click).not.toHaveBeenCalled();
  });

  it("treats a closed save dialog as a decision, not a failure", async () => {
    const picker = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("The user aborted a request."), {
          name: "AbortError",
        }),
      );

    const result = await save_file(blob(), "a.svg", { picker });

    expect(result).toBe("cancelled");
    // Cancelling must not quietly turn into a download the user just declined.
    expect(click).not.toHaveBeenCalled();
  });

  it("falls back to a download when the picker is unavailable", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("showSaveFilePicker", undefined);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const seen = [];
    click.mockImplementation(function () {
      seen.push({
        mounted: document.body.contains(this),
        download: this.download,
      });
    });

    const result = await save_file(blob(), "a.png", { picker: null });

    expect(result).toBe("downloaded");
    expect(seen).toHaveLength(1);
    expect(seen[0].mounted).toBe(true);
    expect(seen[0].download).toBe("a.png");

    vi.runAllTimers();
  });
});
