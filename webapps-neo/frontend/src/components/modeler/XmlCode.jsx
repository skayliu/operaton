import { useMemo } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { xml_lines } from "./xml_highlight.js";

/**
 * How many lines the viewer colours.
 *
 * A large diagram's XML is mostly coordinate attributes, and every token is an
 * element: past a few thousand lines the layout cost outweighs any reading
 * benefit, so the rest is announced rather than rendered (the download and the
 * copy button still hand over the whole file).
 */
export const XML_MAX_LINES = 2000;

/**
 * The exported XML, syntax-coloured and read-only.
 *
 * Line numbers are sticky rather than repeated: the document does not wrap
 * (`white-space: pre`), so a long `<bpmn:extensionElements>` scrolls sideways
 * and the gutter has to stay put for the numbers to mean anything.
 */
export const XmlCode = ({ xml, label, max_lines = XML_MAX_LINES }) => {
  const [t] = useTranslation();
  const { lines, omitted } = useMemo(
    () => xml_lines(xml, { max_lines }),
    [xml, max_lines],
  );

  return (
    <pre class="modeler-export-code xml-code" aria-label={label}>
      <code>
        {lines.map((tokens, line) => (
          <span class="xml-line" key={line}>
            <span class="xml-ln" aria-hidden="true">
              {line + 1}
            </span>
            <span class="xml-src">
              {tokens.map((token, index) => (
                <span class={`xml-t ${token.type}`} key={index}>
                  {token.text}
                </span>
              ))}
            </span>
          </span>
        ))}
      </code>
      {omitted > 0 && (
        <span class="xml-more">
          {t("modeler.export.xml-truncated", { lines: max_lines })}
        </span>
      )}
    </pre>
  );
};
