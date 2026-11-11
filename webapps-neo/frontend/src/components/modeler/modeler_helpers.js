/**
 * Pure helpers for the modeler shell.
 *
 * Everything here is free of DOM and of the bpmn-js / dmn-js / form-js
 * instances, so it runs in happy-dom where those libraries cannot render.
 */

/** Kinds the modeler knows about. P0 only opens BPMN; the rest are named so
 *  routing and file handling already understand them. */
export const MODELER_KINDS = ["bpmn", "dmn", "form"];

export const EXTENSION_BY_KIND = {
  bpmn: ".bpmn",
  dmn: ".dmn",
  form: ".form",
};

/** Kinds that exist but are not implemented yet — used to say so instead of
 *  failing with a parse error. */
export const KIND_NAMES = {
  bpmn: "BPMN",
  dmn: "DMN",
  form: "Form",
};

const KIND_BY_EXTENSION = {
  ".bpmn": "bpmn",
  ".bpmn20.xml": "bpmn",
  ".dmn": "dmn",
  ".form": "form",
  ".json": "form",
};

/** The modeler kind a file name belongs to, or `null` for anything else. */
export const kind_from_file_name = (file_name) => {
  const name = String(file_name ?? "").toLowerCase();
  // Longest suffix first: `.bpmn20.xml` must win over `.xml`.
  const suffix = Object.keys(KIND_BY_EXTENSION)
    .sort((a, b) => b.length - a.length)
    .find((ext) => name.endsWith(ext));
  return suffix ? KIND_BY_EXTENSION[suffix] : null;
};

/** Strip the modeler extension so it can be used as a deployment name. */
export const strip_extension = (file_name) => {
  const name = String(file_name ?? "");
  const suffix = Object.keys(KIND_BY_EXTENSION)
    .sort((a, b) => b.length - a.length)
    .find((ext) => name.toLowerCase().endsWith(ext));
  return suffix ? name.slice(0, -suffix.length) : name;
};

/**
 * A resource name the engine accepts.
 *
 * Camunda 7 stores the resource name verbatim and some versions then fail to
 * match it again, so non-ASCII and path characters are folded to `_`. The
 * result always carries the extension for `kind`.
 */
export const sanitize_base = (file_name) => {
  const base = strip_extension(file_name)
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "");
  return base || "diagram";
};

export const sanitize_file_name = (file_name, kind = "bpmn") => {
  const extension = EXTENSION_BY_KIND[kind] ?? EXTENSION_BY_KIND.bpmn;
  return `${sanitize_base(file_name)}${extension}`;
};

/**
 * The extension an export gets, by format.
 *
 * XML exports keep the `.bpmn` extension: the engine recognises it, and an
 * exported document is meant to be deployed or reopened, not just read.
 */
export const EXPORT_EXTENSIONS = {
  xml: "bpmn",
  svg: "svg",
  png: "png",
};

/** "Process_1zbh82.bpmn" + "svg" → "Process_1zbh82.svg". */
export const export_name_for = (file_name, format = "xml") =>
  `${sanitize_base(file_name)}.${EXPORT_EXTENSIONS[format] ?? format}`;

/** "invoice.bpmn" → "invoice"; empty input falls back to `fallback`. */
export const deployment_name_for = (file_name, fallback = "diagram") =>
  strip_extension(file_name).trim() || fallback;

/**
 * The resource name that follows a diagram's process id.
 *
 * The properties panel lets the user rename `Process_1` to `order-fulfilment`;
 * the file tab should say the same thing, so the name shown (and deployed) is
 * derived from the id rather than from whatever the document was called when
 * it was created. Returns `null` for a missing id so callers can keep the
 * current name instead of falling back to `diagram.bpmn` mid-edit.
 */
export const file_name_for_process = (process_id, kind = "bpmn") => {
  const id = String(process_id ?? "").trim();
  if (!id) return null;
  return sanitize_file_name(id, kind);
};

/**
 * The version the engine assigned in a deployment response, across the
 * definition types a deployment can carry, or `null` when the response has
 * none (e.g. an empty deployment).
 */
