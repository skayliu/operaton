#!/usr/bin/env node
/**
 * Properties-panel translations for the canvas dictionaries.
 *
 *   node tools/fill_modeler_panel.mjs           write
 *   node tools/fill_modeler_panel.mjs --check   report only, exit 1 on drift
 *
 * Scope is the properties panel: ~358 keys, most of them full sentences of
 * Camunda documentation text. It lives in its own file (not in
 * `gen_modeler_dicts.mjs`) because that one is driven by the English source file
 * and only covers the palette, the context pad and the replace menu — the
 * strings a user meets before selecting anything.
 *
 * Three keys in `tools/modeler_keys.json` are extractor artefacts: the scanner
 * read a template literal before `${...}` was evaluated, so the recorded "key"
 * is never what `translate` receives at runtime. They are ignored here, and the
 * four real runtime strings they stand for are in `DERIVED`.
 *
 * Terminology is pinned per language rather than copied across:
 *   zh-CN  Camunda 7 中文口径：作业 / 外部任务 / 执行监听器 / 输入·输出映射
 *   zh-TW  台湾 BPMN 术语：工作 / 子流程 / 閘道 / 攔截事件
 *   de-DE  Camunda 7 德文：Aufgabe / Unterprozess / Sequenzfluss / Job-Worker
 * Placeholders are kept verbatim because substitution runs on the *value*, not
 * the key.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DE } from "./modeler-i18n/de.mjs";
import { ES } from "./modeler-i18n/es.mjs";
import { FR } from "./modeler-i18n/fr.mjs";
import { NL } from "./modeler-i18n/nl.mjs";
import { ZH_TW } from "./modeler-i18n/zh-tw.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SPEC_FILE = path.join(ROOT, "tools/modeler_keys.json");

// Every language `src/helper/i18n.js` offers. A missing `modeler.json` used to
// mean "silently fall back to English", which is how es-ES / fr-FR / nl-NL ended
// up with no canvas strings at all; keeping the list here makes the cross-language
// key-set check cover exactly what the UI can select.
const LANG_FILES = {
  "en-US": "public/locales/en-US/modeler.json",
  "zh-CN": "public/locales/zh-CN/modeler.json",
  "zh-TW": "public/locales/zh-TW/modeler.json",
  "de-DE": "public/locales/de-DE/modeler.json",
  "es-ES": "public/locales/es-ES/modeler.json",
  "fr-FR": "public/locales/fr-FR/modeler.json",
  "nl-NL": "public/locales/nl-NL/modeler.json",
};

/** Keys the scanner mis-captured; never passed to `translate` at runtime. */
const EXTRACTOR_ARTEFACTS = [
  "Click to {active ? 'remove' : 'set a'} dynamic value with FEEL expression",
  "List contains {numOfItems} item{items.length != 1 ? 's' : ''}",
  "{getEventLabel(element, listener.get('eventType'))}: {type}",
];

/** Runtime strings produced by the template literals behind the artefacts. */
const DERIVED = {
  "en-US": {
    "Click to remove dynamic value with FEEL expression":
      "Click to remove dynamic value with FEEL expression",
    "Click to set a dynamic value with FEEL expression":
      "Click to set a dynamic value with FEEL expression",
    "List contains {numOfItems} item": "List contains {numOfItems} item",
    "List contains {numOfItems} items": "List contains {numOfItems} items",
  },
  "zh-CN": {
    "Click to remove dynamic value with FEEL expression":
      "点击以移除使用 FEEL 表达式的动态值",
    "Click to set a dynamic value with FEEL expression":
      "点击以设置使用 FEEL 表达式的动态值",
    "List contains {numOfItems} item": "列表包含 {numOfItems} 项",
    "List contains {numOfItems} items": "列表包含 {numOfItems} 项",
  },
  "zh-TW": {
    "Click to remove dynamic value with FEEL expression":
      "點擊以移除使用 FEEL 運算式的動態值",
    "Click to set a dynamic value with FEEL expression":
      "點擊以設定使用 FEEL 運算式的動態值",
    "List contains {numOfItems} item": "清單包含 {numOfItems} 項",
    "List contains {numOfItems} items": "清單包含 {numOfItems} 項",
  },
  "de-DE": {
    "Click to remove dynamic value with FEEL expression":
      "Klicken, um den dynamischen Wert mit FEEL-Ausdruck zu entfernen",
    "Click to set a dynamic value with FEEL expression":
      "Klicken, um einen dynamischen Wert mit FEEL-Ausdruck zu setzen",
    "List contains {numOfItems} item": "Liste enthält {numOfItems} Eintrag",
    "List contains {numOfItems} items": "Liste enthält {numOfItems} Einträge",
  },
  "es-ES": {
    "Click to remove dynamic value with FEEL expression":
      "Haga clic para eliminar el valor dinámico con expresión FEEL",
    "Click to set a dynamic value with FEEL expression":
      "Haga clic para establecer un valor dinámico con expresión FEEL",
    "List contains {numOfItems} item": "La lista contiene {numOfItems} elemento",
    "List contains {numOfItems} items": "La lista contiene {numOfItems} elementos",
  },
  "fr-FR": {
    "Click to remove dynamic value with FEEL expression":
      "Cliquez pour supprimer la valeur dynamique avec expression FEEL",
    "Click to set a dynamic value with FEEL expression":
      "Cliquez pour définir une valeur dynamique avec expression FEEL",
    "List contains {numOfItems} item": "La liste contient {numOfItems} élément",
    "List contains {numOfItems} items": "La liste contient {numOfItems} éléments",
  },
  "nl-NL": {
    "Click to remove dynamic value with FEEL expression":
      "Klik om de dynamische waarde met FEEL-expressie te verwijderen",
    "Click to set a dynamic value with FEEL expression":
      "Klik om een dynamische waarde met FEEL-expressie in te stellen",
    "List contains {numOfItems} item": "Lijst bevat {numOfItems} item",
    "List contains {numOfItems} items": "Lijst bevat {numOfItems} items",
  },
};

