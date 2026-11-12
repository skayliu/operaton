import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  MODELER_NS,
  create_i18n_holder,
  get_modeler_dict,
  interpolate,
  modeler_i18n_module,
  refresh_modeler,
  set_modeler_dict,
  sync_modeler_language,
} from "./modeler_i18n.js";

/**
 * A stand-in for the i18next instance: the holder only needs `loadNamespaces`,
 * `getResourceBundle` and `options.fallbackLng`, so the real backend (and its
 * HTTP requests) stays out of the test.
 */
const fake_i18n = (bundles = {}, { fail_load = false } = {}) => {
  const loaded = [];

  return {
    language: "de-DE",
    options: { fallbackLng: "en-US" },
    loaded,
    loadNamespaces: async (ns) => {
      loaded.push(ns);
      if (fail_load) throw new Error("offline");
    },
    getResourceBundle: (lng, ns) => bundles[`${lng}/${ns}`] ?? {},
  };
};

describe("interpolate", () => {
  it("replaces the placeholders bpmn-js passes in", () => {
    expect(interpolate("Gateway {id} is {state}", { id: "a1", state: 0 })).toBe(
      "Gateway a1 is 0",
    );
  });

  it("leaves a placeholder without a value visible", () => {
    expect(interpolate("Hello {you}", {})).toBe("Hello {you}");
  });

  it("returns the template untouched without replacements", () => {
    expect(interpolate("Save", undefined)).toBe("Save");
    expect(interpolate("Save", null)).toBe("Save");
  });

  it("passes a non-string through, because templates may be pre-built", () => {
    expect(interpolate(undefined, {})).toBeUndefined();
  });
});

describe("create_i18n_holder", () => {
  it("translates from the dictionary it was given", () => {
    const holder = create_i18n_holder({ Save: "Speichern" });

    expect(holder.translate("Save")).toBe("Speichern");
  });

  it("falls back to the English source for a missing key", () => {
    const holder = create_i18n_holder({});

    expect(holder.translate("Save")).toBe("Save");
  });

  it("swaps the dictionary without rebuilding the modeler", () => {
    const holder = create_i18n_holder({ Save: "Speichern" });

    holder.set_dict({ Save: "Enregistrer" });

    expect(holder.translate("Save")).toBe("Enregistrer");
  });

  it("interpolates after a lookup, not before", () => {
    const holder = create_i18n_holder({
      "Loop {n}": " Schleife {n}",
    });

    expect(holder.translate("Loop {n}", { n: 3 })).toBe(" Schleife 3");
  });

  it("reports what it can translate", () => {
    const holder = create_i18n_holder({ Save: "Speichern" });

    expect(holder.has("Save")).toBe(true);
    expect(holder.has("Cancel")).toBe(false);
  });

  it("treats a missing dictionary as empty rather than throwing", () => {
    const holder = create_i18n_holder(null);

    expect(holder.translate("Save")).toBe("Save");
  });
});

describe("modeler_i18n_module", () => {
  it("registers translate as a didi value", () => {
    expect(modeler_i18n_module.translate[0]).toBe("value");
    expect(typeof modeler_i18n_module.translate[1]).toBe("function");
  });
});

describe("sync_modeler_language", () => {
  beforeEach(() => {
    set_modeler_dict({});
  });

  it("loads the modeler namespace and applies the bundle", async () => {
    const i18n = fake_i18n({ "de-DE/modeler": { Save: "Speichern" } });

    await sync_modeler_language(i18n);

    expect(i18n.loaded).toEqual([MODELER_NS]);
    expect(get_modeler_dict()).toEqual({ Save: "Speichern" });
  });

  it("falls back to the fallback language when the bundle is missing", async () => {
    const i18n = fake_i18n({ "en-US/modeler": { Save: "Save" } });

    await sync_modeler_language(i18n, "fr-FR");

    expect(get_modeler_dict()).toEqual({ Save: "Save" });
  });

  it("empties the dictionary when there is nothing to fall back to", async () => {
    set_modeler_dict({ Save: "Speichern" });
    const i18n = fake_i18n({});

    await sync_modeler_language(i18n, "fr-FR");

    expect(get_modeler_dict()).toEqual({});
  });

  it("still applies a cached bundle when the backend fails", async () => {
    const i18n = fake_i18n({ "de-DE/modeler": { Save: "Speichern" } }, {
      fail_load: true,
    });

    await sync_modeler_language(i18n);

    expect(get_modeler_dict()).toEqual({ Save: "Speichern" });
  });

  it("returns what it applied, so the caller can tell it worked", async () => {
    const i18n = fake_i18n({ "de-DE/modeler": { Save: "Speichern" } });

    await expect(sync_modeler_language(i18n)).resolves.toEqual({
      Save: "Speichern",
    });
  });

  it("does nothing without an i18n instance", async () => {
    await expect(sync_modeler_language(undefined)).resolves.toEqual({});
  });
});

