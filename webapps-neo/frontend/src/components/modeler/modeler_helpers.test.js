import { describe, expect, it } from "vitest";
import {
  centered_viewbox,
  clamp_panel_width,
  deployed_version,
  element_bounds,
  deployment_name_for,
  DEFAULT_OPEN_GROUPS,
  PANEL_SIZE,
  PANEL_WIDTH_KEY,
  stored_minimap_open,
  stored_panel_collapsed,
  stored_panel_width,
  write_stored,
  error_message,
  format_saved_time,
  file_name_for_process,
  is_blank_bpmn,
  kind_from_file_name,
  normalize_xml,
  open_groups_layout,
  same_xml,
  sanitize_file_name,
  strip_extension,
  export_name_for,
  inject_svg_styles,
  png_dimensions,
  png_scale,
  sanitize_base,
  settle_before_leave,
  summarize_issues,
  svg_size,
} from "./modeler_helpers.js";
import {
  bpmn_template,
  new_bpmn_template,
  random_process_id,
  template_for,
} from "./templates.js";

describe("kind_from_file_name", () => {
  it("recognises BPMN under both spellings", () => {
    expect(kind_from_file_name("invoice.bpmn")).toBe("bpmn");
    expect(kind_from_file_name("invoice.BPMN20.XML")).toBe("bpmn");
  });

  it("names the other kinds the modeler knows", () => {
    expect(kind_from_file_name("rules.dmn")).toBe("dmn");
    expect(kind_from_file_name("form.form")).toBe("form");
  });

  it("returns null for anything else", () => {
    expect(kind_from_file_name("readme.md")).toBeNull();
    expect(kind_from_file_name("")).toBeNull();
  });
});

describe("sanitize_file_name", () => {
  it("keeps an ASCII name unchanged", () => {
    expect(sanitize_file_name("invoice-v2.bpmn")).toBe("invoice-v2.bpmn");
  });

  it("folds path separators and non-ASCII characters", () => {
    // Camunda 7 stores the resource name verbatim; some versions then fail to
    // resolve it again, so the name is ASCII-only before it reaches the engine.
    expect(sanitize_file_name("../../发票 2024.bpmn")).toBe("2024.bpmn");
    expect(sanitize_file_name("my process.bpmn")).toBe("my_process.bpmn");
  });

  it("always ends in the kind's extension", () => {
    expect(sanitize_file_name("no-extension", "bpmn")).toBe("no-extension.bpmn");
    expect(sanitize_file_name("x.dmn", "bpmn")).toBe("x.bpmn");
  });

  it("falls back to a usable name", () => {
    expect(sanitize_file_name("", "bpmn")).toBe("diagram.bpmn");
    expect(sanitize_file_name("中文", "bpmn")).toBe("diagram.bpmn");
  });
});

describe("naming", () => {
  it("strips the extension for the deployment name", () => {
    expect(strip_extension("invoice.bpmn")).toBe("invoice");
    expect(deployment_name_for("invoice.bpmn")).toBe("invoice");
    expect(deployment_name_for("", "fallback")).toBe("fallback");
  });

  it("follows the process id, not the previous file name", () => {
    expect(file_name_for_process("Process_1zbh82")).toBe("Process_1zbh82.bpmn");
    expect(file_name_for_process("order fulfilment")).toBe(
      "order_fulfilment.bpmn",
    );
    // A missing id must leave the current name alone rather than fall back to
    // `diagram.bpmn` while the user is clearing the field.
    expect(file_name_for_process("")).toBeNull();
    expect(file_name_for_process(undefined)).toBeNull();
  });
});

describe("deployed_version", () => {
  it("reads the version of whatever the deployment created", () => {
    expect(
      deployed_version({
        deployedProcessDefinitions: { "invoice:1:abc": { version: 4 } },
      }),
    ).toBe(4);
    expect(
      deployed_version({
        deployedDecisionDefinitions: { "rules:1:def": { version: 2 } },
      }),
    ).toBe(2);
  });

  it("returns null when the response carries no definition", () => {
    expect(deployed_version({})).toBeNull();
    expect(deployed_version(undefined)).toBeNull();
  });
});

