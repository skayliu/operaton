/**
 * Fills the canvas dictionaries (public/locales/<lng>/modeler.json) with the
 * first-tier translations: the palette, the context pad and the replace menu,
 * i.e. the strings a user sees before touching anything else.
 *
 * The English file stays the source of the key list — a missing key falls back
 * to the English source string at runtime, so a half-filled dictionary degrades
 * to "partly English" rather than to blank labels.
 *
 * Existing values are kept unless `--force` is passed: a dictionary that has
 * been reviewed by hand must not be silently rewritten by a re-run.
 *
 *   node tools/fill_modeler_dicts.mjs           write
 *   node tools/fill_modeler_dicts.mjs --check   report only, exit 1 on drift
 *   node tools/fill_modeler_dicts.mjs --force   overwrite existing values
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PANEL_ZH_KEYS } from "./modeler-i18n/zh-cn.mjs";

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = join(FRONTEND, "public", "locales");
const FALLBACK = "en-US";
const KEYS_FILE = join(FRONTEND, "tools", "modeler_keys.json");

// The strings this script owns: what the editor shows before a single property
// is opened. "en-US/modeler.json" holds the whole 408-key dictionary now, so
// judging every key against the 49-entry translation table below would report
// the properties panel as untranslated.
const TIER1_SURFACES = new Set(["palette", "contextPad", "popupMenu"]);

const tier1_keys = () => {
  const { keys } = JSON.parse(readFileSync(KEYS_FILE, "utf8"));
  return [
    ...new Set(
      keys
        .filter((entry) => entry.tier === 1 && TIER1_SURFACES.has(entry.surface))
        .map((entry) => entry.key),
    ),
  ];
};

const FORCE = process.argv.includes("--force");
const CHECK = process.argv.includes("--check");

const read_json = (path) => JSON.parse(readFileSync(path, "utf8"));

/** Sorted the way the files are: by source string, so diffs stay readable. */
const sorted = (entries) =>
  Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));

/** Keys whose translation would change: new keys, or values that differ. */
const stale_keys = (a, b) =>
  Object.keys(b).filter((key) => !(key in a) || a[key] !== b[key]);

const en = read_json(join(LOCALES, FALLBACK, "modeler.json"));

/**
 * de-DE, zh-CN, zh-TW.
 *
 * Terms are pinned to the German and Chinese BPMN literature rather than to the
 * Camunda docs: "Sequenzielle/Parallel-Mehrfachinstanz" for multi-instance,
 * "Unterprozess" for sub-process, "Flow" for sequence flow.
 */