describe("zh-CN properties panel dictionary", () => {
  // The panel asks for these by their English source string. If the file stops
  // shipping them, the panel silently goes back to English — which is exactly
  // how the gap this dictionary closes went unnoticed the first time.
  const dict = JSON.parse(
    readFileSync(
      // `import.meta.url` is rewritten by the test transform, so resolve against
      // the project root the runner is started from.
      resolve(process.cwd(), "public/locales/zh-CN/modeler.json"),
      "utf8",
    ),
  );

  it("translates the group headings", () => {
    expect(dict["General"]).toBe("常规");
    expect(dict["Documentation"]).toBe("文档");
    expect(dict["History cleanup"]).toBe("历史清理");
    expect(dict["Tasklist"]).toBe("任务列表");
  });

  it("translates the fields a process shows by default", () => {
    expect(dict["Name"]).toBe("名称");
    expect(dict["Version tag"]).toBe("版本标签");
    expect(dict["Executable"]).toBe("可执行");
    expect(dict["This maps to the process definition key."]).toBe(
      "对应流程定义键。",
    );
    expect(dict["Execution listeners"]).toBe("执行监听器");
  });

  it("keeps placeholders verbatim, because substitution runs on the value", () => {
    expect(dict["{eventType}: {type}"]).toBe("{eventType}：{type}");
    expect(dict["The due date as an EL expression (e.g. ${someDate}) or an ISO date (e.g. 2015-06-26T09:54:00)."]).toContain(
      "${someDate}",
    );
  });
});

describe("canvas dictionaries", () => {
  // Every language `src/helper/i18n.js` lists in SUPPORTED_LNGS must ship a
  // modeler.json. es-ES / fr-FR / nl-NL had none at all for a while and failed
  // to English silently, so the list is spelled out rather than globbed.
  const LANGS = [
    "en-US",
    "zh-CN",
    "zh-TW",
    "de-DE",
    "es-ES",
    "fr-FR",
    "nl-NL",
  ];
  const dicts = Object.fromEntries(
    LANGS.map((lng) => [
      lng,
      JSON.parse(
        readFileSync(
          resolve(process.cwd(), `public/locales/${lng}/modeler.json`),
          "utf8",
        ),
      ),
    ]),
  );

  // A key missing from one language silently falls back to English, which is how
  // en-US ended up 359 keys behind the others without anything failing.
  it("ship the same keys in every language", () => {
    const [reference, ...others] = LANGS.map((lng) =>
      Object.keys(dicts[lng]).sort(),
    );

    for (const keys of others) expect(keys).toEqual(reference);
  });

  it("map every English key onto itself", () => {
    for (const [key, value] of Object.entries(dicts["en-US"])) {
      expect(value).toBe(key);
    }
  });

  it("leave no translated value empty", () => {
    for (const lng of LANGS.filter((lng) => lng !== "en-US")) {
      for (const value of Object.values(dicts[lng])) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("translate the panel headings in every language", () => {
    const expected = {
      "en-US": "General",
      "zh-CN": "常规",
      "zh-TW": "一般",
      "de-DE": "Allgemein",
      "es-ES": "General",
      "fr-FR": "Général",
      "nl-NL": "Algemeen",
    };

    for (const [lng, value] of Object.entries(expected)) {
      expect(dicts[lng]["General"]).toBe(value);
    }
  });

  it("keep placeholders verbatim in every translated language", () => {
    const placeholder = "{eventType}: {type}";

    for (const lng of LANGS.filter((lng) => lng !== "en-US")) {
      expect(dicts[lng][placeholder]).toContain("{eventType}");
      expect(dicts[lng][placeholder]).toContain("{type}");
    }
  });

  it("cover the properties panel, not just the palette", () => {
    for (const lng of LANGS) {
      expect(dicts[lng]["Execution listeners"]).toBeTruthy();
      expect(dicts[lng]["History cleanup"]).toBeTruthy();
      expect(dicts[lng]["This maps to the process definition key."]).toBeTruthy();
    }
  });
});

describe("refresh_modeler", () => {
  const fake_modeler = (selection = []) => {
    const fired = [];

    return {
      fired,
      get: (name, strict) => {
        if (name === "eventBus") {
          return { fire: (event, payload) => fired.push([event, payload]) };
        }
        if (name === "selection") return { get: () => selection };
        return strict ? null : undefined;
      },
    };
  };

  it("tells the palette to re-read its labels", () => {
    const modeler = fake_modeler();

    expect(refresh_modeler(modeler)).toBe(true);
    expect(modeler.fired[0][0]).toBe("i18n.changed");
  });

  it("re-announces the selection so an open properties panel re-renders", () => {
    const modeler = fake_modeler([{ id: "task_1" }]);

    refresh_modeler(modeler);

    expect(modeler.fired[1]).toEqual([
      "selection.changed",
      { oldSelection: [], newSelection: [{ id: "task_1" }] },
    ]);
  });

  it("is a no-op without an event bus", () => {
    expect(refresh_modeler(null)).toBe(false);
  });
});