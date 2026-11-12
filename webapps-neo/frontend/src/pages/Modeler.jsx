import { useSignal, useSignalEffect } from "@preact/signals";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../components/Dialog.jsx";
import { Loading } from "../components/Loading.jsx";
import { DeployDialog } from "../components/modeler/DeployDialog.jsx";
import { ExportDialog } from "../components/modeler/ExportDialog.jsx";
import { ModelerPicker } from "./ModelerPicker.jsx";
import { bpmn_template, random_process_id } from "../components/modeler/templates.js";
import { clear_draft, load_draft, save_draft } from "../components/modeler/draft_store.js";
import { create_gate } from "../components/modeler/save_gate.js";
import {
  KIND_NAMES,
  MODELER_KINDS,
  deployed_version,
  deployment_name_for,
  error_message,
  format_saved_time,
  file_name_for_process,
  is_blank_bpmn,
  kind_from_file_name,
  same_xml,
  sanitize_file_name,
  settle_before_leave,
  stored_minimap_open,
} from "../components/modeler/modeler_helpers.js";
import { save_file } from "../helper/download.js";
import { set_leave_guard } from "../helper/leave_guard.js";
import { app_path } from "../config.js";
import "../components/modeler/modeler.css";

const DEFAULT_KIND = "bpmn";

/** How long after the last edit the draft is written. Short enough that
 *  switching pages never loses the last command, long enough that a burst of
 *  drag operations exports the XML once. */
const AUTOSAVE_DELAY = 800;

/** Problems listed above the canvas. A pathological diagram can produce more
 *  than a screenful; the canvas overlays still show all of them. */
const MAX_LISTED_ISSUES = 100;

/**
 * The modeler page.
 *
 * `/modeler` is the type picker: it draws no canvas and imports nothing beyond
 * `ModelerPicker`, which is why the editor below is loaded from an effect
 * instead of at module scope — opening the picker must not pay for bpmn-js, the
 * properties panel and the camunda moddle (~297 kB gzip).
 *
 * `/modeler/:kind/:id?` is the editor shell, one for every kind. The editor
 * itself sits behind an interface — `import_xml / export_xml / is_dirty / undo /
 * redo / zoom / fit / toggle_linting` — so DMN and Form slot in as siblings
 * without touching the tool bar, the deploy dialog or the leave guard.
 */
