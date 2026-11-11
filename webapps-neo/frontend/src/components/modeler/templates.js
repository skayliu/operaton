/**
 * Starting documents for the modeler.
 *
 * A template rather than `createDiagram()`: the XML stays readable in tests,
 * and the process already carries the `camunda:historyTimeToLive` Camunda 7 /
 * Operaton expect on an executable process (deployment is refused without it
 * as soon as a history level is configured).
 *
 * The process id is generated per document rather than fixed. A shared
 * `Process_1` would give every diagram the same process key, so a second
 * deployment would silently add a version to someone else's definition instead
 * of creating a new one — and two people modelling at once would collide.
 * The id is also left out of the name: an empty process name is the honest
 * state of a new diagram, and the properties panel already shows it blank.
 */

/** Seven base-36 characters, matching what bpmn-js produces (`Process_0o4edn2`). */
const SUFFIX_LENGTH = 7,
  ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

const random_suffix = (length) => {
  const bytes = new Uint8Array(length),
    // `crypto` is available in every browser the app supports and in Node 18+;
    // the fallback only keeps tests and exotic runtimes working.
    web_crypto = globalThis.crypto;

  if (web_crypto?.getRandomValues) web_crypto.getRandomValues(bytes);
  else for (let index = 0; index < length; index += 1) bytes[index] = Math.floor(Math.random() * 256);

  let suffix = "";
  for (const byte of bytes) suffix += ALPHABET[byte % ALPHABET.length];
  return suffix;
};

/**
 * A process id that is not in `taken` (a Set or an array of ids already used
 * in this session). Collisions are vanishingly unlikely, but retrying is what
 * makes "never the same as a previous document" a guarantee rather than a
 * probability.
 */
export const random_process_id = (taken = []) => {
  const used = new Set(taken);
  let id;
  do {
    id = `Process_${random_suffix(SUFFIX_LENGTH)}`;
  } while (used.has(id));
  return id;
};

const XML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** Ids are generated here, but a template is also the entry point for
 *  anything that later builds a document from a name — keep the XML valid. */
const xml_escape = (value) =>
  String(value ?? "").replace(/[&<>"]/g, (char) => XML_ESCAPES[char]);

/** The BPMN document for a given process id, with a blank process name. */
export const bpmn_template = (process_id) => {
  const id = xml_escape(process_id);
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn"
                  exporter="webapps-neo">
  <bpmn:process id="${id}" isExecutable="true" camunda:historyTimeToLive="180">
    <bpmn:startEvent id="StartEvent_1" name="Start" />
    <bpmn:endEvent id="EndEvent_1" name="End" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${id}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="420" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
};

/** A fresh document whose process id collides with nothing in `taken`. */
export const new_bpmn_template = (taken = []) =>
  bpmn_template(random_process_id(taken));

/** The template for a kind, or `null` when P0 does not support it yet. */
export const template_for = (kind, taken = []) =>
  kind === "bpmn" ? new_bpmn_template(taken) : null;