const TRANSLATIONS = {
  "de-DE": {
    "Activate create/remove space tool": "Werkzeug für Abstand ein-/ausblenden aktivieren",
    "Activate global connect tool": "Werkzeug „Global verbinden“ aktivieren",
    "Activate hand tool": "Hand-Werkzeug aktivieren",
    "Activate lasso tool": "Lasso-Werkzeug aktivieren",
    "Add lane above": "Lane oberhalb hinzufügen",
    "Add lane below": "Lane unterhalb hinzufügen",
    "Add text annotation": "Textanmerkung hinzufügen",
    "Append business knowledge model": "Wissensmodell anhängen",
    "Append compensation activity": "Kompensationsaktivität anhängen",
    "Append conditional intermediate catch event": "Konditionales fangendes Zwischenereignis anhängen",
    "Append decision": "Entscheidung anhängen",
    "Append end event": "Endereignis anhängen",
    "Append gateway": "Gateway anhängen",
    "Append input data": "Eingabedaten anhängen",
    "Append intermediate/boundary event": "Zwischen-/Anheftungsereignis anhängen",
    "Append knowledge source": "Wissensquelle anhängen",
    "Append message intermediate catch event": "Fangendes Nachrichten-Zwischenereignis anhängen",
    "Append receive task": "Empfangsaufgabe anhängen",
    "Append signal intermediate catch event": "Fangendes Signal-Zwischenereignis anhängen",
    "Append task": "Aufgabe anhängen",
    "Append timer intermediate catch event": "Fangendes Zeit-Zwischenereignis anhängen",
    "Change element": "Element ändern",
    "Change type": "Typ ändern",
    Collection: "Kollektion",
    "Connect to other element": "Mit anderem Element verbinden",
    "Connect using association": "Mit Assoziation verbinden",
    "Connect using data input association": "Mit Dateninput-Assoziation verbinden",
    "Create data object reference": "Datenobjekt-Referenz erstellen",
    "Create data store reference": "Datenspeicher-Referenz erstellen",
    "Create decision": "Entscheidung erstellen",
    "Create end event": "Endereignis erstellen",
    "Create expanded sub-process": "Erweiterten Unterprozess erstellen",
    "Create gateway": "Gateway erstellen",
    "Create group": "Gruppe erstellen",
    "Create input data": "Eingabedaten erstellen",
    "Create intermediate/boundary event": "Zwischen-/Anheftungsereignis erstellen",
    "Create knowledge model": "Wissensmodell erstellen",
    "Create knowledge source": "Wissensquelle erstellen",
    "Create pool/participant": "Pool/Teilnehmer erstellen",
    "Create start event": "Startereignis erstellen",
    "Create task": "Aufgabe erstellen",
    Delete: "Löschen",
    "Divide into three lanes": "In drei Lanes aufteilen",
    "Divide into two lanes": "In zwei Lanes aufteilen",
    Loop: "Schleife",
    "Parallel multi-instance": "parallele Mehrmalinstanz",
    "Participant multiplicity": "Teilnehmer-Mehrfachinstanz",
    "Sequential multi-instance": "sequentielle Mehrmalinstanz",
    "Toggle non-interrupting": "Nicht unterbrechend umschalten",
  },

  "zh-CN": {
    "Activate create/remove space tool": "启用创建/移除空间工具",
    "Activate global connect tool": "启用全局连接工具",
    "Activate hand tool": "启用抓手工具",
    "Activate lasso tool": "启用套索工具",
    "Add lane above": "在上方添加泳道",
    "Add lane below": "在下方添加泳道",
    "Add text annotation": "添加文字标注",
    "Append business knowledge model": "追加业务知识模型",
    "Append compensation activity": "追加补偿活动",
    "Append conditional intermediate catch event": "追加条件中间捕获事件",
    "Append decision": "追加决策",
    "Append end event": "追加结束事件",
    "Append gateway": "追加网关",
    "Append input data": "追加输入数据",
    "Append intermediate/boundary event": "追加中间/边界事件",
    "Append knowledge source": "追加知识源",
    "Append message intermediate catch event": "追加消息中间捕获事件",
    "Append receive task": "追加接收任务",
    "Append signal intermediate catch event": "追加信号中间捕获事件",
    "Append task": "追加任务",
    "Append timer intermediate catch event": "追加定时中间捕获事件",
    "Change element": "更改元素",
    "Change type": "更改类型",
    Collection: "集合",
    "Connect to other element": "连接到其他元素",
    "Connect using association": "使用关联连接",
    "Connect using data input association": "使用数据输入关联连接",
    "Create data object reference": "创建数据对象引用",
    "Create data store reference": "创建数据存储引用",
    "Create decision": "创建决策",
    "Create end event": "创建结束事件",
    "Create expanded sub-process": "创建展开的流程",
    "Create gateway": "创建网关",
    "Create group": "创建分组",
    "Create input data": "创建输入数据",
    "Create intermediate/boundary event": "创建中间/边界事件",
    "Create knowledge model": "创建知识模型",
    "Create knowledge source": "创建知识源",
    "Create pool/participant": "创建池/参与者",
    "Create start event": "创建开始事件",
    "Create task": "创建任务",
    Delete: "删除",
    "Divide into three lanes": "分为三条泳道",
    "Divide into two lanes": "分为两条泳道",
    Loop: "循环",
    "Parallel multi-instance": "并行多实例",
    "Participant multiplicity": "参与者多实例",
    "Sequential multi-instance": "顺序多实例",
    "Toggle non-interrupting": "切换非中断",
  },

  // Traditional Chinese follows Taiwan's BPMN terminology: 事件 (event),
  // 閘道 (gateway), 工作 (task), 子流程 (sub-process).
  "zh-TW": {
    "Activate create/remove space tool": "啟用建立/移除空間工具",
    "Activate global connect tool": "啟用全域連線工具",
    "Activate hand tool": "啟用抓手工具",
    "Activate lasso tool": "啟用圈選工具",
    "Add lane above": "在上方新增泳道",
    "Add lane below": "在下方新增泳道",
    "Add text annotation": "新增文字註解",
    "Append business knowledge model": "附加商業知識模型",
    "Append compensation activity": "附加補償活動",
    "Append conditional intermediate catch event": "附加條件中間攔截事件",
    "Append decision": "附加決策",
    "Append end event": "附加結束事件",
    "Append gateway": "附加閘道",
    "Append input data": "附加輸入資料",
    "Append intermediate/boundary event": "附加中間/邊界事件",
    "Append knowledge source": "附加知識來源",
    "Append message intermediate catch event": "附加訊息中間攔截事件",
    "Append receive task": "附加接收工作",
    "Append signal intermediate catch event": "附加訊號中間攔截事件",
    "Append task": "附加工作",
    "Append timer intermediate catch event": "附加計時中間攔截事件",
    "Change element": "變更元素",
    "Change type": "變更類型",
    Collection: "集合",
    "Connect to other element": "連線至其他元素",
    "Connect using association": "使用關聯連線",
    "Connect using data input association": "使用資料輸入關聯連線",
    "Create data object reference": "建立資料物件參考",
    "Create data store reference": "建立資料儲存參考",
    "Create decision": "建立決策",
    "Create end event": "建立結束事件",
    "Create expanded sub-process": "建立展開的子流程",
    "Create gateway": "建立閘道",
    "Create group": "建立群組",
    "Create input data": "建立輸入資料",
    "Create intermediate/boundary event": "建立中間/邊界事件",
    "Create knowledge model": "建立知識模型",
    "Create knowledge source": "建立知識來源",
    "Create pool/participant": "建立池/參與者",
    "Create start event": "建立開始事件",
    "Create task": "建立工作",
    Delete: "刪除",
    "Divide into three lanes": "分為三條泳道",
    "Divide into two lanes": "分為兩條泳道",
    Loop: "迴圈",
    "Parallel multi-instance": "並行多重執行",
    "Participant multiplicity": "參與者多重執行",
    "Sequential multi-instance": "循序多重執行",
    "Toggle non-interrupting": "切換非中斷",
  },
};

