import { forwardRef } from "preact/compat";
import { useEffect, useImperativeHandle, useRef, useState } from "preact/hooks";
import { Loading } from "../Loading.jsx";
import { useTranslation } from "react-i18next";
import Modeler from "bpmn-js/lib/Modeler";
import MinimapModule from "diagram-js-minimap";
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from "bpmn-js-properties-panel";
import camunda_moddle from "camunda-bpmn-moddle/resources/camunda.json";
import LintingModule from "bpmn-js-bpmnlint";
import { bpmnlint_config } from "./bpmnlint_config.js";
import {
  modeler_i18n_additional_modules,
  refresh_modeler,
  sync_modeler_language,
} from "./modeler_i18n.js";
import { PanelSplitter } from "./PanelSplitter.jsx";
import {
  MINIMAP_OPEN_KEY,
  PANEL_COLLAPSED_KEY,
  PANEL_WIDTH_KEY,
  centered_viewbox,
  clamp_panel_width,
  element_bounds,
  is_at_saved_point,
  open_groups_layout,
  same_size,
  viewbox_after_resize,
  stored_minimap_open,
  stored_panel_collapsed,
  stack_index,
  stored_panel_width,
  summarize_issues,
  write_stored,
} from "./modeler_helpers.js";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "@bpmn-io/properties-panel/assets/properties-panel.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
import "bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css";

/**
 * The id of the process the diagram models.
 *
 * Read from the registry rather than from the current canvas root: with a
 * collaboration the root is the `bpmn:Collaboration`, whose id is not the one
 * the engine deploys.
 */
const process_id_of = (modeler) => {
  const process = modeler
    .get("elementRegistry")
    .getAll()
    .find((element) => element.businessObject?.$type === "bpmn:Process");
  return process?.businessObject?.id ?? null;
};

/**
 * The BPMN editor plus its properties panel.
 *
 * Deliberately separate from `BPMNViewer`: a Modeler brings a palette, a
 * command stack and a properties panel, none of which a read-only diagram
 * should pay for. Only the lazy `/modeler` route imports this module.
 *
 * The instance is created once and reused; a new `xml` prop re-imports into the
 * same instance so the properties panel keeps its DOM and scroll position.
 *
 * Exposed through `ref`:
 *   import_xml(xml)  export_xml()  export_svg()  mark_saved()  is_dirty()
 *   undo()  redo()  zoom(delta)  fit()  toggle_minimap()
 *   toggle_linting(active?)  focus_element(id, anchor?)
 */
