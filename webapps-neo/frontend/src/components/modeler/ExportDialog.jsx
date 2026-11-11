import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
// The font as a data URI: a standalone SVG (and the canvas that rasterises it)
// cannot reach the stylesheet the page loaded, so every icon would be blank.
import bpmn_font_css from "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css?raw";
import { Dialog } from "../Dialog.jsx";
import { XmlCode } from "./XmlCode.jsx";
import { save_file } from "../../helper/download.js";
import {
  PNG_SCALES,
  export_name_for,
  error_message,
  inject_svg_styles,
  png_dimensions,
  svg_size,
} from "./modeler_helpers.js";

/** The three things the dialog can show and save. */
const FORMATS = ["xml", "svg", "png"];

/** Human-readable byte count for the XML tab's caption. */
const format_bytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * View the document's XML and save it as XML, SVG or PNG.
 *
 * The XML tab doubles as the read-only viewer: the same export that a download
 * writes is shown verbatim, with a copy button, so "what will be saved" and
 * "what am I looking at" can never disagree.
 *
 * Only mounted while open (`{open.value && ...}`), which is what keeps the
 * export from being prepared for a dialog nobody opened — and resets the tab,
 * the scale and the preview on every visit.
 */
export const ExportDialog = ({ open, export_xml, export_svg, file_name }) => {
  const [t] = useTranslation();

  // The page passes inline arrows; freezing them in a ref keeps the load
  // effects below from re-running on every render of the page.
  const api = useRef({ export_xml, export_svg, file_name, t });
  api.current = { export_xml, export_svg, file_name, t };

  return (
    <Dialog
      open={open}
      title={t("modeler.export.title")}
      class="modeler-export-dialog"
    >
      {open.value && <ExportBody api={api} open={open} />}
    </Dialog>
  );
};

