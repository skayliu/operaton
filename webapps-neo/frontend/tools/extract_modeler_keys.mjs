#!/usr/bin/env node
/**
 * Inventory of the strings the modeling libraries render through their own
 * `translate` service.
 *
 * bpmn-js and dmn-js do not go through i18next: they look up `translate` in the
 * didi container, so the strings that need translating are the ones passed to
 * that function. This script scans the installed sources for `translate('…')`
 * and `translate(\`…\`)` and writes a deduplicated list, so a dictionary can be
 * built (and later checked for completeness) without guessing at key names.
 *
 * Usage:
 *   node tools/extract_modeler_keys.mjs
 *   node tools/extract_modeler_keys.mjs --out tools/modeler_keys.json --quiet
 *
 * What it cannot see, and has to be added by hand:
 *   - `translate(SOME_CONSTANT)` — the key is computed at runtime, usually from
 *     a `…_TO_LABEL` map. These are listed under `indirect`.
 *   - `translate('List contains {n} item' + (n === 1 ? '' : 's'))` — the source
 *     string is assembled, so there is no single string to translate. Listed
 *     under `assembled`.
 */

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

/**
 * Where to look. `lib` is the untranspiled source the bundler actually reads;
 * the properties panels only ship a bundle, hence the explicit file.
 */
const TARGETS = [
  { pkg: "bpmn-js", entry: "lib" },
  { pkg: "diagram-js", entry: "lib" },
  { pkg: "bpmn-js-properties-panel", entry: "dist/index.esm.js" },
  { pkg: "@bpmn-io/properties-panel", entry: "dist/index.esm.js" },
  { pkg: "bpmn-js-bpmnlint", entry: "dist/index.esm.js" },
  { pkg: "dmn-js", entry: "lib" },
  { pkg: "dmn-js-shared", entry: "lib" },
  { pkg: "dmn-js-drd", entry: "lib" },
  { pkg: "dmn-js-decision-table", entry: "lib" },
  { pkg: "dmn-js-literal-expression", entry: "lib" },
  { pkg: "dmn-js-boxed-expression", entry: "lib" },
  { pkg: "table-js", entry: "lib" },
];

const SKIP_DIRS = new Set([
  "node_modules",
  "test",
  "tests",
  "__tests__",
  "fixtures",
  "assets",
]);

/**
 * Files that define a `translate` of their own, unrelated to i18n: diagram-js
 * moves shapes with `translate(gfx, x, y)`. Kept as a list rather than guessed
 * at, because a wrong guess either hides a real key or invents one.
 */
const NON_I18N_FILES = [
  /diagram-js\/lib\/core\//,
  /diagram-js\/lib\/util\//,
  /Preview\.js$/,
  /Bendpoint/,
  /ConnectionSegmentMove/,
  /bpmn-js\/lib\/draw\//,
];

// The i18n module itself: its `translate('HELLO {you}')` sits in a doc comment.
const I18N_MODULE = /diagram-js\/lib\/i18n\/translate\/translate\.js$/;

// A single-quoted, double-quoted or backtick string, escapes included.
const LITERAL = [
  '"(?:\\\\[\\s\\S]|[^"\\\\])*"',
  "'(?:\\\\[\\s\\S]|[^'\\\\])*'",
  "`(?:\\\\[\\s\\S]|[^`\\\\])*`",
].join("|");

const CALL = new RegExp(`\\btranslate\\s*\\(\\s*(${LITERAL})`, "g");
const INDIRECT = /\btranslate\s*\(\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*[,)]/g;
const PLACEHOLDER = /\{([A-Za-z_$][\w$.]*)\}/g;