export const deployed_version = (payload) => {
  const groups = [
    payload?.deployedProcessDefinitions,
    payload?.deployedDecisionDefinitions,
    payload?.deployedDecisionRequirementsDefinitions,
    payload?.deployedCaseDefinitions,
  ];
  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    for (const definition of Object.values(group)) {
      if (definition?.version != null) return definition.version;
    }
  }
  return null;
};

/** Line endings and surrounding whitespace differ between exports for the same
 *  diagram, so compare the normalised text. */
export const normalize_xml = (xml) =>
  String(xml ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();

/** Whether two exports describe the same document. */
export const same_xml = (left, right) => normalize_xml(left) === normalize_xml(right);

/**
 * Reading the save point: how deep the diagram-js command stack is, and
 * whether that depth is the one the document was last written at.
 *
 * `canUndo()` answers a different question: it stays true after a save,
 * because saving a draft deliberately keeps the undo history. That is why a
 * save used to leave the toolbar saying "unsaved changes" — the badge was
 * reading "can I undo?" and reporting it as "is this on disk?".
 *
 * diagram-js exposes no public stack depth, so this reads the index the stack
 * itself keeps. If a future version renames it the fallback is the old
 * behaviour (`!canUndo()`), never a claim that unsaved work is safe.
 */
export const stack_index = (stack) => {
  const index = stack?._stackIdx;
  return typeof index === "number" ? index : null;
};

export const is_at_saved_point = (stack, saved_index) => {
  if (!stack) return true;
  const index = stack_index(stack);
  if (index === null) return !stack.canUndo();
  return index === saved_index;
};

/** Elements a never-touched template is allowed to contain. */
const BLANK_BPMN_ELEMENTS = new Set([
  "definitions",
  "process",
  "startEvent",
  "endEvent",
]);

/**
 * Whether a document is still the untouched starting point.
 *
 * New documents get a random process id, so comparing against one stored
 * template string no longer works — the ids differ by design. What survives is
 * the shape: two events, no flow nodes, and no name on the process. Such a
 * draft is not worth restoring, and announcing "draft restored" for a blank
 * diagram is just noise.
 */
export const is_blank_bpmn = (xml) => {
  const text = normalize_xml(xml);
  if (!text) return true;

  const elements = text.match(/<bpmn:([a-zA-Z]+)/g) ?? [];
  if (elements.some((tag) => !BLANK_BPMN_ELEMENTS.has(tag.slice(6)))) {
    return false;
  }

  // A named process is a deliberate edit even before anything is drawn.
  const process_tag = text.match(/<bpmn:process\b[^>]*>/)?.[0] ?? "";
  return !/\bname\s*=\s*"[^"]*[^\s"]/.test(process_tag);
};

/** A human-readable message from whatever a failed fetch left behind. */
export const error_message = (error, fallback = "") =>
  error?.message || error?.type || (typeof error === "string" ? error : "") || fallback;

/**
 * Format a draft timestamp as `HH:MM:SS.mmm` in local time.
 *
 * Milliseconds are spelled out because autosave fires 800 ms after the last
 * edit: two saves inside the same second are normal, and a clock without them
 * makes the second save look like nothing happened.
 *
 * Written by hand instead of `toLocaleTimeString` so the shape does not follow
 * the locale — some locales render a 12-hour clock with an AM/PM suffix, which
 * would make the status line longer than the toolbar slot it sits in. Returns
 * "" for a missing or unparsable value so the caller can hide the line rather
 * than print `Invalid Date`.
 */
export const format_saved_time = (value) => {
  const ms = typeof value === "number" ? value : Date.parse(value ?? "");
  if (!Number.isFinite(ms)) return "";

  const at = new Date(ms);
  if (Number.isNaN(at.getTime())) return "";

  const pad = (part, width = 2) => String(part).padStart(width, "0");
  const clock = [pad(at.getHours()), pad(at.getMinutes()), pad(at.getSeconds())].join(":");
  return `${clock}.${pad(at.getMilliseconds(), 3)}`;
};

/**
 * Properties-panel sizing.
 *
 * The panel is dragged between a floor that still fits the property labels and
 * a ceiling that leaves a usable canvas. The ceiling is also a share of the
 * surface, so a narrow window does not let the panel swallow the diagram.
 */
export const PANEL_SIZE = {
  default: 320,
  min: 280,
  max: 720,
  // Space the canvas must keep before the panel may grow any further.
  canvas_min: 420,
  // One arrow-key press on the splitter.
  step: 16,
};

/** A panel width the layout can actually render, or the default when the
 *  input is not a number at all. */
export const clamp_panel_width = (width, surface_width = Infinity) => {
  const numeric = Number(width);
  if (!Number.isFinite(numeric)) return PANEL_SIZE.default;

  const room = Number.isFinite(surface_width)
    ? surface_width - PANEL_SIZE.canvas_min
    : PANEL_SIZE.max;
  const ceiling = Math.max(
    PANEL_SIZE.min,
    Math.min(PANEL_SIZE.max, room || PANEL_SIZE.default),
  );

  return Math.round(Math.min(Math.max(numeric, PANEL_SIZE.min), ceiling));
};

/** Storage keys for the layout choices that should survive a reload. */
export const PANEL_WIDTH_KEY = "modeler.panel.width";
export const PANEL_COLLAPSED_KEY = "modeler.panel.collapsed";
export const MINIMAP_OPEN_KEY = "modeler.minimap.open";

/**
 * `localStorage` can throw on construction (sandboxed iframes) *and* on read
 * (blocked site data), so every access goes through here and degrades to the
 * in-memory experience: the editor keeps working, it just forgets the layout.
 */
const storage_of = (storage) => {
  try {
    return storage ?? globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const read_stored = (key, fallback = null, storage = null) => {
  try {
    const value = storage_of(storage)?.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
};

export const write_stored = (key, value, storage = null) => {
  try {
    storage_of(storage)?.setItem(key, String(value));
  } catch {
    // Quota exceeded or site data disabled: the preference is cosmetic.
  }
};

/** A stored width, clamped against the space available right now. */
export const stored_panel_width = (surface_width, storage = null) =>
  clamp_panel_width(
    read_stored(PANEL_WIDTH_KEY, PANEL_SIZE.default, storage),
    surface_width,
  );

/** Stored booleans are written with `String(value)`, so only "true" is true. */
export const stored_flag = (key, fallback, storage = null) => {
  const value = read_stored(key, null, storage);
  return value == null ? fallback : value === "true";
};

export const stored_panel_collapsed = (storage = null) =>
  stored_flag(PANEL_COLLAPSED_KEY, false, storage);

export const stored_minimap_open = (storage = null) =>
  stored_flag(MINIMAP_OPEN_KEY, true, storage);

/**
 * Properties-panel groups kept expanded while a diagram is edited.
 *
 * The panel starts with every group collapsed, so the fields a new process is
 * actually started from — Name, the id behind the resource name, documentation
 * and the Tasklist "Startable" flag — sit behind three extra clicks.
 *
 * `general` and `documentation` are the ids used by bpmn-js-properties-panel;
 * the Tasklist group is namespaced by the Camunda platform provider. The ids
 * are the panel's public layout keys, so they are stable across versions.
 */
export const DEFAULT_OPEN_GROUPS = [
  "general",
  "CamundaPlatform__HistoryCleanup",
  "CamundaPlatform__Tasklist",
];

/**
 * A `propertiesPanel.layout` config that expands the default groups.
 *
 * `current` is the panel's latest layout; passing it keeps the expansion state
 * of every other group instead of resetting the whole panel.
 */
export const open_groups_layout = (current = null) => {
  const groups = { ...(current?.groups ?? {}) };
  for (const id of DEFAULT_OPEN_GROUPS) {
    groups[id] = { ...(groups[id] ?? {}), open: true };
  }
  return { ...(current ?? {}), groups };
};

/**
 * The diagram font, inlined into exported SVGs.
 *
 * bpmn-js draws task and event icons with the bpmn font, which the app loads
 * from a stylesheet that lives in the page. A standalone `.svg` — or the
 * `<img>`/canvas used to rasterise a PNG — has no access to that stylesheet,
 * so without the embedded face every icon renders as a blank glyph. The
 * `bpmn-embedded.css` build carries the font as a data URI, which is exactly
 * what a self-contained document needs.
 */
/** `@font-face` sources that point at sibling files (`../font/bpmn.eot`…).
 *  They cannot resolve in a standalone document, and the data-URI faces right
 *  below them already cover every browser, so those lines are dropped instead
 *  of becoming 404s. */
const RELATIVE_FONT_SOURCES = /^(?![^\n]*data:)[^\n]*\.\.\/font\/[^\n]*\n?/gm;

/**
 * CSS inside an SVG is parsed as XML, not as text: a bare `<`, `>` or `&` would
 * be read as a tag or an entity and break the whole document. CDATA keeps the
 * parser out; a `]]>` in the stylesheet would end it early, so it is split
 * across two sections.
 */
const css_in_cdata = (css) =>
  String(css)
    .replace(RELATIVE_FONT_SOURCES, "")
    .replace(/]]>/g, "]]]]><![CDATA[>");

export const inject_svg_styles = (svg, css) => {
  const text = String(svg ?? "");
  if (!text || !css) return text;
  // A document that already carries a stylesheet keeps it: a second copy
  // would duplicate the embedded font.
  if (/<style\b/i.test(text)) return text;

  const root = /<svg\b[^>]*>/i.exec(text);
  if (!root) return text;

  const style = `<style type="text/css"><![CDATA[${css_in_cdata(css)}]]></style>`,
    head = text.slice(0, root.index + root[0].length),
    tail = text.slice(root.index + root[0].length);

  // `<svg … />` cannot hold children, so it is reopened before the style goes
  // in, and the closing tag the document lacked is added after it.
  if (root[0].endsWith("/>")) {
    return `${head.slice(0, -2)}>${style}</svg>${tail}`;
  }

  return `${head}${style}${tail}`;

};

/** A numeric SVG length in px, or `null` when it is a percentage or missing. */
const svg_length = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (!match || match[1].includes("%")) return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * The intrinsic size of an SVG document.
 *
 * `saveSVG` writes both `width`/`height` and a `viewBox`; the viewBox is the
 * fallback for documents whose dimensions were left relative. Returns `null`
 * when neither yields a usable size, which is the only case a raster export
 * cannot be produced.
 */
export const svg_size = (svg) => {
  const tag = String(svg ?? "").match(/<svg\b[^>]*>/i)?.[0] ?? "";
  let width = svg_length(tag, "width"),
    height = svg_length(tag, "height");

  if (!width || !height) {
    const view_box = tag.match(/\bviewBox\s*=\s*"([^"]*)"/i)?.[1] ?? "";
    const parts = view_box.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      width ||= parts[2] > 0 ? parts[2] : null;
      height ||= parts[3] > 0 ? parts[3] : null;
    }
  }

  return width && height ? { width, height } : null;
};