export const ModelerPage = () => {
  const [t] = useTranslation(),
    { params } = useRoute(),
    { route } = useLocation(),
    // The editor is fetched here rather than imported at module scope, so the
    // picker above stays cheap. `undefined` means "not started yet".
    [Canvas, set_Canvas] = useState(undefined),
    kind = params.kind || DEFAULT_KIND,
    // P0 only ships BPMN; the others still land on the page and say so rather
    // than 404 or render an empty canvas.
    supported = kind === "bpmn" && MODELER_KINDS.includes(kind),
    editor = useRef(null),
    file_input = useRef(null),
    // Leaving `/modeler` destroys the editor, so the document also lives in
    // IndexedDB. `name_follows` keeps a rename of an *opened* file from being
    // silently overwritten by that file's process id.
    name_follows = useRef(true),
    save_timer = useRef(null),
    last_persisted = useRef(""),
    // The kind the draft restore was started for. Reading it back after the
    // await is what stops a switch to another kind (the picker, a link) from
    // dropping a `draft:dmn` into the BPMN canvas.
    restore_kind = useRef(null),
    // Process ids handed out in this session. A new document must never reuse
    // one: two diagrams sharing an id deploy as versions of the same process
    // definition, which is exactly the collision a random id is meant to avoid.
    used_process_ids = useRef(new Set()),
    // Whether the draft read has already been claimed. Set synchronously,
    // before the await, so a second route change cannot both start one: the
    // second would read the store again and overwrite the canvas with the same
    // document mid-import.
    restore_done = useRef(false),
    file_name = useSignal(`process.bpmn`),
    // Built once: `useSignal` only reads its first value, so recomputing this on
    // every render would burn ids for nothing. The object (not just the XML
    // string) is what the editor effect depends on, so "new document" re-imports
    // even when the template text happens to be identical.
    initial_source = useMemo(() => {
      const process_id = random_process_id(used_process_ids.current);
      used_process_ids.current.add(process_id);
      return { xml: bpmn_template(process_id), seq: 0 };
    }, []),
    source = useSignal(initial_source),
    dirty = useSignal(false),
    error = useSignal(null),
    deploy_open = useSignal(false),
    export_open = useSignal(false),
    // Two banners above the canvas: the draft was restored, and the last
    // deployment's outcome. Both are dismissible.
    draft_restored = useSignal(false),
    notice = useSignal(null),
    // Mirrors the minimap module's own state so the toolbar button reports it;
    // the editor corrects this as soon as it is constructed.
    minimap_open = useSignal(stored_minimap_open()),
    // "idle | saving | saved | failed" — the toolbar's answer to "is my work
    // safe?". Autosave already runs; this makes it visible and gives the user
    // a way to force it.
    save_state = useSignal("idle"),
    saved_at = useSignal(null),
    // bpmnlint results, flattened by the editor. `lint_on` mirrors the linting
    // module so the toolbar toggle can show its state.
    lint = useSignal({ items: [], errors: 0, warnings: 0, infos: 0 }),
    lint_on = useSignal(true),
    // The "you have unsaved work" question is a real dialog rather than
    // `window.confirm`: a blocking browser prompt cannot be reached from the
    // promise-based leave guard, and it looks nothing like the rest of the app.
    // One dialog serves all three call sites (leave, new, open); the caller
    // waits on the promise `ask()` hands back.
    ask_open = useSignal(false),
    ask_message = useSignal(""),
    ask_label = useSignal("");

  /**
   * Whether the canvas holds something the draft does not.
   *
   * `dirty` cannot answer this. It reports "has the command stack moved since
   * the last save point?", and a freshly imported document sits exactly on
   * that point — so opening a file leaves the page "clean" while the draft on
   * disk is still the previous document. Leaving inside the 800 ms autosave
   * window then skips the save entirely and the opened file is gone.
   */
  const draft_stale = useRef(false);

  /**
   * Two gates a save has to pass, in this order.
   *
   * `restore` opens at mount and closes when IndexedDB has answered; `import`
   * closes when the editor has finished importing whatever `source` holds.
   * Exporting before either would read the template (or the file that was open
   * before) and write it over the draft the user is trying to keep.
   */
  const restore_gate = useRef(create_gate()),
    import_gate = useRef(create_gate());

  const load_document = (xml, name) => {
    file_name.value = name;
    error.value = null;
    dirty.value = false;
    // The canvas is about to show a document the draft does not contain yet,
    // and the timestamp on screen belongs to the previous one — leaving it
    // there reads as "this file is saved" while it is not.
    draft_stale.current = true;
    save_state.value = "idle";
    saved_at.value = null;
    // Whoever is waiting for the previous import must not be stranded.
    import_gate.current.release();
    import_gate.current = create_gate();
    source.value = { xml, seq: source.peek().seq + 1 };
  };

  /**
   * A new document with a process id nothing in this session has used yet.
   * The id is remembered before the editor even imports it, so a rapid
   * New / New / New sequence cannot hand out the same one twice.
   */
  const blank_document = () => {
    const process_id = random_process_id(used_process_ids.current);
    used_process_ids.current.add(process_id);
    return bpmn_template(process_id);
  };

  /**
   * Write the current document to local storage. Cheap to call repeatedly: an
   * unchanged export is skipped, so the autosave timer and the unmount cleanup
   * cannot overwrite a newer draft.
   *
   * Returns whether the draft is on disk. `force` writes even when the XML is
   * unchanged — that is what the toolbar button does, so "save" always answers
   * with a fresh timestamp instead of looking like nothing happened.
   */
  const persist_draft = async ({ force = false } = {}) => {
    // Wait for the draft restore and for the import behind it: exporting while
    // either is in flight reads the wrong document, and writing that would
    // replace the very draft this call is meant to protect.
    await restore_gate.current.promise;
    const gate = import_gate.current;
    await gate.promise;
    // A newer document arrived while waiting; this export is already stale.
    // The import that replaced it schedules its own save.
    if (gate !== import_gate.current) return false;
    // The import failed, so the canvas still shows the previous document. Do
    // not pretend that one is the file the user just tried to open.
    if (gate.state === "failed") return false;

    const xml = await editor.current?.export_xml();
    if (!xml) {
      save_state.value = "failed";
      return false;
    }
    if (!force && same_xml(xml, last_persisted.current)) {
      // The draft already holds this exact export.
      draft_stale.current = false;
      return true;
    }

    save_state.value = "saving";
    const stored = await save_draft(kind, { xml, name: file_name.value });
    if (!stored) {
      // Private mode or blocked site data: the editor keeps working, the
      // draft does not. Say so instead of showing a saved state that is not.
      save_state.value = "failed";
      last_persisted.current = "";
      return false;
    }

    last_persisted.current = xml;
    saved_at.value = Date.now();
    save_state.value = "saved";
    // The draft now contains what the canvas shows.
    draft_stale.current = false;
    // The draft now matches the canvas, so the "unsaved changes" badge has
    // to go: it is driven by the undo stack, and a save keeps that stack.
    editor.current?.mark_draft_saved();
    dirty.value = false;
    return true;
  };

  // Read by the leave guard, which is registered once but must call the
  // current version of the saver.
  const persist_ref = useRef(persist_draft);
  persist_ref.current = persist_draft;

  // Resolver of the question on screen, when one is open.
  const ask_resolve = useRef(null);

  /**
   * Ask the user to confirm something and wait for the answer.
   *
   * Resolves to `true` only when the confirm button is used; cancel, Esc and
   * the backdrop all resolve to `false`. Everything that needs an answer goes
   * through here, so there is exactly one dialog instance and one pending
   * resolver at a time.
   */
  const ask = (message, confirm_label) => {
    // A second question while one is still open would strand the first
    // promise forever. Answer that one with "no" so its caller stays put.
    ask_resolve.current?.(false);
    ask_message.value = message;
    ask_label.value = confirm_label;
    const answer = new Promise((resolve) => {
      ask_resolve.current = resolve;
    });
    ask_open.value = true;
    return answer;
  };

  const settle_ask = (allow) => {
    const resolve = ask_resolve.current;
    ask_resolve.current = null;
    resolve?.(allow);
  };

  // Closing without confirming is a "no". The confirm button settles first and
  // only then closes the dialog, so this never overrules an accepted answer.
  useSignalEffect(() => {
    if (!ask_open.value) settle_ask(false);
  });

  // An open question whose page goes away must not leave a caller waiting.
  useEffect(() => () => settle_ask(false), []);

  const schedule_save = () => {
    if (save_timer.current) clearTimeout(save_timer.current);
    save_timer.current = setTimeout(() => {
      save_timer.current = null;
      void persist_draft();
    }, AUTOSAVE_DELAY);
  };

  const save_now = async () => {
    if (save_timer.current) clearTimeout(save_timer.current);
    save_timer.current = null;
    await persist_draft({ force: true });
  };

  /**
   * Replacing the document is the one action that really loses work: there is
   * a single draft slot per kind (`draft:${kind}`), so the new diagram
   * overwrites whatever was stored, and importing clears the undo stack as
   * well. The question is about the replaced draft, not about "unsaved" edits.
   */
  const new_document = async () => {
    if (
      (dirty.value || draft_stale.current) &&
      !(await ask(t("modeler.confirm-replace"), t("modeler.replace")))
    ) {
      return;
    }
    // A new document names itself after its process id again, overriding the
    // name of whatever file was open before.
    name_follows.current = true;
    last_persisted.current = "";
    load_document(blank_document(), "process.bpmn");
  };

  const open_file = async (event) => {
    const file = event.currentTarget.files?.[0];
    // Let the same file be picked twice in a row.
    event.currentTarget.value = "";
    if (!file) return;

    const detected = kind_from_file_name(file.name);
    if (detected !== "bpmn") {
      error.value = t("modeler.errors.unsupported-file", {
        name: file.name,
        kind: KIND_NAMES[detected] ?? t("modeler.errors.unknown-kind"),
      });
      return;
    }
    // An opened file replaces the same single draft slot, so it asks for the
    // same reason `new_document` does.
    if (
      (dirty.value || draft_stale.current) &&
      !(await ask(t("modeler.confirm-replace"), t("modeler.replace")))
    ) {
      return;
    }

    // The chosen file name is the user's intent for this document; the process
    // id inside it does not get to rename it.
    name_follows.current = false;
    last_persisted.current = "";
    load_document(await file.text(), sanitize_file_name(file.name, "bpmn"));
  };

  const export_xml = async () => {
    const xml = await editor.current?.export_xml();
    if (!xml) error.value = t("modeler.errors.export");
    return xml;
  };

  const download = async () => {
    error.value = null;
    try {
      const xml = await export_xml();
      if (!xml) return;
      const saved = await save_file(
        new Blob([xml], { type: "application/xml" }),
        sanitize_file_name(file_name.value, "bpmn"),
      );
      // A browser that blocks the download says nothing at all; without this
      // the button just looks broken. `cancelled` is the user closing the save
      // dialog, which is not an error.
      if (saved === false) error.value = t("modeler.errors.download");
    } catch (caught) {
      error.value = error_message(caught, t("modeler.errors.download"));
    }
  };

  // The deploy dialog asks for the files at submit time, so it always uploads
  // what is on screen — including edits made after the dialog was opened.
  const build_files = async () => {
    const xml = await editor.current?.export_xml();
    return [{ name: sanitize_file_name(file_name.value, "bpmn"), data: xml ?? "" }];
  };

  /**
   * Renaming the process in the properties panel renames the document too —
   * that is the name the file is saved and deployed under. A name the user
   * picked by opening a file is left alone.
   *
   * Called after every import as well, which is what puts an opened file into
   * the draft store even when it was never edited.
   */
  const on_process_id = (process_id) => {
    // An opened or renamed document also claims its id, so the next new
    // document does not pick it up again.
    if (process_id) used_process_ids.current.add(process_id);
    schedule_save();
    if (!name_follows.current) return;
    const next = file_name_for_process(process_id, "bpmn");
    if (!next || next === file_name.value) return;
    file_name.value = next;
  };

  /**
   * Forget the stored draft and put a fresh template on the canvas.
   *
   * This is the only way out of a draft: the autosave keeps writing it back,
   * and every later visit restores it. It answers the banner's "discard" as
   * well as the tool bar's, which is why both exist — the banner is only there
   * for the visit that actually restored something.
   */
  const discard_draft = () => {
    void clear_draft(kind);
    draft_restored.value = false;
    name_follows.current = true;
    last_persisted.current = "";
    save_state.value = "idle";
    saved_at.value = null;
    // A template loads next, so the restore has already happened for this
    // mount; without this the banner's own "discard" could never run twice.
    restore_done.current = true;
    load_document(blank_document(), "process.bpmn");
  };

  /**
   * Discard, but only once the user has agreed.
   *
   * The tool bar has no banner to lean on, and the button sits next to "save
   * draft": one stray click would otherwise clear both the draft and the
   * canvas. The banner's own button stays immediate — there the draft was just
   * restored, so the intent is already unambiguous.
   */
  const discard_with_confirm = async () => {
    if (!(await ask(t("modeler.confirm-discard"), t("modeler.draft.discard")))) {
      return;
    }
    discard_draft();
  };

  const toggle_lint = () => {
    const active = editor.current?.toggle_linting();
    if (typeof active === "boolean") lint_on.value = active;
  };

  const lint_label = () => {
    if (!lint_on.value) return t("modeler.lint.off");
    const { errors, warnings } = lint.value;
    if (!errors && !warnings) return t("modeler.lint.clean");
    return t("modeler.lint.summary", { errors, warnings });
  };

  const save_label = () => {
    if (save_state.value === "saving") return t("modeler.draft.saving");
    if (save_state.value === "failed") return t("modeler.draft.failed");
    if (save_state.value === "saved" && saved_at.value) {
      const time = format_saved_time(saved_at.value);
      // An unreadable timestamp would render as "Draft saved at " with a
      // dangling preposition, so fall back to the plain wording.
      return time
        ? t("modeler.draft.saved-at", { time })
        : t("modeler.draft.saved");
    }
    return "";
  };

  /**
   * Put the stored draft on the canvas and report what it was.
   *
   * Only `/modeler/:kind` calls this: the route already carries the kind, so
   * the draft is loaded, never searched for. `/modeler` itself stays on the
   * type picker — redirecting from there to whichever kind has a draft is what
   * used to skip the "what do you want to model?" screen entirely, and it made
   * the back button mean "back to my diagram" instead of "back to the picker".
   * Never rejects: a draft that cannot be read leaves the blank template on
   * screen.
   */
  const restore_draft = async (target_kind, id) => {
    // One read per mount, so a reload or a second route change cannot race the
    // first read into the same canvas.
    if (restore_done.current) return false;
    restore_done.current = true;

    const gate = restore_gate.current;
    restore_kind.current = target_kind;
    try {
      // The route's `:id` (an already deployed definition, P3) wins over a
      // local draft, so that opening a definition never shows someone else's
      // unsaved work.
      if (id) return false;
      const draft = await load_draft(target_kind);
      // The kind changed while IndexedDB answered: this draft belongs to
      // another page, not to the one on screen.
      if (restore_kind.current !== target_kind) return false;
      if (!draft?.xml) return false;

      name_follows.current = false;
      last_persisted.current = draft.xml;
      load_document(draft.xml, draft.name || "process.bpmn");
      // The draft is exactly what the canvas now shows.
      draft_stale.current = false;
      // Restoring is unconditional. This check used to skip the restore for
      // anything it read as the untouched starting point, which silently
      // threw the draft away: a diagram holding only a start and an end
      // event, or one written without the `bpmn:` prefix, came back as a
      // brand new template — and the autosave that followed wrote that
      // template over the draft. Whether the document looks blank is only
      // relevant to the banner, never to whether the user's work is loaded.
      draft_restored.value = !is_blank_bpmn(draft.xml);
      if (draft.saved_at) {
        saved_at.value = draft.saved_at;
        save_state.value = "saved";
      }
      return true;
    } finally {
      // Whether there was a draft, there was none, or the read failed: saves
      // may run from here on.
      gate.release();
    }
  };

  /**
   * `/modeler/:kind` — put the stored draft back on the canvas.
   *
   * Runs on mount, on a kind change and when an `:id` arrives, which covers
   * reloading or bookmarking the editor as well as arriving from the picker.
   * `restore_draft` holds the one-shot guard, so a second run cannot read the
   * store again and fight over the canvas.
   */
  useEffect(() => {
    if (!params.kind) return;
    void restore_draft(params.kind, params.id);
    // `restore_draft` reads props and refs only, so the effect is about the
    // route, not about the function's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.kind, params.id]);

  /**
   * Settle the draft before the editor is torn down, and only ask if that
   * fails.
   *
   * `beforeunload` below covers closing the tab and reloading; this covers the
   * in-app paths (nav tabs, hotkeys, links, back/forward) that never unload
   * the document.
   *
   * The earlier version asked first and wrote in the background, which made
   * every jump inside the 800 ms autosave window look dangerous while the
   * editor was destroyed underneath the pending write. Now the save is awaited
   * and a successful one lets the navigation through without a click: the
   * draft really is on disk, so there is nothing to warn about. The question
   * only survives for the one case that is actually unsafe — storage refused
   * the write (private mode, quota), where the work exists only in this tab.
   *
   * Returning `false` from the guard keeps the user on the page; the router
   * holds the navigation until the promise settles either way.
   */
  useEffect(
    () =>
      set_leave_guard(() =>
        settle_before_leave({
          // "Clean" is not enough: a document that was just opened is at its
          // save point but not yet in the draft.
          dirty: dirty.peek() || draft_stale.current,
          save: () => persist_ref.current(),
          ask: () => ask(t("modeler.confirm-leave"), t("modeler.leave")),
        }),
      ),
    // `ask` is rebuilt on every render and `dirty` is read through `.peek()`,
    // so listing them would re-register the guard after every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  // A BPMN diagram is minutes of work; the browser's own prompt is the only
  // guard that also covers closing the tab.
  useEffect(() => {
    const on_before_unload = (event) => {
      if (!dirty.value) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", on_before_unload);
    return () => window.removeEventListener("beforeunload", on_before_unload);
    // The signal is read when the event fires, not during render, so there is
    // nothing to subscribe to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the page: flush the pending edit. `persist_draft` exports through
  // the editor instance, so whether this lands depends on the editor still
  // being alive during teardown — the debounced autosave is the real safety
  // net, this only shortens the window.
  useEffect(
    () => () => {
      if (save_timer.current) clearTimeout(save_timer.current);
      save_timer.current = null;
      void persist_draft();
    },
    // Unmount only: it has to run once, when the editor is torn down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Fetch the editor once the route has a kind. The picker above returns
  // before this runs, which is the point: `/modeler` never reaches the import.
  useEffect(() => {
    if (!params.kind || !supported || Canvas !== undefined) return undefined;
    let live = true;

    void import("../components/modeler/BPMNModeler.jsx").then(
      (module) => {
        if (live) set_Canvas(() => module.BPMNModeler);
      },
      (caught) => {
        if (!live) return;
        // A failed chunk load must not leave a spinner running forever.
        set_Canvas(() => null);
        error.value = error_message(caught, t("modeler.errors.import"));
      },
    );

    return () => {
      live = false;
    };
    // `error` is written (not read) here; Canvas/t drive the single import
    // attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.kind, supported, Canvas, t]);

  // No `:kind`: the "what do you want to model?" screen. Cheap on purpose, and
  // it must not reach the editor import below.
  if (!params.kind) return <ModelerPicker />;

  if (!supported) {
    return (
      <main id="content" class="modeler-page">
        <h1>{t("modeler.title")}</h1>
        <p class="info-box">
          {t("modeler.unsupported", {
            kind: KIND_NAMES[kind] ?? kind,
          })}
        </p>
      </main>
    );
  }

  // The editor module has not arrived yet: say so instead of drawing a toolbar
  // around nothing.
  if (Canvas === undefined) {
    return <Loading page label={t("modeler.loading")} detail={t("modeler.loading-detail")} />;
  }

  if (Canvas === null) {
    return (
      <main id="content" class="modeler-page">
        <h1>{t("modeler.title")}</h1>
        <p class="error" role="alert">
          {error.value || t("modeler.errors.import")}{" "}
          <button type="button" onClick={() => (error.value = null)}>
            {t("common.close")}
          </button>
        </p>
      </main>
    );
  }

  return (
    <main id="content" class="modeler-page">
      <div class="modeler-toolbar">
        <h1>{t("modeler.title")}</h1>

        <div class="button-group">
          {/* Navigation, not editing: it belongs at the far end from the
              document actions. The draft is written on the way out, so the
              diagram is still there next time. */}
          <button
            type="button"
            class="modeler-back"
            onClick={() => route(app_path("/modeler"))}
          >
            {t("modeler.back")}
          </button>
          <button type="button" onClick={new_document}>
            {t("modeler.new")}
          </button>
          <button type="button" onClick={() => file_input.current?.click()}>
            {t("modeler.open")}
          </button>
          <button type="button" onClick={download}>
            {t("modeler.download")}
          </button>
          <button type="button" onClick={() => (export_open.value = true)}>
            {t("modeler.export.action")}
          </button>
          <button
            type="button"
            class="primary"
            onClick={() => (deploy_open.value = true)}
          >
            {t("modeler.deploy.action")}
          </button>
          <button type="button" onClick={() => editor.current?.undo()}>
            {t("modeler.undo")}
          </button>
          <button type="button" onClick={() => editor.current?.redo()}>
            {t("modeler.redo")}
          </button>
          <button
            type="button"
            aria-label={t("modeler.zoom-in")}
            title={t("modeler.zoom-in")}
            onClick={() => editor.current?.zoom(1)}
          >
            +
          </button>
          <button
            type="button"
            aria-label={t("modeler.zoom-out")}
            title={t("modeler.zoom-out")}
            onClick={() => editor.current?.zoom(-1)}
          >
            −
          </button>
          <button type="button" onClick={() => editor.current?.fit()}>
            {t("modeler.fit")}
          </button>
          <button
            type="button"
            aria-pressed={minimap_open.value}
            title={t("modeler.minimap")}
            onClick={() => editor.current?.toggle_minimap()}
          >
            {t("modeler.minimap")}
          </button>
          <button
            type="button"
            aria-pressed={lint_on.value}
            title={t("modeler.lint.toggle")}
            onClick={toggle_lint}
          >
            {lint_label()}
          </button>
          <button
            type="button"
            disabled={save_state.value === "saving"}
            title={t("modeler.draft.save-hint")}
            onClick={save_now}
          >
            {t("modeler.draft.save")}
          </button>
          {/* Always available: the draft is the one thing that survives
              leaving, and without this there is no way to get rid of it once
              the restored banner is gone. */}
          <button type="button" onClick={discard_with_confirm}>
            {t("modeler.draft.discard")}
          </button>
        </div>

        <span class="modeler-file">
          <code>{file_name.value}</code>
          {/* "Not yet in draft", not "unsaved": the draft is written
              automatically, this only means the last edit is still in the
              800 ms window. */}
          {dirty.value && (
            <span class="modeler-dirty">{t("modeler.draft-pending")}</span>
          )}
          <span class="modeler-save-state" role="status" aria-live="polite">
            {save_label()}
          </span>
        </span>

        <input
          ref={file_input}
          type="file"
          accept=".bpmn,.xml"
          class="screen-hidden"
          onChange={open_file}
        />
      </div>

      {notice.value && (
        <p class="modeler-notice success" role="status">
          <span>{notice.value}</span>
          <button type="button" onClick={() => (notice.value = null)}>
            {t("common.close")}
          </button>
        </p>
      )}

      {draft_restored.value && (
        <p class="modeler-notice">
          <span>{t("modeler.draft.restored")}</span>
          <button type="button" onClick={discard_draft}>
            {t("modeler.draft.discard")}
          </button>
        </p>
      )}

      {error.value && (
        <p class="error modeler-error" role="alert">
          {error.value}{" "}
          <button type="button" onClick={() => (error.value = null)}>
            {t("common.close")}
          </button>
        </p>
      )}

      {lint_on.value && lint.value.items.length > 0 && (
        <details class="modeler-lint">
          <summary>
            {t("modeler.lint.problems", { count: lint.value.items.length })}
          </summary>
          <ul>
            {lint.value.items.slice(0, MAX_LISTED_ISSUES).map((item, index) => (
              <li key={`${item.element}-${item.rule}-${index}`} class={item.category}>
                <button
                  type="button"
                  onClick={() =>
                    editor.current?.focus_element(item.element, item.anchor)
                  }
                >
                  <span class="modeler-lint-message">{item.message}</span>{" "}
                  <code>{item.rule}</code>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Canvas
        ref={editor}
        source={source.value}
        on_dirty={(value) => {
          dirty.value = value;
          if (value) schedule_save();
        }}
        on_error={(err) =>
          (error.value = error_message(err, t("modeler.errors.import")))
        }
        on_process_id={on_process_id}
        on_import={(ok) =>
          ok ? import_gate.current.release() : import_gate.current.fail()
        }
        on_minimap_change={(open) => (minimap_open.value = open)}
        on_lint={(issues) => (lint.value = issues)}
      />

      {/* One dialog for every "unsaved work" question: leaving the page,
          replacing the document with a new or opened one, and discarding the
          draft. Its confirm label is chosen by the caller. */}
      <ConfirmDialog
        open={ask_open}
        message={ask_message.value}
        confirm_label={ask_label.value}
        on_confirm={() => settle_ask(true)}
      />

      <ExportDialog
        open={export_open}
        export_xml={() => editor.current?.export_xml?.() ?? null}
        export_svg={() => editor.current?.export_svg?.() ?? null}
        file_name={file_name.value}
      />

      <DeployDialog
        open={deploy_open}
        build_files={build_files}
        default_name={deployment_name_for(file_name.value)}
        on_deployed={(deployment) => {
          // A successful deployment is the new baseline: nothing left to lose,
          // and the engine now holds the copy worth keeping.
          editor.current?.mark_saved();
          dirty.value = false;
          draft_stale.current = false;
          last_persisted.current = "";
          draft_restored.value = false;
          save_state.value = "idle";
          saved_at.value = null;
          void clear_draft(kind);

          const version = deployed_version(deployment),
            name =
              deployment?.name ||
              deployment_name_for(file_name.value);
          notice.value = version
            ? t("modeler.deploy.succeeded", { name, version })
            : t("modeler.deploy.succeeded-no-version", { name });
        }}
      />
    </main>
  );
};