describe("xml comparison", () => {
  it("ignores line endings and outer whitespace", () => {
    expect(normalize_xml("  <a/>\r\n")).toBe("<a/>");
    expect(same_xml("<a/>\r\n", "  <a/>\n")).toBe(true);
    expect(same_xml("<a/>", "<b/>")).toBe(false);
  });
});

describe("error_message", () => {
  it("prefers the engine's message, then the error type", () => {
    expect(error_message({ message: "nope" })).toBe("nope");
    expect(error_message({ type: "RestException" })).toBe("RestException");
    expect(error_message(undefined, "fallback")).toBe("fallback");
  });
});

describe("format_saved_time", () => {
  it("prints milliseconds so two saves in one second stay distinguishable", () => {
    const first = new Date(2026, 9, 28, 10, 24, 3, 7).getTime();
    const second = first + 412;
    expect(format_saved_time(first)).toBe("10:24:03.007");
    expect(format_saved_time(second)).toBe("10:24:03.419");
    expect(format_saved_time(first)).not.toBe(format_saved_time(second));
  });

  it("pads every part to a fixed width", () => {
    expect(format_saved_time(new Date(2026, 0, 1, 0, 0, 0, 0).getTime())).toBe("00:00:00.000");
    expect(format_saved_time(new Date(2026, 0, 1, 9, 5, 4, 42).getTime())).toBe("09:05:04.042");
  });

  it("accepts an ISO string and rejects anything unparsable", () => {
    const local = new Date(2026, 9, 28, 10, 24, 3, 7);
    expect(format_saved_time(local.toISOString())).toBe("10:24:03.007");
    expect(format_saved_time(null)).toBe("");
    expect(format_saved_time("not a date")).toBe("");
  });
});

describe("templates", () => {
  const template = bpmn_template("Process_0o4edn2");

  it("ships a BPMN template with an executable process", () => {
    expect(template).toContain('<bpmn:process id="Process_0o4edn2"');
    expect(template).toContain('isExecutable="true"');
    // Deployment is refused without a TTL once a history level is configured.
    expect(template).toContain("camunda:historyTimeToLive");
    // The plane must point at the generated id, or the diagram is unbound.
    expect(template).toContain('bpmnElement="Process_0o4edn2"');
  });

  it("leaves the process name blank", () => {
    expect(template).not.toMatch(/<bpmn:process[^>]*\bname=/);
  });

  it("generates a distinct id per document", () => {
    const ids = new Set();
    for (let index = 0; index < 50; index += 1) ids.add(random_process_id());

    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^Process_[a-z0-9]{7}$/);
  });

  it("skips ids it was told are already taken", () => {
    const taken = ["Process_0000000", "Process_1111111"];
    for (let index = 0; index < 20; index += 1) {
      expect(taken).not.toContain(random_process_id(taken));
    }
  });

  it("creates a new document every time", () => {
    expect(new_bpmn_template()).not.toBe(new_bpmn_template());
  });

  it("has a template for BPMN only", () => {
    expect(template_for("bpmn")).toContain("<bpmn:process");
    expect(template_for("dmn")).toBeNull();
  });
});

describe("is_blank_bpmn", () => {
  it("treats freshly generated documents as blank, whatever their id", () => {
    expect(is_blank_bpmn(new_bpmn_template())).toBe(true);
    expect(is_blank_bpmn(new_bpmn_template())).toBe(true);
  });

  it("treats an empty document as blank", () => {
    expect(is_blank_bpmn("")).toBe(true);
    expect(is_blank_bpmn(null)).toBe(true);
  });

  it("keeps a named process", () => {
    const named = bpmn_template("Process_abc1234").replace(
      'id="Process_abc1234" isExecutable',
      'id="Process_abc1234" name="Order" isExecutable',
    );
    expect(is_blank_bpmn(named)).toBe(false);
  });

  it("keeps a drawn process", () => {
    const drawn = bpmn_template("Process_abc1234").replace(
      "</bpmn:process>",
      '<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1" /></bpmn:process>',
    );
    expect(is_blank_bpmn(drawn)).toBe(false);
  });
});

