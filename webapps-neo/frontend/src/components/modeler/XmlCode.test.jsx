import { describe, expect, it } from "vitest";
import { render } from "@testing-library/preact";
import { XmlCode } from "./XmlCode.jsx";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d">
  <bpmn:process id="P1" isExecutable="false" />
</bpmn:definitions>`;

/** The document as the viewer shows it, without the gutter numbers. */
const shown = (container) =>
  Array.from(container.querySelectorAll(".xml-src"))
    .map((line) => line.textContent)
    .join("\n");

describe("XmlCode", () => {
  it("shows every line with its number, and the text unchanged", () => {
    const { container } = render(<XmlCode xml={XML} />);

    expect(container.querySelectorAll(".xml-line")).toHaveLength(4);
    expect(
      Array.from(container.querySelectorAll(".xml-ln")).map((n) => n.textContent),
    ).toEqual(["1", "2", "3", "4"]);
    expect(shown(container)).toBe(XML);
  });

  it("colours the element name, the attribute and its value apart", () => {
    const { container } = render(<XmlCode xml={XML} />);

    expect(container.querySelector(".xml-t.tag").textContent).toBe(
      "bpmn:definitions",
    );
    expect(container.querySelector(".xml-t.attr").textContent).toBe("xmlns:bpmn");
    expect(container.querySelector(".xml-t.value").textContent).toBe(
      '"http://www.omg.org/spec/BPMN/20100524/MODEL"',
    );
  });

  it("marks the prolog as its own kind rather than a tag", () => {
    const { container } = render(<XmlCode xml={XML} />);

    expect(container.querySelector(".xml-t.prolog").textContent).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>',
    );
  });

  it("keeps the gutter out of the accessible name", () => {
    const { container } = render(<XmlCode xml={XML} label="BPMN XML" />);

    expect(container.querySelector("pre").getAttribute("aria-label")).toBe(
      "BPMN XML",
    );
    expect(
      container.querySelector(".xml-ln").getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("announces the rest of a document it did not render", () => {
    const { container } = render(<XmlCode xml={XML} max_lines={2} />);

    expect(container.querySelectorAll(".xml-line")).toHaveLength(2);
    expect(container.querySelector(".xml-more").textContent).toBe(
      "modeler.export.xml-truncated",
    );
  });

  it("says nothing extra when the whole document fits", () => {
    const { container } = render(<XmlCode xml={XML} />);
    expect(container.querySelector(".xml-more")).toBeNull();
  });

  it("renders an empty document without a line to number", () => {
    const { container } = render(<XmlCode xml="" />);

    expect(container.querySelectorAll(".xml-line")).toHaveLength(0);
    expect(container.textContent).toBe("");
  });
});