let failed = false;

for (const [lng, translations] of Object.entries(TRANSLATIONS)) {
  const path = join(LOCALES, lng, "modeler.json");
  const current = read_json(path);

  // A key that no longer exists upstream, or a key whose English source
  // changed, would sit in the file forever translating nothing. The properties
  // panel is not in `en-US` (it is only translated for zh-CN), so its keys are
  // allowed through.
  const orphans = Object.keys(current).filter(
    (key) => !(key in en) && !PANEL_ZH_KEYS.includes(key),
  );
  const untranslated = tier1_keys().filter(
    (key) => translations[key] == null,
  );

  if (orphans.length || untranslated.length) {
    failed = true;
    console.error(
      `${lng}: ${orphans.length} orphan key(s), ${untranslated.length} key(s) without a translation`,
    );
    orphans.forEach((key) => console.error(`  orphan      ${key}`));
    untranslated.forEach((key) => console.error(`  missing     ${key}`));
    continue;
  }

  // Seeded with the current file: the properties panel and any other surface
  // live here too, and rebuilding from `en` alone would drop them.
  const next = { ...current };
  for (const key of Object.keys(en)) {
    next[key] = FORCE ? translations[key] : (current[key] ?? translations[key]);
  }
  const stale = stale_keys(current, next);

  if (CHECK) {
    if (stale.length) {
      failed = true;
      console.error(`${lng}: out of date (${stale.length})`);
      stale.slice(0, 10).forEach((key) => console.error(`  ${key}`));
    } else {
      console.log(`${lng}: up to date`);
    }
    continue;
  }

  writeFileSync(path, `${JSON.stringify(sorted(next), null, 2)}\n`, "utf8");
  console.log(`${lng}: ${Object.keys(next).length} key(s), ${stale.length} updated`);
}

if (failed) process.exit(1);