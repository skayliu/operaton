import { describe, expect, it } from "vitest";
import { TOKEN, tokenize_xml, xml_lines } from "./xml_highlight.js";

/** Join every token back together: the viewer relies on this being lossless. */
const rejoin = (tokens) => tokens.map((token) => token.text).join("");

/** The non-space token kinds, in order — enough to pin down the structure. */
const kinds = (xml) =>
  tokenize_xml(xml)
    .filter((token) => token.type !== TOKEN.SPACE)
    .map((token) => token.type);

describe("tokenize_xml", () => {
  it("returns the input unchanged when the tokens are joined", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d">
  <!-- a comment -->
  <bpmn:process id="P1" isExecutable="false"><![CDATA[a < b && c]]></bpmn:process>
  <bpmn:text name="a &amp; b">x &lt; y</bpmn:text>
</bpmn:definitions>
`;
    expect(rejoin(tokenize_xml(xml))).toBe(xml);
  });

  it("separates element names, attribute names and values", () => {
    const tokens = tokenize_xml('<bpmn:process id="P1" isExecutable="false">');

    expect(tokens.map((token) => [token.type, token.text])).toEqual([
      [TOKEN.PUNCT, "<"],
      [TOKEN.TAG, "bpmn:process"],
      [TOKEN.SPACE, " "],
      [TOKEN.ATTR, "id"],
      [TOKEN.PUNCT, "="],
      [TOKEN.VALUE, '"P1"'],
      [TOKEN.SPACE, " "],
      [TOKEN.ATTR, "isExecutable"],
      [TOKEN.PUNCT, "="],
      [TOKEN.VALUE, '"false"'],
      [TOKEN.PUNCT, ">"],
    ]);
  });

  it("keeps a `>` inside an attribute value from ending the tag", () => {
    const xml = '<text data-note="a &gt; b">hi</text>';

    // The whole tag survives: a naive <[^>]*> split would cut it at the
    // escaped `>` in the value and colour the rest as text.
    expect(kinds(xml).slice(0, 2)).toEqual([TOKEN.PUNCT, TOKEN.TAG]);
    expect(rejoin(tokenize_xml(xml))).toBe(xml);
  });

  it("leaves comments, CDATA and the prolog in one piece", () => {
    expect(kinds('<?xml version="1.0"?>')).toEqual([TOKEN.PROLOG]);
    expect(kinds('<!-- <not a tag> -->')).toEqual([TOKEN.COMMENT]);
    expect(kinds("<![CDATA[<b>raw</b>]]>")).toEqual([TOKEN.CDATA]);
    expect(kinds('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd">'))
      .toEqual([TOKEN.DOCTYPE]);
  });

  it("closes a self-closing tag without an attribute", () => {
    expect(kinds("<bpmn:startEvent/>")).toEqual([
      TOKEN.PUNCT,
      TOKEN.TAG,
      TOKEN.PUNCT,
    ]);
  });

  it("does not mistake the slash of a closing tag for punctuation", () => {
    const tokens = tokenize_xml("</bpmn:process>");

    expect(tokens[0]).toEqual({ type: TOKEN.PUNCT, text: "</" });
    expect(tokens[1]).toEqual({ type: TOKEN.TAG, text: "bpmn:process" });
  });

  it("marks character entities in text", () => {
    expect(kinds("<a>x &amp; y</a>")).toContain(TOKEN.ENTITY);
    expect(tokenize_xml("&amp;")[0]).toEqual({
      type: TOKEN.ENTITY,
      text: "&amp;",
    });
  });

  it("survives an unterminated construct by falling back to text", () => {
    const xml = "<a><!-- no end";
    expect(rejoin(tokenize_xml(xml))).toBe(xml);
  });

  it("handles an empty document", () => {
    expect(tokenize_xml("")).toEqual([]);
    expect(tokenize_xml(null)).toEqual([]);
  });
});

describe("xml_lines", () => {
  it("splits into lines and keeps the newline out of the content", () => {
    const { lines, total_lines, omitted } = xml_lines("<a>\n  <b/>\n</a>");

    expect(lines).toHaveLength(3);
    expect(total_lines).toBe(3);
    expect(omitted).toBe(0);
    expect(rejoin(lines[1])).toBe("  <b/>");
  });

  it("reports what it left out instead of rendering it", () => {
    const { lines, total_lines, omitted } = xml_lines("a\nb\nc", {
      max_lines: 2,
    });

    expect(lines).toHaveLength(2);
    expect(total_lines).toBe(3);
    expect(omitted).toBe(1);
  });

  it("gives the whole document when no cap is set", () => {
    const xml = Array.from({ length: 50 }, (_, i) => `<n id="${i}"/>`).join(
      "\n",
    );
    expect(xml_lines(xml).lines).toHaveLength(50);
  });

  it("returns nothing for an empty document", () => {
    expect(xml_lines("")).toEqual({ lines: [], total_lines: 0, omitted: 0 });
  });
});