const ExportBody = ({ api, open }) => {
  const [t] = useTranslation(),
    [format, set_format] = useState("xml"),
    [xml, set_xml] = useState(""),
    [svg, set_svg] = useState(""),
    [png, set_png] = useState(null),
    [scale, set_scale] = useState(2),
    [transparent, set_transparent] = useState(false),
    // The format currently being prepared; a string rather than a boolean so
    // the spinner sits in the panel it belongs to.
    [busy, set_busy] = useState(null),
    [error, set_error] = useState(null),
    [copied, set_copied] = useState(false),
    png_url = useRef(null),
    copy_timer = useRef(null);

  // The XML is the viewer's content, so it is fetched as soon as the dialog
  // opens rather than on first switch to the tab.
  useEffect(() => {
    let cancelled = false;
    set_busy("xml");

    void (async () => {
      try {
        const next = await api.current.export_xml();
        if (cancelled) return;
        if (!next) throw new Error(api.current.t("modeler.export.empty"));
        set_xml(next);
      } catch (caught) {
        if (!cancelled)
          set_error(
            error_message(caught, api.current.t("modeler.export.failed")),
          );
      } finally {
        if (!cancelled) set_busy(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api]);

  // SVG is only rendered when its tab (or the PNG tab) needs it.
  useEffect(() => {
    if (format === "xml" || svg) return;

    let cancelled = false;
    set_busy("svg");
    set_error(null);

    void (async () => {
      try {
        const raw = await api.current.export_svg();
        if (cancelled) return;
        if (!raw) throw new Error(api.current.t("modeler.export.empty"));
        set_svg(inject_svg_styles(raw, bpmn_font_css));
      } catch (caught) {
        if (!cancelled)
          set_error(
            error_message(caught, api.current.t("modeler.export.failed")),
          );
      } finally {
        if (!cancelled) set_busy(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [format, svg, api]);

  // Rasterise whenever the PNG tab is shown, or its options change. Both a
  // blob and an object URL are kept: the blob is what gets downloaded, the URL
  // is what the preview shows.
  useEffect(() => {
    if (format !== "png" || !svg) return;

    let cancelled = false;
    set_busy("png");
    set_error(null);

    void (async () => {
      try {
        const result = await svg_to_png(svg, scale, { transparent });
        if (cancelled) return;

        const url = URL.createObjectURL(result.blob);
        if (png_url.current) URL.revokeObjectURL(png_url.current);
        png_url.current = url;
        set_png({ ...result, url });
      } catch {
        if (!cancelled) set_error(api.current.t("modeler.export.png-failed"));
      } finally {
        if (!cancelled) set_busy(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [format, svg, scale, transparent, api]);

  // The preview of an earlier size is not kept alive by React, so its URL is
  // revoked by hand when the component goes away.
  useEffect(
    () => () => {
      if (png_url.current) URL.revokeObjectURL(png_url.current);
      if (copy_timer.current) clearTimeout(copy_timer.current);
    },
    [],
  );

  const svg_url = useMemo(() => {
    if (!svg) return null;
    return URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
  }, [svg]);

  useEffect(
    () => () => {
      if (svg_url) URL.revokeObjectURL(svg_url);
    },
    [svg_url],
  );

  const xml_meta = useMemo(() => {
    if (!xml) return null;
    return {
      lines: xml.split("\n").length,
      size: format_bytes(new Blob([xml]).size),
    };
  }, [xml]);

  const choose = (next) => {
    set_error(null);
    set_format(next);
  };

  const copy_xml = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(xml);
      set_copied(true);
      if (copy_timer.current) clearTimeout(copy_timer.current);
      copy_timer.current = setTimeout(() => set_copied(false), 2000);
    } catch {
      set_error(t("modeler.export.copy-failed"));
    }
  };

  const save = () => {
    const name = api.current.file_name;
    if (format === "xml" && xml)
      save_file(
        new Blob([xml], { type: "application/xml" }),
        export_name_for(name, "xml"),
      );
    else if (format === "svg" && svg)
      save_file(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
        export_name_for(name, "svg"),
      );
    else if (format === "png" && png)
      save_file(png.blob, export_name_for(name, "png"));
  };

  const can_save =
    (format === "xml" && Boolean(xml)) ||
    (format === "svg" && Boolean(svg)) ||
    (format === "png" && Boolean(png));

  return (
    <div class="dialog-fields modeler-export">
      <div class="button-group modeler-export-tabs">
        {FORMATS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={format === candidate}
            onClick={() => choose(candidate)}
          >
            {candidate.toUpperCase()}
          </button>
        ))}
      </div>

      {format === "xml" && (
        <section class="modeler-export-panel">
          {busy === "xml" ? (
            <p class="modeler-export-status">{t("modeler.export.loading")}</p>
          ) : (
            <>
              <p class="modeler-export-meta">
                {xml_meta
                  ? t("modeler.export.xml-meta", {
                      lines: xml_meta.lines,
                      size: xml_meta.size,
                    })
                  : null}
              </p>
              <XmlCode xml={xml} label={t("modeler.export.xml-label")} />
            </>
          )}
        </section>
      )}

      {format === "svg" && (
        <section class="modeler-export-panel">
          {busy === "svg" ? (
            <p class="modeler-export-status">{t("modeler.export.loading")}</p>
          ) : (
            svg_url && (
              <div class="modeler-export-preview">
                <img src={svg_url} alt={t("modeler.export.preview")} />
              </div>
            )
          )}
        </section>
      )}

      {format === "png" && (
        <section class="modeler-export-panel">
          <div class="modeler-export-options">
            <label>
              {t("modeler.export.scale")}
              <select
                value={scale}
                onChange={(event) => set_scale(Number(event.currentTarget.value))}
              >
                {PNG_SCALES.map((option) => (
                  <option key={option} value={option}>
                    {t("modeler.export.scale-option", { value: option })}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <input
                type="checkbox"
                checked={transparent}
                onChange={(event) => set_transparent(event.currentTarget.checked)}
              />
              {t("modeler.export.transparent")}
            </label>
          </div>

          {/* The SVG is prepared first, so this panel is not idle while it
              loads — an empty panel next to a greyed-out button reads as a
              broken export. */}
          {busy ? (
            <p class="modeler-export-status">
              {busy === "png"
                ? t("modeler.export.rendering")
                : t("modeler.export.loading")}
            </p>
          ) : (
            png && (
              <>
                <p class="modeler-export-meta">
                  {t("modeler.export.png-meta", {
                    width: png.width,
                    height: png.height,
                  })}
                </p>
                <div class="modeler-export-preview">
                  <img src={png.url} alt={t("modeler.export.preview")} />
                </div>
              </>
            )
          )}
        </section>
      )}

      {error && (
        <p class="error" role="alert">
          {error}
        </p>
      )}

      <div class="button-group">
        {format === "xml" && (
          <button type="button" disabled={!xml} onClick={copy_xml}>
            {copied ? t("modeler.export.copied") : t("modeler.export.copy")}
          </button>
        )}
        <button
          type="button"
          class="primary"
          disabled={!can_save || Boolean(busy)}
          onClick={save}
        >
          {t("modeler.export.download", { format: format.toUpperCase() })}
        </button>
        <button type="button" onClick={() => (open.value = false)}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
};

/**
 * Rasterise an exported SVG through a canvas.
 *
 * `image.decode`-style loading is avoided on purpose: the SVG is a blob URL,
 * and `onload` is the one path that behaves the same in every browser. A white
 * ground is painted first unless transparency was asked for — a diagram pasted
 * into a document is unreadable on a dark theme otherwise.
 */
const svg_to_png = (svg, scale, { transparent = false } = {}) =>
  new Promise((resolve, reject) => {
    const size = svg_size(svg),
      dimensions = png_dimensions(size, scale);

    if (!dimensions) {
      reject(new Error("the SVG has no intrinsic size"));
      return;
    }

    const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      ),
      image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("the canvas is not available");

        if (!transparent) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) =>
            blob
              ? resolve({ blob, ...dimensions })
              : reject(new Error("the canvas could not be encoded")),
          "image/png",
        );
      } catch (caught) {
        reject(caught);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("the SVG could not be rasterised"));
    };

    image.src = url;
  });