/**
 * The box an element occupies on the diagram, or `null` when it has none.
 *
 * A shape carries `x / y / width / height`; a connection only has waypoints,
 * from which the box is derived. The root (a process or a collaboration) has
 * neither, which is how a process-level problem is told apart from a node.
 *
 * Computed here rather than through `diagram-js`'s `getBBox`: the editor comes
 * in through `bpmn-js`, so `diagram-js` is not a dependency this package
 * declares and a deep import would rely on it being hoisted.
 */
export const element_bounds = (element) => {
  if (!element) return null;

  if (Array.isArray(element.waypoints) && element.waypoints.length > 0) {
    const xs = element.waypoints.map((point) => point.x),
      ys = element.waypoints.map((point) => point.y);
    if (![...xs, ...ys].every(Number.isFinite)) return null;
    const x = Math.min(...xs),
      y = Math.min(...ys);
    return {
      x,
      y,
      width: Math.max(...xs) - x,
      height: Math.max(...ys) - y,
    };
  }

  const { x, y, width, height } = element;
  if (![x, y, width, height].every(Number.isFinite)) return null;
  if (width < 0 || height < 0) return null;
  return { x, y, width, height };
};

/**
 * The viewport that centres `bounds` inside `viewbox`, keeping the zoom.
 *
 * `canvas.scrollToElement()` only pans far enough to bring an element into
 * view and does nothing at all once it is there — clicking the problem of a
 * node that is already on screen would look like a dead button. Centring
 * always moves the canvas, and leaving the zoom alone keeps the rest of the
 * diagram recognisable.
 *
 * Returns `null` for anything without area (a process or collaboration root),
 * which the caller answers with a fit-to-viewport instead. A perfectly
 * horizontal connection has no height; that is still something to centre on.
 */