describe("open_groups_layout", () => {
  it("expands the groups a new process is started from", () => {
    const layout = open_groups_layout();
    for (const id of DEFAULT_OPEN_GROUPS) {
      expect(layout.groups[id].open).toBe(true);
    }
  });

  it("keeps the groups the user toggled and any other layout keys", () => {
    const layout = open_groups_layout({
      groups: { extensionElements: { open: false }, general: { open: false } },
      other: 1,
    });
    expect(layout.groups.extensionElements.open).toBe(false);
    expect(layout.groups.general.open).toBe(true);
    expect(layout.other).toBe(1);
  });
});

const memory_storage = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};

describe("clamp_panel_width", () => {
  it("keeps a width inside the readable range", () => {
    expect(clamp_panel_width(400, 1400)).toBe(400);
  });

  it("never shrinks the panel below the minimum", () => {
    expect(clamp_panel_width(10, 1400)).toBe(PANEL_SIZE.min);
    expect(clamp_panel_width(-200, 1400)).toBe(PANEL_SIZE.min);
  });

  it("never lets the panel take the canvas below its floor", () => {
    // 1000 - 420 stays under the 720 ceiling, so the canvas floor is what caps it.
    expect(clamp_panel_width(2000, 1000)).toBe(1000 - PANEL_SIZE.canvas_min);
    expect(clamp_panel_width(2000, 3000)).toBe(PANEL_SIZE.max);
  });

  it("returns the default for a non-numeric value", () => {
    expect(clamp_panel_width("wide", 1400)).toBe(PANEL_SIZE.default);
    expect(clamp_panel_width(undefined, 1400)).toBe(PANEL_SIZE.default);
  });
});

describe("layout preferences", () => {
  it("falls back to the defaults when nothing was stored", () => {
    const storage = memory_storage();
    expect(stored_panel_width(1400, storage)).toBe(PANEL_SIZE.default);
    expect(stored_panel_collapsed(storage)).toBe(false);
    expect(stored_minimap_open(storage)).toBe(true);
  });

  it("reads back what was written", () => {
    const storage = memory_storage();
    write_stored(PANEL_WIDTH_KEY, 480, storage);
    expect(stored_panel_width(1400, storage)).toBe(480);
  });

  it("clamps a stored width against the current window", () => {
    const storage = memory_storage();
    write_stored(PANEL_WIDTH_KEY, 700, storage);
    expect(stored_panel_width(900, storage)).toBe(900 - PANEL_SIZE.canvas_min);
  });

  it("treats blocked storage as empty instead of throwing", () => {
    const blocked = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(() => write_stored(PANEL_WIDTH_KEY, 400, blocked)).not.toThrow();
    expect(stored_panel_width(1400, blocked)).toBe(PANEL_SIZE.default);
    expect(stored_minimap_open(blocked)).toBe(true);
  });
});

describe("export names", () => {
  it("strips the document extension before adding the export one", () => {
    expect(sanitize_base("Process_1zbh82.bpmn")).toBe("Process_1zbh82");
    expect(export_name_for("Process_1zbh82.bpmn", "xml")).toBe(
      "Process_1zbh82.bpmn",
    );
    expect(export_name_for("Process_1zbh82.bpmn", "svg")).toBe(
      "Process_1zbh82.svg",
    );
    expect(export_name_for("Process_1zbh82.bpmn", "png")).toBe(
      "Process_1zbh82.png",
    );
  });

  it("sanitises a non-ASCII document name the same way deployment does", () => {
    // Every character folds to `_`, then the empty core falls back — the same
    // result `sanitize_file_name` gives for a deployment.
    expect(export_name_for("订单 流程.bpmn", "svg")).toBe("diagram.svg");
    expect(export_name_for("", "png")).toBe("diagram.png");
  });
});

