#!/usr/bin/env node
/*
 * Writes the canvas dictionaries from the extracted key list.
 *
 *   node tools/gen_modeler_dicts.mjs [--check]
 *
 * Scope is deliberate: only the strings a user meets before opening a single
 * property — the palette, the context pad and the replace menu. The properties
 * panel is 359 keys and lives in `fill_modeler_panel.mjs`; a missing key falls
 * back to English, so an incomplete dictionary is a cosmetic problem, never a
 * blank label.
 *
 * Values start as the English source. A translator edits `modeler.json`
 * directly; re-running this script keeps every existing key (the properties
 * panel lives in the same file and is owned by `fill_modeler_panel.mjs`) and
 * only adds the keys that appeared upstream. `--check` fails instead of
 * writing, which is what CI should run once the files are meant to stay
 * complete.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const KEYS_FILE = path.join(ROOT, "tools/modeler_keys.json");

const LANGS = [
  "en-US",
  "de-DE",
  "zh-CN",
  "zh-TW",
  "es-ES",
  "fr-FR",
  "nl-NL",
];

// `propertiesPanel` holds the long tail; these three are what the editor shows
// before anything is selected.
const SURFACES = new Set(["palette", "contextPad", "popupMenu"]);

const read_json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const tier1_keys = () => {
  const { keys } = read_json(KEYS_FILE);
  const wanted = keys.filter(
    (entry) => entry.tier === 1 && SURFACES.has(entry.surface),
  );
  // Sorting by source string keeps the diff between runs small and makes two
  // languages easy to compare side by side.
  return [...new Set(wanted.map((entry) => entry.key))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
};

const write_dict = (lng, keys) => {
  const file = path.join(ROOT, `public/locales/${lng}/modeler.json`);
  const existing = fs.existsSync(file) ? read_json(file) : {};
  // Seeded with what is already there: this script owns the palette, the context
  // pad and the replace menu, not the properties panel, and a rebuild that
  // dropped every other surface would silently undo that work.
  const dict = { ...existing };

  // Keep translator work: an existing value wins, a new key starts English.
  for (const key of keys) {
    const value = existing[key];
    if (typeof value !== "string" || !value) dict[key] = key;
  }

  const body = `${JSON.stringify(dict, null, 2)}\n`;
  return { file, body, changed: body !== `${JSON.stringify(existing, null, 2)}\n` };
};

const main = () => {
  const check = process.argv.includes("--check");
  const keys = tier1_keys();

  let stale = 0;

  for (const lng of LANGS) {
    const { file, body, changed } = write_dict(lng, keys);
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");

    if (check) {
      if (changed) {
        stale += 1;
        console.log(`out of date  ${rel}  (run without --check)`);
      } else {
        console.log(`ok           ${rel}  ${keys.length} keys`);
      }
      continue;
    }

    if (changed) fs.writeFileSync(file, body, "utf8");
    console.log(`${changed ? "wrote" : "unchanged"}  ${rel}  ${keys.length} keys`);
  }

  console.log(`\nsource        ${path.relative(ROOT, KEYS_FILE).replace(/\\/g, "/")}`);
  console.log(`surfaces      palette, contextPad, popupMenu`);

  if (check && stale) process.exitCode = 1;
};

main();