export const centered_viewbox = (bounds, viewbox) => {
  const width = viewbox?.width,
    height = viewbox?.height;
  if (!(width > 0) || !(height > 0)) return null;
  if (!(bounds?.width >= 0) || !(bounds?.height >= 0)) return null;
  if (!(bounds.width > 0 || bounds.height > 0)) return null;
  return {
    x: bounds.x + bounds.width / 2 - width / 2,
    y: bounds.y + bounds.height / 2 - height / 2,
    width,
    height,
  };
};

/**
 * Flatten the per-element issue map `bpmn-js-bpmnlint` reports into what the
 * page renders: one list plus the counts the toolbar shows.
 *
 * An issue whose element is not on the canvas (a child of a collapsed
 * sub-process, say) is reported under a hoisted id — the participant or the
 * root. The linter keeps the real id in `actualElementId`, so `element` is
 * what a click should aim at and `anchor` is the id that is actually rendered,
 * used as the fallback when the target cannot be reached.
 */
export const summarize_issues = (issues) => {
  const items = [];
  for (const [element_id, entries] of Object.entries(issues ?? {})) {
    for (const entry of entries ?? []) {
      const category =
        entry?.category === "error" || entry?.category === "warn" || entry?.category === "info"
          ? entry.category
          : "rule-error";
      items.push({
        element_id,
        anchor: entry?.actualElementId ? element_id : null,
        element: entry?.actualElementId ?? entry?.id ?? element_id,
        rule: entry?.rule ?? "",
        message: entry?.message ?? "",
        category,
      });
    }
  }

  return {
    items,
    errors: items.filter((item) => item.category === "error").length,
    warnings: items.filter((item) => item.category === "warn").length,
    infos: items.filter((item) => item.category === "info").length,
  };
};