describe("svg_size", () => {
  it("reads the width and height saveSVG writes", () => {
    expect(
      svg_size('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"></svg>'),
    ).toEqual({ width: 640, height: 480 });
  });

  it("falls back to the viewBox when the sides are relative", () => {
    expect(
      svg_size('<svg width="100%" height="100%" viewBox="0 0 300 200"></svg>'),
    ).toEqual({ width: 300, height: 200 });
  });

  it("has no size when neither is usable", () => {
    expect(svg_size("<svg></svg>")).toBe(null);
    expect(svg_size("")).toBe(null);
  });
});

describe("inject_svg_styles", () => {
  it("puts the stylesheet inside the root element", () => {
    const result = inject_svg_styles("<svg><g /></svg>", ".x{fill:red}");
    expect(result).toBe(
      '<svg><style type="text/css"><![CDATA[.x{fill:red}]]></style><g /></svg>',
    );
  });

  it("stays inside the root when the document opens with a declaration", () => {
    // `saveSVG` writes the XML declaration (and some versions a DOCTYPE)
    // first; injecting after the first ">" would put the <style> outside <svg>
    // and every parser would reject the file.
    const result = inject_svg_styles(
      '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg width="10" height="10"><g /></svg>',
      ".x{fill:red}",
    );

    expect(result.indexOf("<style")).toBeGreaterThan(result.indexOf("<svg"));
    expect(result.indexOf("<style")).toBeLessThan(result.indexOf("<g /></svg>"));
  });

  it("reopens a self-closing root so it can hold the stylesheet", () => {
    expect(inject_svg_styles('<svg width="10" />', ".x{}")).toBe(
      '<svg width="10" ><style type="text/css"><![CDATA[.x{}]]></style></svg>',
    );
  });

  it("keeps a stylesheet from ending the CDATA section early", () => {
    const result = inject_svg_styles("<svg></svg>", ".x{content:']]>'}");
    expect(result).toContain("]]]]><![CDATA[>");
  });

  it("drops font sources that a standalone document cannot resolve", () => {
    // `bpmn-embedded.css` lists the sibling files first and the data URI after
    // them; only the unresolvable lines go.
    const result = inject_svg_styles(
      "<svg></svg>",
      "@font-face {\n  src: url('../font/bpmn.eot?a');\n  src: url('data:abc') format('woff');\n}",
    );
    expect(result).not.toContain("../font/");
    expect(result).toContain("data:abc");
  });

  it("does not inject a second stylesheet", () => {
    const once = inject_svg_styles("<svg></svg>", ".x{}");
    expect(inject_svg_styles(once, ".y{}")).toBe(once);
  });

  it("leaves the document alone when there is nothing to inject", () => {
    expect(inject_svg_styles("<svg />", "")).toBe("<svg />");
    expect(inject_svg_styles("", ".x{}")).toBe("");
  });
});

describe("png export sizing", () => {
  it("accepts only the offered scales", () => {
    expect(png_scale(1)).toBe(1);
    expect(png_scale("3")).toBe(3);
    expect(png_scale(7)).toBe(2);
    expect(png_scale(undefined)).toBe(2);
  });

  it("multiplies the svg size by the scale", () => {
    expect(png_dimensions({ width: 640, height: 480 }, 2)).toEqual({
      width: 1280,
      height: 960,
    });
  });

  it("downscales instead of handing the browser an oversized canvas", () => {
    const result = png_dimensions({ width: 10000, height: 5000 }, 3);
    expect(result.width).toBe(8192);
    expect(result.height).toBe(4096);
  });

  it("has no dimensions without a size", () => {
    expect(png_dimensions(null, 2)).toBe(null);
  });
});