/** Turns a source literal into the string the canvas will ask for. */
const normalize = (raw) => {
  const quote = raw[0];
  let body = raw.slice(1, -1);

  // `${expr}` in a template literal becomes `{expr}`, the placeholder syntax
  // the libraries use for interpolation.
  if (quote === "`") body = body.replace(/\$\{([^{}]*)\}/g, "{$1}");

  return body
    .replace(/\\r/g, " ")
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\(["'`\\])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};

const line_of = (source, index) =>
  source.slice(0, index).split("\n").length;

/**
 * Blanks out comments while keeping every character's offset, so reported line
 * numbers stay true. Without this, the usage examples in JSDoc blocks —
 * `translate('HELLO {you}')` is one — would be counted as interface strings.
 */
const strip_comments = (code) => {
  const blank = (text) => text.replace(/[^\n]/g, " ");
  let out = "";
  let index = 0;

  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];

    if (char === "/" && next === "*") {
      const end = code.indexOf("*/", index + 2);
      const stop = end === -1 ? code.length : end + 2;
      out += blank(code.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === "/" && next === "/") {
      const end = code.indexOf("\n", index + 2);
      const stop = end === -1 ? code.length : end;
      out += blank(code.slice(index, stop));
      index = stop;
      continue;
    }

    // A literal is copied verbatim: `//` inside a string is not a comment.
    if (char === '"' || char === "'" || char === "`") {
      const start = index;
      index += 1;
      while (index < code.length) {
        if (code[index] === "\\") index += 2;
        else if (code[index] === char) {
          index += 1;
          break;
        } else index += 1;
      }
      out += code.slice(start, index);
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
};

const to_posix = (file) => file.split(path.sep).join("/");

const walk = async (abs) => {
  const info = await stat(abs).catch(() => null);
  if (!info) return [];

  if (info.isFile()) return [abs];

  const entries = await readdir(abs, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const child = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...(await walk(child)));
    } else if (
      /\.(js|mjs)$/.test(entry.name) &&
      !/\.(test|spec)\./.test(entry.name) &&
      !/\.min\.js$/.test(entry.name)
    ) {
      files.push(child);
    }
  }

  return files;
};

/**
 * The surface a string belongs to decides how visible it is, and therefore
 * whether it has to be translated on day one (tier 1) or may stay English
 * until the dictionary grows (tier 2).
 */
const surface_of = (pkg, file) => {
  if (/PaletteProvider/i.test(file)) return "palette";
  if (/ContextPadProvider/i.test(file)) return "contextPad";
  if (/PopupMenu|ReplaceMenu|ReplaceOptions/i.test(file)) return "popupMenu";
  if (/properties-panel/.test(pkg)) return "propertiesPanel";
  return "other";
};

const TIER_BY_SURFACE = {
  palette: 1,
  contextPad: 1,
  popupMenu: 1,
  propertiesPanel: 1,
  other: 2,
};

const read_targets = async () => {
  const sources = [];
  const missing = [];

  for (const target of TARGETS) {
    const abs = path.join(ROOT, "node_modules", target.pkg, target.entry);
    const files = await walk(abs);

    if (!files.length) missing.push(target.pkg);
    for (const file of files) {
      sources.push({
        pkg: target.pkg,
        file: to_posix(path.relative(ROOT, file)),
        code: await readFile(file, "utf8"),
      });
    }
  }

  return { sources, missing };
};

const extract = (sources) => {
  const by_key = new Map();
  const indirect = [];
  const assembled = [];

  for (const { pkg, file, code: raw } of sources) {
    if (I18N_MODULE.test(file)) continue;

    const short = to_posix(path.relative(path.join(ROOT, "node_modules", pkg), file));
    const code = strip_comments(raw);
    const own_translate = NON_I18N_FILES.some((pattern) => pattern.test(file));

    for (const match of code.matchAll(CALL)) {
      // `'a' + suffix` is assembled at runtime: the literal alone is not the key.
      if (/^\s*\+/.test(code.slice(match.index + match[0].length))) {
        assembled.push({
          file: `${pkg}/${short}`,
          line: line_of(code, match.index),
        });
        continue;
      }

      const key = normalize(match[1]);
      if (!key) continue;

      const surface = surface_of(pkg, short);
      const existing = by_key.get(key);

      if (existing) {
        existing.sources.push({ pkg, file: short, line: line_of(code, match.index) });
        existing.tier = Math.min(existing.tier, TIER_BY_SURFACE[surface]);
      } else {
        by_key.set(key, {
          key,
          surface,
          tier: TIER_BY_SURFACE[surface],
          vars: [...new Set([...key.matchAll(PLACEHOLDER)].map((m) => m[1]))],
          sources: [{ pkg, file: short, line: line_of(code, match.index) }],
        });
      }
    }

    if (!own_translate) {
      for (const match of code.matchAll(INDIRECT)) {
        indirect.push({
          file: `${pkg}/${short}`,
          line: line_of(code, match.index),
          expression: match[1],
        });
      }
    }
  }

  const keys = [...by_key.values()].sort(
    (a, b) => a.tier - b.tier || a.key.localeCompare(b.key),
  );

  return { keys, indirect, assembled };
};

const parse_args = (argv) => {
  const options = { out: path.join(HERE, "modeler_keys.json"), quiet: false };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--out") options.out = path.resolve(argv[index + 1] ?? "");
    if (argv[index] === "--quiet") options.quiet = true;
    // `--list tier2` prints one group instead of the summary, for review.
    if (argv[index] === "--list") options.list = argv[index + 1];
  }

  return options;
};

const list_group = ({ keys, indirect, assembled }, name) => {
  if (name === "indirect" || name === "assembled") {
    for (const entry of name === "indirect" ? indirect : assembled) {
      console.log(
        `${entry.file}:${entry.line}${entry.expression ? `  ${entry.expression}` : ""}`,
      );
    }
    return;
  }

  const by_surface = ["palette", "contextPad", "popupMenu", "propertiesPanel"].includes(name);
  const tier = name === "tier1" ? 1 : 2;

  for (const key of keys.filter((entry) =>
    by_surface ? entry.surface === name : entry.tier === tier,
  )) {
    const { pkg, file, line } = key.sources[0];
    console.log(`${key.surface.padEnd(16)} ${key.key}   [${pkg}:${file}:${line}]`);
  }
};

const main = async () => {
  const options = parse_args(process.argv.slice(2));
  const { sources, missing } = await read_targets();
  const { keys, indirect, assembled } = extract(sources);

  const tier1 = keys.filter((key) => key.tier === 1);
  const by_pkg = new Map();

  for (const key of keys) {
    for (const source of new Set(key.sources.map((entry) => entry.pkg))) {
      by_pkg.set(source, (by_pkg.get(source) ?? 0) + 1);
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    targets: TARGETS.map((target) => target.pkg),
    totals: {
      keys: keys.length,
      tier1: tier1.length,
      tier2: keys.length - tier1.length,
      indirect: indirect.length,
      assembled: assembled.length,
    },
    keys,
    indirect,
    assembled,
  };

  await mkdir(path.dirname(options.out), { recursive: true });
  await writeFile(options.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (options.list) {
    list_group(report, options.list);
    return;
  }

  if (options.quiet) return;

  const width = Math.max(...[...by_pkg.keys()].map((name) => name.length), 8);

  console.log("strings per package");
  for (const pkg of [...by_pkg.keys()].sort()) {
    console.log(`  ${pkg.padEnd(width)}  ${by_pkg.get(pkg)}`);
  }

  console.log("");
  console.log(`unique keys   ${keys.length}  (tier 1: ${tier1.length}, tier 2: ${keys.length - tier1.length})`);
  console.log(`indirect      ${indirect.length}  (resolve by hand — see the report)`);
  console.log(`assembled     ${assembled.length}  (built by concatenation — see the report)`);
  console.log(`written       ${to_posix(path.relative(process.cwd(), options.out))}`);

  if (missing.length) {
    console.log("");
    console.log(`not installed, skipped: ${missing.join(", ")}`);
  }

  console.log("");
  console.log("tier 1 by surface");
  for (const surface of ["palette", "contextPad", "popupMenu", "propertiesPanel"]) {
    const count = tier1.filter((key) => key.surface === surface).length;
    if (count) console.log(`  ${surface.padEnd(width)}  ${count}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});