export const BPMNModeler = forwardRef((
  {
    source,
    on_dirty,
    on_error,
    on_process_id,
    on_import,
    on_lint,
  },
  ref,
) => {
  const [t, i18n] = useTranslation(),
    // Building the modeler and importing the XML takes a visible moment on a
    // cold start; an empty canvas meanwhile reads as a broken editor.
    [loading, set_loading] = useState(true),
    // The panel width is a layout preference, not document state: it survives
    // reloads and applies to every diagram. Stored in px so it can be dragged.
    [panel_width, set_panel_width] = useState(() =>
      stored_panel_width(typeof window === "undefined" ? Infinity : window.innerWidth),
    ),
    [panel_collapsed, set_panel_collapsed] = useState(() =>
      stored_panel_collapsed(),
    ),
    canvas_ref = useRef(null),
    panel_ref = useRef(null),
    modeler_ref = useRef(null),
    // Stack depth at the last save. `clear()` would also clear "dirty",
    // but it throws away the undo history; a draft save only moves this
    // mark, so ctrl+z survives saving.
    saved_point = useRef(-1),
    // The module owns the open state: the corner control asks it to toggle and
    // learns the result from the `minimap.toggle` event. This copy exists so that
    // control can render its pressed state, and so the effect below can restore
    // the stored preference once the module is there.
    [minimap_visible, set_minimap_visible] = useState(false),
    // The panel collapses every group by default. Keep the state it reports so
    // a re-import can re-expand the important ones without losing the groups
    // the user opened or closed themselves.
    panel_layout = useRef(open_groups_layout()),
    // Callbacks change on every render of the page; keep them out of the
    // create/import effects so the editor is never torn down for a new closure.
    callbacks = useRef({});

  callbacks.current = {
    on_dirty,
    on_error,
    on_process_id,
    on_import,
    on_lint,
  };

  useEffect(() => {
    const modeler = new Modeler({
      container: canvas_ref.current,
      propertiesPanel: {
        parent: panel_ref.current,
        layout: panel_layout.current,
      },
      // The linter renders an overlay per problem on the canvas plus its own
      // summary button. On by default: a diagram that deploys but is not
      // executable (missing start event, disconnected nodes) should say so
      // while it is being drawn, not after the engine rejects it.
      linting: {
        active: true,
        bpmnlint: bpmnlint_config,
      },
      minimap: {
        // Never open itself: the corner control in the canvas is the one
        // switch for the map. A module that opened on its own would draw its
        // own close control in the same corner, and both would show at once.
        open: false,
        // The minimap redraws on every command; batching keeps dragging a
        // large diagram smooth without the overview lagging behind by much.
        debounceDelay: 100,
      },
      additionalModules: [
        LintingModule,
        MinimapModule,
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        // Camunda 7 and Operaton share the `camunda:` namespace, so one
        // provider covers both. The Zeebe provider must not be added here.
        CamundaPlatformPropertiesProviderModule,
        // Last on purpose: didi lets the final registration of a name win, and
        // this one replaces the built-in English `translate`.
        ...modeler_i18n_additional_modules,
      ],
      moddleExtensions: { camunda: camunda_moddle },
    });

    modeler_ref.current = modeler;
    // The canvas language is whatever the shell is using; the dictionary is
    // fetched here rather than at construction, so the editor chunk stays
    // loadable before any locale file is present.
    void sync_modeler_language(i18n).then(() => {
      if (modeler_ref.current === modeler) refresh_modeler(modeler);
    });

    const event_bus = modeler.get("eventBus"),
      on_change = () => {
        const stack = modeler.get("commandStack");
        callbacks.current.on_dirty?.(
          !is_at_saved_point(stack, saved_point.current),
        );
        // Renaming the process in the properties panel is a command like any
        // other, so the page learns about a new id from here too.
        callbacks.current.on_process_id?.(process_id_of(modeler));
      },
      on_panel_layout = (event) => {
        panel_layout.current = event.layout;
      },
      // bpmn-js-bpmnlint reports on every import and every change, grouped by
      // element. The page only needs the flat list and the counts.
      on_lint = (event) => {
        callbacks.current.on_lint?.(summarize_issues(event.issues));
      },
      // The minimap module owns the state and fires this event; the canvas
      // button mirrors it so its pressed state matches, and the choice is
      on_minimap_toggle = (event) => {
        write_stored(MINIMAP_OPEN_KEY, Boolean(event.open));
        set_minimap_visible(Boolean(event.open));
      };

    event_bus.on("commandStack.changed", on_change);
    event_bus.on("propertiesPanel.layoutChanged", on_panel_layout);
    event_bus.on("minimap.toggle", on_minimap_toggle);
    event_bus.on("linting.completed", on_lint);

    return () => {
      event_bus.off("commandStack.changed", on_change);
      event_bus.off("propertiesPanel.layoutChanged", on_panel_layout);
      event_bus.off("minimap.toggle", on_minimap_toggle);
      event_bus.off("linting.completed", on_lint);
      modeler.destroy();
      modeler_ref.current = null;
    };
    // `i18n` is the one stable i18next instance, so listing it satisfies
    // exhaustive-deps without re-creating the editor on a language change.
  }, [i18n]);

  /**
   * bpmn-js has no way to cancel an `importXML`. When `source` changes while
   * the previous import is still running — the draft restore replacing the
   * template is exactly that case — both imports are in flight on the same
   * instance, and the one that *finishes* last owns the canvas. A slow
   * template import landing after a fast draft import puts the template back
   * on screen, and the next autosave writes it over the user's draft.
   *
   * Chaining each import behind the previous one makes "the latest source
   * wins" true by construction, not by luck of scheduling.
   */
  const import_chain = useRef(Promise.resolve());

  useEffect(() => {
    const modeler = modeler_ref.current;
    if (!modeler || source?.xml == null) return;

    set_loading(true);
    let cancelled = false;

    const run = async () => {
      await import_chain.current;
      // Superseded while waiting: the import that replaced this one renders.
      if (cancelled || modeler_ref.current !== modeler) return;

      try {
        await modeler.importXML(source.xml);
        if (cancelled || modeler_ref.current !== modeler) return;
        set_loading(false);
        // A new document is the moment the panel goes back to its default
        // groups; an already edited panel keeps whatever the user toggled.
        modeler
          .get("propertiesPanel", false)
          ?.setLayout(open_groups_layout(panel_layout.current));
        modeler.get("canvas").zoom("fit-viewport", "auto");
        // A fresh import is the new baseline: nothing to undo, nothing dirty.
        // The mark moves first, because `clear()` fires its own `changed`.
        saved_point.current = -1;
        modeler.get("commandStack").clear();
        callbacks.current.on_dirty?.(false);
        // Imports do not emit `commandStack.changed`; the page still needs the
        // id of the document it just opened.
        callbacks.current.on_process_id?.(process_id_of(modeler));
        // The canvas now really shows `source`: a save may export it.
        callbacks.current.on_import?.(true);
      } catch (error) {
        if (cancelled || modeler_ref.current !== modeler) return;
        // The page shows the parse error; keeping the spinner on top of it
        // would contradict that message.
        set_loading(false);
        // Nothing was imported, so the canvas still holds the previous
        // document; a save now would write that one to the draft.
        callbacks.current.on_import?.(false);
        callbacks.current.on_error?.(error);
      }
    };

    const task = run();
    import_chain.current = task.catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [source]);

  /**
   * Switching language while the editor is open.
   *
   * Only the dictionary is swapped: the context pad, the popup menu and the
   * properties panel re-ask `translate` whenever they open or re-render, and
   * `refresh_modeler` tells the palette to re-read its entries. Nothing is
   * re-imported, so the undo history and the user's place on the canvas
   * survive — the document never changed, only its labels.
   *
   * Skipped on the first run: the mount import has not landed yet, and there
   * is nothing on the canvas to re-label.
   */
  const language_seen = useRef(null);

  useEffect(() => {
    if (language_seen.current === null) {
      language_seen.current = i18n.language;
      return undefined;
    }
    if (language_seen.current === i18n.language) return undefined;
    language_seen.current = i18n.language;

    const modeler = modeler_ref.current;
    if (!modeler) return undefined;

    let cancelled = false;
    const run = async () => {
      // Behind the pending import: the refresh must describe what is on screen.
      await import_chain.current;
      if (cancelled || modeler_ref.current !== modeler) return;
      await sync_modeler_language(i18n);
      if (cancelled || modeler_ref.current !== modeler) return;
      refresh_modeler(modeler);
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [i18n, i18n.language]);

  /**
   * The canvas only re-measures itself on a window resize, so a change to the
   * panel has to say so — otherwise the diagram stays laid out for the old
   * width and the fit-to-view shortcut is off by the difference.
   *
   * Measured on the canvas box rather than trusted from the panel state:
   * collapsing and the splitter's own collapse both land here, and a layout
   * that did not actually move the canvas edge (a no-op drag, a stacked mobile
   * layout where the panel takes no width) costs nothing.
   */
  const canvas_size = useRef(null);

  useEffect(() => {
    const canvas = modeler_ref.current?.get("canvas", false);
    if (!canvas) return;

    // `Canvas#_container` is the sized box. It is private, but it is the same
    // property `resized()` itself measures, so there is no public equivalent
    // to prefer.
    const measure = () => {
      const element = canvas._container;
      const width = element?.clientWidth;
      if (!Number.isFinite(width)) return;
      const height = element.clientHeight;
      if (!Number.isFinite(height)) return;
      const next = { width, height };
      if (same_size(canvas_size.current, next)) return;
      const previous = canvas_size.current;
      canvas_size.current = next;

      // Read before the resize is announced: `resized()` invalidates the cache,
      // and the box the current view was computed against is the one being
      // replaced. Nothing in diagram-js moves the drawing on `canvas.resized`,
      // so without this the canvas keeps its old origin and the diagram slides
      // out of view instead of reflowing. The zoom is kept: re-fitting would
      // discard a zoom the user set on purpose on every nudge.
      const centred =
        previous && viewbox_after_resize(canvas.viewbox(), previous, next);
      if (centred) canvas.viewbox(centred);
      canvas.resized?.();
      canvas.resized?.();
    };

    measure();

    if (typeof ResizeObserver === "undefined" || !canvas._container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(canvas._container);
    return () => observer.disconnect();
  }, [panel_width, panel_collapsed]);

  // A narrower window may leave no room for the width that was dragged out.
  useEffect(() => {
    const on_window_resize = () => {
      set_panel_width((current) =>
        clamp_panel_width(current, window.innerWidth),
      );
    };
    window.addEventListener("resize", on_window_resize);
    return () => window.removeEventListener("resize", on_window_resize);
  }, []);

  const change_panel_width = (next) => {
    set_panel_width(next);
    write_stored(PANEL_WIDTH_KEY, next);
  };

  /**
   * The stored preference is applied here rather than at construction: the module
   * is built with `open: false` so its own control cannot appear beside the
   * corner one, and opening it afterwards keeps a single source of truth.
   */
  useEffect(() => {
    const minimap = modeler_ref.current?.get("minimap", false);
    if (!minimap) return;
    if (minimap.isOpen() !== minimap_visible) minimap.toggle(minimap_visible);
    // The stored preference is applied here, not at construction: the module is
    // built with `open: false` so its own control cannot appear in the corner.
  }, [minimap_visible]);

  /**
   * The minimap module owns the actual toggle, including the persistence and
   * the `minimap.toggle` event the button state is mirrored from. Delegating
   * keeps one source of truth: a map dragged to a new position keeps its
   * viewport rectangle in sync with the canvas because both come from the same
   * module.
   */
  const toggle_minimap = () => {
    modeler_ref.current?.get("minimap", false)?.toggle();
  };

  const toggle_panel = () => {
    set_panel_collapsed((current) => {
      write_stored(PANEL_COLLAPSED_KEY, !current);
      return !current;
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      import_xml: (next) => modeler_ref.current?.importXML(next),
      export_xml: async () => {
        const modeler = modeler_ref.current;
        if (!modeler) return null;
        const { xml: exported } = await modeler.saveXML({ format: true });
        return exported;
      },
      // `saveSVG` re-renders the diagram into a standalone document, which is
      // what the SVG tab shows and what the PNG export rasterises.
      export_svg: async () => {
        const modeler = modeler_ref.current;
        if (!modeler) return null;
        const { svg: exported } = await modeler.saveSVG();
        return exported;
      },
      // A deployment is a new baseline: the undo history goes with it.
      mark_saved: () => {
        const modeler = modeler_ref.current;
        if (!modeler) return;
        saved_point.current = -1;
        modeler.get("commandStack").clear();
      },
      // A draft save is not a new baseline: it only records where the
      // stack currently is, so the toolbar stops saying "unsaved" while
      // undo keeps working.
      mark_draft_saved: () => {
        const stack = modeler_ref.current?.get("commandStack", false);
        saved_point.current = stack_index(stack) ?? -1;
      },
      is_dirty: () =>
        !is_at_saved_point(
          modeler_ref.current?.get("commandStack", false),
          saved_point.current,
        ),
      undo: () => modeler_ref.current?.get("commandStack").undo(),
      redo: () => modeler_ref.current?.get("commandStack").redo(),
      zoom: (delta) => modeler_ref.current?.get("zoomScroll").stepZoom(delta),
      fit: () =>
        modeler_ref.current?.get("canvas").zoom("fit-viewport", "auto"),
      toggle_minimap: () => modeler_ref.current?.get("minimap", false)?.toggle(),
      // Returns the new state so the toolbar button can mirror the module.
      toggle_linting: (active) =>
        modeler_ref.current?.get("linting", false)?.toggle(active) ?? null,
      // Jump the canvas to the element a listed problem belongs to and
      // select it, so the node is outlined instead of only re-framed.
      // `anchor` is the rendered element the linter hoisted the issue to; it
      // is the fallback when the real target is inside a collapsed
      // sub-process. Returns whether anything was found.
      focus_element: (id, anchor) => {
        const modeler = modeler_ref.current,
          registry = modeler?.get("elementRegistry", false),
          canvas = modeler?.get("canvas", false);
        if (!registry || !canvas) return false;
        const element = registry.get(id) ?? (anchor ? registry.get(anchor) : null);
        if (!element) return false;
        // A rule about the process itself ("no start event") is reported on
        // the root, which has no geometry: there is nothing to centre on, so
        // show the whole diagram rather than doing nothing.
        const centred = centered_viewbox(
          element_bounds(element),
          canvas.viewbox(),
        );
        if (centred) canvas.viewbox(centred);
        else canvas.zoom("fit-viewport", "auto");
        if (element !== canvas.getRootElement()) {
          modeler.get("selection", false)?.select(element);
        }
        return true;
      },
    }),
    [],
  );

  return (
    <div class="modeler-surface">
      <div class="modeler-canvas" ref={canvas_ref}>
        {loading && (
          <div class="modeler-canvas-loading">
            <Loading label={t("modeler.loading")} show_slow_hint={false} />
          </div>
        )}
      </div>
      <PanelSplitter
        width={panel_width}
        collapsed={panel_collapsed}
        on_width={change_panel_width}
        on_toggle={toggle_panel}
        label={t("modeler.properties.resize")}
        expand_label={t("modeler.properties.expand")}
        collapse_label={t("modeler.properties.collapse")}
      />
      <aside
        id="modeler-properties"
        class="modeler-properties"
        ref={panel_ref}
        aria-label={t("modeler.properties.label")}
        hidden={panel_collapsed}
        style={{ "--modeler-panel-width": `${panel_width}px` }}
      />
    </div>
  );
});
