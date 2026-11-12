/**
 * The language of the canvas itself.
 *
 * The shell around the editor is translated by i18next (the `translation.json`
 * files under `public/locales`),
 * but the strings *inside* bpmn-js and dmn-js never reach i18next: the libraries
 * resolve their own `translate` service from the didi container and render the
 * result directly. Registering one more `translate` under the same name makes the
 * container hand ours out instead — no patching of `node_modules`, and the
 * properties panel follows for free, because every provider there asks for
 * `injector.get('translate')` when it builds a group or an entry label.
 *
 * The dictionary is a flat "English source string -> translation" map, kept in
 * its own namespace (`modeler.json`) rather than in `translation.json`:
 *
 *   - i18next parses `.` in a key as a nesting separator, and the source strings
 *     are full of them (`e.g.`, `${someDate}`, `collectEntries (List<Object>)`);
 *     a flat lookup sidesteps that entirely.
 *   - the placeholder syntax differs: bpmn-js writes `{name}`, i18next writes
 *     `{{name}}`. Doing the substitution here means the dictionaries can hold
 *     the source strings verbatim.
 *
 * A missing key falls back to the English source, so an incomplete dictionary
 * degrades to "partly English" instead of blank labels.
 */

/** i18next namespace holding the canvas dictionaries. */
export const MODELER_NS = "modeler";

// bpmn-js interpolates `{name}`; anything that is not a plain identifier is
// left alone rather than guessed at.
const PLACEHOLDER = /\{([A-Za-z_$][\w$.]*)\}/g;

/**
 * Replaces `{name}` in a bpmn-js template with the matching value.
 *
 * Unknown placeholders are left as written, which is what the libraries do too —
 * a visible `{foo}` is easier to report than a silently dropped word.
 */
export const interpolate = (template, values) => {
  if (typeof template !== "string") return template;
  if (!values || typeof values !== "object") return template;

  return template.replace(PLACEHOLDER, (placeholder, name) =>
    name in values ? String(values[name]) : placeholder,
  );
};

/**
 * A translate function whose dictionary can be swapped while the editor lives.
 *
 * The modeler is constructed once and kept; rebuilding it to change language
 * would throw away the undo history and the user's place on the canvas. The
 * holder stays in the container, so `set_dict` is the whole switch.
 */
export const create_i18n_holder = (initial = {}) => {
  let dict = initial && typeof initial === "object" ? initial : {};

  const translate = (template, values) =>
    interpolate(dict[template] ?? template, values);

  return {
    translate,
    set_dict(next) {
      dict = next && typeof next === "object" ? next : {};
      return dict;
    },
    get_dict: () => dict,
    has: (key) => Object.hasOwn(dict, key),
  };
};

/**
 * One holder shared by every editor instance.
 *
 * BPMN and DMN each get their own didi container, but both should answer in the
 * language the user picked, and switching language must reach a modeler that is
 * already mounted. A shared holder makes "the canvas language" a single value
 * instead of one per editor.
 */
const holder = create_i18n_holder();

/**
 * The didi module to append *last* in `additionalModules`.
 *
 * `Viewer` already registers `diagram-js/lib/i18n/translate`; didi lets the last
 * registration of a name win, so anything after this one would put the English
 * translate back.
 */
export const modeler_i18n_module = { translate: ["value", holder.translate] };

/** The same module, for the per-view options a DMN modeler takes. */
export const modeler_i18n_additional_modules = [modeler_i18n_module];

export const set_modeler_dict = (dict) => holder.set_dict(dict);

export const get_modeler_dict = () => holder.get_dict();

/**
 * Picks the bundle that belongs to `lng`.
 *
 * An empty bundle means "no modeler.json for this language yet", which is a
 * normal state while translations are being filled in — the reader then gets
 * the fallback language rather than an empty canvas.
 */
const bundle_for = (i18n, lng) => {
  const bundle = i18n.getResourceBundle?.(lng, MODELER_NS);
  return bundle && Object.keys(bundle).length ? bundle : null;
};

/**
 * Points the canvas at the language `i18n` is currently using.
 *
 * Call it on startup and again on `languageChanged`. It only swaps the
 * dictionary: strings already rendered (the palette is built once, when the
 * modeler is constructed) keep their old text until the next render, so a
 * language switch during an open editor needs a re-import to show through.
 */
export const sync_modeler_language = async (i18n, lng = i18n?.language) => {
  if (!i18n) return {};

  try {
    await i18n.loadNamespaces?.(MODELER_NS);
  } catch {
    // Offline, or the file is missing: fall through to whatever is cached.
  }

  const bundle = (lng && bundle_for(i18n, lng)) ?? null;
  if (bundle) return set_modeler_dict(bundle);

  // `fallbackLng` is a string or an array depending on the i18next version.
  const fallbacks =
    typeof i18n.options?.fallbackLng === "string"
      ? [i18n.options.fallbackLng]
      : (i18n.options?.fallbackLng ?? []);
  const fallback_lng = fallbacks.find((code) => code && code !== lng) ?? "en-US";

  return set_modeler_dict(bundle_for(i18n, fallback_lng) ?? {});
};

/**
 * Re-renders what a `translate` swap alone cannot reach.
 *
 * The palette builds its entries once, at construction, and diagram-js only
 * re-reads them on `i18n.changed` — firing that event is the whole refresh, and
 * it costs nothing: no re-import, no lost undo history, no viewbox to restore.
 *
 * The properties panel is the one surface that does not listen: it follows the
 * selection, so the current selection is re-announced to make an open panel
 * pick up the new labels.
 */
export const refresh_modeler = (modeler) => {
  const event_bus = modeler?.get?.("eventBus", false);
  if (!event_bus) return false;

  event_bus.fire("i18n.changed");

  const selection = modeler.get("selection", false);
  const new_selection = selection?.get?.() ?? [];
  event_bus.fire("selection.changed", {
    oldSelection: [],
    newSelection: new_selection,
  });

  return true;
};