/** Raster scales offered in the export dialog. 2× is the default: legible in
 *  a document, without turning a large diagram into a 20 MB PNG. */
export const PNG_SCALES = [1, 2, 3];

export const png_scale = (value) => {
  const numeric = Number(value);
  return PNG_SCALES.includes(numeric) ? numeric : 2;
};

/** Browsers refuse a canvas beyond roughly this side; a huge diagram is
 *  downscaled rather than failing with an opaque error. */
export const PNG_MAX_SIDE = 8192;

/** Canvas dimensions for a raster export, never exceeding the browser limit. */
export const png_dimensions = (size, scale) => {
  if (!size?.width || !size?.height) return null;
  const factor = Math.min(
    png_scale(scale),
    PNG_MAX_SIDE / Math.max(size.width, size.height),
  );
  return {
    width: Math.max(1, Math.round(size.width * factor)),
    height: Math.max(1, Math.round(size.height * factor)),
  };
};

/**
 * Decide whether a navigation may proceed — without a click when possible.
 *
 * The draft is the safety net, so the order matters: write it first and let
 * the user go when that worked. Only a refused write (private mode, quota)
 * leaves the work in this tab alone, and only then is a question honest;
 * asking earlier would warn about a loss that autosave is about to prevent.
 *
 * `save` resolves to whether the draft reached storage. `ask` is called only
 * in the failing case and resolves to the user's answer. Both are injected so
 * this stays testable without an editor, a router or a dialog.
 */
export const settle_before_leave = async ({ dirty, save, ask }) => {
  if (!dirty) return true;
  if (await save()) return true;
  return ask();
};
