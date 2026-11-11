/**
 * A tokenizer for the export dialog's read-only XML viewer.
 *
 * It yields tokens rather than markup on purpose: the viewer builds spans from
 * these values, so the document being displayed is never spliced into
 * `innerHTML`. A highlighter library would also be a poor trade here — the
 * dialog needs a handful of token kinds, and this chunk already carries bpmn-js.
 *
 * Pure and DOM-free, so it runs in happy-dom next to the other modeler helpers.
 */

/** Token kinds. Each doubles as the class suffix on the rendered span. */
export const TOKEN = {
  TEXT: "text",
  PUNCT: "punct",
  TAG: "tag",
  ATTR: "attr",
  VALUE: "value",
  ENTITY: "entity",
  COMMENT: "comment",
  CDATA: "cdata",
  PROLOG: "prolog",
  DOCTYPE: "doctype",
  SPACE: "space",
};

/**
 * One node of the document: a comment, CDATA, processing instruction, doctype,
 * a whole tag, or a character entity. Everything between matches is text.
 *
 * Tags allow quoted attribute values that contain `>` — the reason a naive
 * `<[^>]*>` split mis-highlights documents whose CSS or XPath is inlined.
 */
const NODE_PATTERN =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\][^>]*)?>|<\/?[A-Za-z_][\w.:-]*(?:"[^"]*"|'[^']*'|[^>"'])*\/?>|&(?:#[0-9]+|#x[0-9a-fA-F]+|[A-Za-z_][\w.-]*);/;

/**
 * The inside of a single tag, longest alternative first:
 *   1 `/` or `</`      2 `>` or `/>`      3-5 `name = "value"`      6 a bare name
 *   7 a stray `=`      8 whitespace        9 anything else (single char)
 *
 * Group 6 covers both the element name (the first bare name) and valueless
 * attributes — the caller knows which from position, the pattern cannot.
 */
const TAG_PATTERN =
  /(<\/?)|(\/?>)|([A-Za-z_][\w.:-]*)(\s*=\s*)("[^"]*"|'[^']*')|([A-Za-z_][\w.:-]*)|(=)|(\s+)|([^\s])/;

/** The kind of a whole-node match, by how it opens. */
const kind_of = (raw) => {
  if (raw.startsWith("<!--")) return TOKEN.COMMENT;
  if (raw.startsWith("<![CDATA[")) return TOKEN.CDATA;
  if (raw.startsWith("<?")) return TOKEN.PROLOG;
  if (raw.startsWith("<!")) return TOKEN.DOCTYPE;
  if (raw.startsWith("&")) return TOKEN.ENTITY;
  return TOKEN.TAG;
};

/** Split one tag into punctuation, element name, attributes and their values. */
const tag_tokens = (raw) => {
  const tokens = [];
  let named = false;

  for (const part of raw.matchAll(new RegExp(TAG_PATTERN, "g"))) {
    if (part[1] || part[2]) tokens.push({ type: TOKEN.PUNCT, text: part[0] });
    else if (part[3]) {
      tokens.push({ type: TOKEN.ATTR, text: part[3] });
      tokens.push({ type: TOKEN.PUNCT, text: part[4] });
      tokens.push({ type: TOKEN.VALUE, text: part[5] });
    } else if (part[6]) {
      tokens.push({ type: named ? TOKEN.ATTR : TOKEN.TAG, text: part[6] });
      named = true;
    } else if (part[7]) tokens.push({ type: TOKEN.PUNCT, text: part[7] });
    else if (part[8]) tokens.push({ type: TOKEN.SPACE, text: part[0] });
    else tokens.push({ type: TOKEN.PUNCT, text: part[0] });
  }

  return tokens;
};

/**
 * Tokenise an XML document. Concatenating the `text` of every token gives the
 * input back exactly — whitespace and all — which is what the viewer relies on.
 */
export const tokenize_xml = (source) => {
  const xml = String(source ?? "");
  const tokens = [];
  let at = 0;

  for (const match of xml.matchAll(new RegExp(NODE_PATTERN, "g"))) {
    if (match.index > at)
      tokens.push({ type: TOKEN.TEXT, text: xml.slice(at, match.index) });

    const raw = match[0];
    // A tag is the one node that carries structure worth colouring; every
    // other kind stays in one piece.
    if (raw.startsWith("<") && !/^<[!?]/.test(raw))
      tokens.push(...tag_tokens(raw));
    else tokens.push({ type: kind_of(raw), text: raw });

    at = match.index + raw.length;
  }

  if (at < xml.length) tokens.push({ type: TOKEN.TEXT, text: xml.slice(at) });
  return tokens;
};

/** The first `count` lines of `text`, newline-joined, without splitting twice. */
const head = (text, count) => {
  let end = 0;
  for (let line = 0; line < count; line += 1) {
    const next = text.indexOf("\n", end);
    if (next === -1) return text;
    end = next + 1;
  }
  return text.slice(0, Math.max(end - 1, 0));
};

/** Break a token stream into lines, keeping a token that spans lines on each. */
const to_lines = (tokens) => {
  const lines = [[]];

  for (const token of tokens) {
    token.text.split("\n").forEach((piece, index) => {
      if (index > 0) lines.push([]);
      if (piece) lines[lines.length - 1].push({ type: token.type, text: piece });
    });
  }

  return lines;
};

/**
 * Tokenise, split into lines, and report how much was left out.
 *
 * `max_lines` cap the work: a diagram's XML can run to thousands of lines and
 * tens of thousands of spans, which the browser would spend longer laying out
 * than the dialog stays open. Cutting the *source* at a line boundary first
 * keeps the scan proportional to what is actually shown; a construct that
 * straddles the cut (an unclosed comment) just loses its colouring, and the
 * dialog still offers the full file as a download.
 */
export const xml_lines = (source, { max_lines = 0 } = {}) => {
  const xml = String(source ?? "");
  if (!xml) return { lines: [], total_lines: 0, omitted: 0 };

  const total_lines = xml.split("\n").length;
  const shown = max_lines > 0 ? head(xml, max_lines) : xml;
  const lines = to_lines(tokenize_xml(shown));

  return {
    lines,
    total_lines,
    omitted: Math.max(total_lines - lines.length, 0),
  };
};