// `zh-CN` and `en-US` are verified, not authored: zh-CN already carries its
// panel translations inline, and en-US is the identity map (the key *is* the
// English string). Both still need to stay in the file, because the key sets of
// every dictionary are compared at the end.
//
// The non-Chinese languages are authored in `modeler-i18n/<lng>.mjs`; a language
// with no entry here would fall back to English key by key, silently.
const TRANSLATIONS = {
  "zh-TW": ZH_TW,
  "de-DE": DE,
  "es-ES": ES,
  "fr-FR": FR,
  "nl-NL": NL,
};

/** The English dictionary maps every key onto itself. */
const identity = (keys) => Object.fromEntries(keys.map((key) => [key, key]));

const read_json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

/**
 * Reads a dictionary, treating a missing file as empty.
 *
 * A language that has no `modeler.json` yet is a normal state — es-ES, fr-FR and
 * nl-NL shipped none until they were filled in — so the writer must be able to
 * create one instead of crashing on the first read.
 */
const read_dict = (file) =>
  fs.existsSync(file) ? read_json(file) : (console.log(`create       ${path.relative(ROOT, file).replace(/\\/g, "/")}`), {});

const sorted = (entries) =>
  Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));

/** Properties-panel keys as recorded by the extractor. */
const panel_keys = () => {
  const { keys } = read_json(SPEC_FILE);
  return [
    ...new Set(
      keys.filter((entry) => entry.surface === "propertiesPanel").map((entry) => entry.key),
    ),
  ];
};

/**
 * The palette / context pad / replace menu keys.
 *
 * These belong to `gen_modeler_dicts.mjs`, not to this script: it writes them
 * from the English source, this one only ever translates the panel. Without the
 * distinction, a newly created dictionary (es-ES, fr-FR, nl-NL) would be told
 * its 49 palette entries are "unexpected".
 */
const tier1_keys = () => {
  const surfaces = new Set(["palette", "contextPad", "popupMenu"]);
  const { keys } = read_json(SPEC_FILE);
  return [
    ...new Set(
      keys
        .filter((entry) => entry.tier === 1 && surfaces.has(entry.surface))
        .map((entry) => entry.key),
    ),
  ];
};

const main = () => {
  const check = process.argv.includes("--check");
  const expected = panel_keys().filter((key) => !EXTRACTOR_ARTEFACTS.includes(key));
  const palette = tier1_keys();

  let failed = false;
  const key_sets = new Map();

  for (const lng of Object.keys(LANG_FILES)) {
    const file = path.join(ROOT, LANG_FILES[lng]);
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const current = read_dict(file);
    const derived = DERIVED[lng] ?? {};

    // en-US starts from the identity map and lets the file win, so a deliberate
    // wording change in the English source survives; the other languages are
    // authored here and overwrite whatever is in the file.
    const translations =
      TRANSLATIONS[lng] ?? (lng === "en-US" ? identity(expected) : {});
    const next =
      lng === "en-US"
        ? { ...translations, ...current, ...derived }
        : { ...current, ...translations, ...derived };

    key_sets.set(lng, new Set(Object.keys(next)));

    // Two directions matter: a key upstream no longer uses would sit in the file
    // forever translating nothing (usually the English source was reworded), and
    // a key we translated but never added is work the user never sees.
    const missing = expected.filter(
      (key) => typeof next[key] !== "string" || !next[key].trim(),
    );
    const unexpected = Object.keys(next).filter(
      (key) =>
        !(key in current) &&
        !expected.includes(key) &&
        !(key in derived) &&
        !palette.includes(key),
    );

    const body = `${JSON.stringify(sorted(next), null, 2)}\n`;
    const changed = body !== `${JSON.stringify(current, null, 2)}\n`;

    if (missing.length || unexpected.length) {
      failed = true;
      console.error(
        `${rel}: ${missing.length} missing, ${unexpected.length} unexpected`,
      );
      missing.forEach((key) => console.error(`  missing    ${JSON.stringify(key)}`));
      unexpected.forEach((key) => console.error(`  unexpected ${JSON.stringify(key)}`));
      continue;
    }

    if (check) {
      if (changed) {
        failed = true;
        console.error(`${rel}: out of date (run without --check)`);
      } else {
        console.log(`${rel}: up to date, ${Object.keys(next).length} keys`);
      }
      continue;
    }

    if (changed) fs.writeFileSync(file, body, "utf8");
    console.log(
      `${changed ? "wrote" : "unchanged"}  ${rel}  ${Object.keys(next).length} keys`,
    );
  }

  // Every dictionary must expose the same keys: a key missing from one
  // language silently falls back to English, which is exactly how en-US ended
  // up 359 keys behind the others.
  const [ref_lng, ref_keys] = [...key_sets][0] ?? [];
  for (const [lng, keys] of key_sets) {
    if (lng === ref_lng) continue;
    const missing = [...ref_keys].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !ref_keys.has(key));
    if (!missing.length && !extra.length) continue;
    failed = true;
    console.error(`${lng}: key set differs from ${ref_lng}`);
    missing.forEach((key) => console.error(`  missing  ${JSON.stringify(key)}`));
    extra.forEach((key) => console.error(`  extra    ${JSON.stringify(key)}`));
  }

  if (failed) process.exitCode = 1;
};

// zh-CN keeps its panel translations inline in `public/locales/zh-CN/modeler.json`
// and is verified by the test suite rather than rewritten here.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}