describe("settle_before_leave", () => {
  it("does not save or ask when nothing was edited", async () => {
    let saves = 0;
    let asks = 0;

    await expect(
      settle_before_leave({
        dirty: false,
        save: () => {
          saves += 1;
          return true;
        },
        ask: () => {
          asks += 1;
          return false;
        },
      }),
    ).resolves.toBe(true);
    expect(saves).toBe(0);
    expect(asks).toBe(0);
  });

  it("leaves without asking once the draft is written", async () => {
    let asks = 0;

    await expect(
      settle_before_leave({
        dirty: true,
        save: async () => true,
        ask: () => {
          asks += 1;
          return false;
        },
      }),
    ).resolves.toBe(true);
    expect(asks).toBe(0);
  });

  it("asks only when the draft could not be written", async () => {
    let asks = 0;

    const allowed = await settle_before_leave({
      dirty: true,
      save: async () => false,
      ask: () => {
        asks += 1;
        return false;
      },
    });

    expect(asks).toBe(1);
    expect(allowed).toBe(false);
  });

  it("returns the user's answer to the failed-save question", async () => {
    await expect(
      settle_before_leave({
        dirty: true,
        save: async () => false,
        ask: async () => true,
      }),
    ).resolves.toBe(true);
  });
});

describe("centered_viewbox", () => {
  const viewbox = { x: 0, y: 0, width: 1000, height: 500 };

  it("puts the element in the middle without changing the size", () => {
    expect(centered_viewbox({ x: 300, y: 200, width: 100, height: 80 }, viewbox)).toEqual({
      x: 300 + 50 - 500,
      y: 200 + 40 - 250,
      width: 1000,
      height: 500,
    });
  });

  it("returns null for an element without area, so the caller can fit instead", () => {
    expect(centered_viewbox({ x: 0, y: 0, width: 0, height: 0 }, viewbox)).toBeNull();
    expect(centered_viewbox(null, viewbox)).toBeNull();
  });

  it("centres a horizontal connection, which has no height", () => {
    expect(centered_viewbox({ x: 100, y: 200, width: 300, height: 0 }, viewbox)).toEqual({
      x: 100 + 150 - 500,
      y: 200 - 250,
      width: 1000,
      height: 500,
    });
  });

  it("returns null when the canvas has no viewport yet", () => {
    expect(centered_viewbox({ x: 0, y: 0, width: 10, height: 10 }, null)).toBeNull();
    expect(
      centered_viewbox({ x: 0, y: 0, width: 10, height: 10 }, { width: 0, height: 0 }),
    ).toBeNull();
  });
});

describe("element_bounds", () => {
  it("reads the box of a shape", () => {
    expect(element_bounds({ x: 10, y: 20, width: 100, height: 80 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    });
  });

  it("derives the box of a connection from its waypoints", () => {
    expect(
      element_bounds({
        waypoints: [
          { x: 10, y: 60 },
          { x: 110, y: 60 },
          { x: 110, y: 20 },
        ],
      }),
    ).toEqual({ x: 10, y: 20, width: 100, height: 40 });
  });

  it("returns null for a root, which has no geometry at all", () => {
    expect(element_bounds({ id: "Process_1", type: "bpmn:Process" })).toBeNull();
    expect(element_bounds(null)).toBeNull();
  });
});

describe("summarize_issues", () => {
  it("aims at the real element of a hoisted issue and keeps the anchor", () => {
    const { items } = summarize_issues({
      Participant_1: [
        {
          id: "Participant_1",
          actualElementId: "Task_in_collapsed_subprocess",
          rule: "bpmnlint/label-required",
          message: "Element is missing label",
          category: "warn",
        },
      ],
    });

    expect(items[0].element).toBe("Task_in_collapsed_subprocess");
    expect(items[0].anchor).toBe("Participant_1");
    expect(items[0].element_id).toBe("Participant_1");
  });

  it("has no anchor for an issue on an element that is on the canvas", () => {
    const { items } = summarize_issues({
      Task_1: [
        { id: "Task_1", rule: "bpmnlint/no-implicit-split", message: "x", category: "error" },
      ],
    });

    expect(items[0].element).toBe("Task_1");
    expect(items[0].anchor).toBeNull();
  });

  it("falls back to the map key and counts categories", () => {
    const summary = summarize_issues({
      Process_1: [{ message: "no start event" }],
      Task_1: [{ id: "Task_1", category: "info", message: "i", rule: "r" }],
    });

    expect(summary.items[0].element).toBe("Process_1");
    expect(summary.items[1].category).toBe("info");
    expect(summary.errors).toBe(0);
    expect(summary.warnings).toBe(0);
    expect(summary.infos).toBe(1);
  });
});
