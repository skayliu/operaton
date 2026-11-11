/**
 * bpmnlint configuration for the modeler.
 *
 * `bpmn-js-bpmnlint` expects the packed form a bundler plugin normally emits —
 * `{ config, resolver }` — not a `.bpmnlintrc`. There is no `bpmnlint-loader` in
 * a Vite build, so the rules are imported here by name and handed to a
 * `StaticResolver`: every rule the config enables must already be in the
 * cache, because the browser cannot `require()` a rule path at runtime.
 *
 * The rule set is `bpmnlint:recommended`, expanded rather than referenced:
 * `extends` would make the linter resolve a config package dynamically, which
 * is exactly what a static build cannot do.
 */
import StaticResolver from "bpmnlint/lib/resolver/static-resolver";
import recommended_module from "bpmnlint/config/recommended";

import ad_hoc_sub_process from "bpmnlint/rules/ad-hoc-sub-process";
import conditional_flows from "bpmnlint/rules/conditional-flows";
import end_event_required from "bpmnlint/rules/end-event-required";
import event_based_gateway from "bpmnlint/rules/event-based-gateway";
import event_sub_process_typed_start_event from "bpmnlint/rules/event-sub-process-typed-start-event";
import fake_join from "bpmnlint/rules/fake-join";
import global from "bpmnlint/rules/global";
import label_required from "bpmnlint/rules/label-required";
import link_event from "bpmnlint/rules/link-event";
import no_bpmndi from "bpmnlint/rules/no-bpmndi";
import no_complex_gateway from "bpmnlint/rules/no-complex-gateway";
import no_disconnected from "bpmnlint/rules/no-disconnected";
import no_duplicate_sequence_flows from "bpmnlint/rules/no-duplicate-sequence-flows";
import no_gateway_join_fork from "bpmnlint/rules/no-gateway-join-fork";
import no_implicit_split from "bpmnlint/rules/no-implicit-split";
import no_implicit_end from "bpmnlint/rules/no-implicit-end";
import no_implicit_start from "bpmnlint/rules/no-implicit-start";
import no_inclusive_gateway from "bpmnlint/rules/no-inclusive-gateway";
import no_overlapping_elements from "bpmnlint/rules/no-overlapping-elements";
import single_blank_start_event from "bpmnlint/rules/single-blank-start-event";
import single_event_definition from "bpmnlint/rules/single-event-definition";
import start_event_required from "bpmnlint/rules/start-event-required";
import sub_process_blank_start_event from "bpmnlint/rules/sub-process-blank-start-event";
import superfluous_gateway from "bpmnlint/rules/superfluous-gateway";
import superfluous_label from "bpmnlint/rules/superfluous-label";
import superfluous_termination from "bpmnlint/rules/superfluous-termination";

/**
 * bpmnlint is CommonJS. Vite pre-bundles it and hands back `module.exports`,
 * but other toolchains put it on `.default`; accept either so a build variant
 * does not turn every rule into "unknown rule".
 */
const unwrap = (module) =>
  typeof module === "function"
    ? module
    : (module?.default ?? module?.check ?? module);

const RULE_FACTORIES = {
  "ad-hoc-sub-process": unwrap(ad_hoc_sub_process),
  "conditional-flows": unwrap(conditional_flows),
  "end-event-required": unwrap(end_event_required),
  "event-based-gateway": unwrap(event_based_gateway),
  "event-sub-process-typed-start-event": unwrap(
    event_sub_process_typed_start_event,
  ),
  "fake-join": unwrap(fake_join),
  global: unwrap(global),
  "label-required": unwrap(label_required),
  "link-event": unwrap(link_event),
  "no-bpmndi": unwrap(no_bpmndi),
  "no-complex-gateway": unwrap(no_complex_gateway),
  "no-disconnected": unwrap(no_disconnected),
  "no-duplicate-sequence-flows": unwrap(no_duplicate_sequence_flows),
  "no-gateway-join-fork": unwrap(no_gateway_join_fork),
  "no-implicit-split": unwrap(no_implicit_split),
  "no-implicit-end": unwrap(no_implicit_end),
  "no-implicit-start": unwrap(no_implicit_start),
  "no-inclusive-gateway": unwrap(no_inclusive_gateway),
  "no-overlapping-elements": unwrap(no_overlapping_elements),
  "single-blank-start-event": unwrap(single_blank_start_event),
  "single-event-definition": unwrap(single_event_definition),
  "start-event-required": unwrap(start_event_required),
  "sub-process-blank-start-event": unwrap(sub_process_blank_start_event),
  "superfluous-gateway": unwrap(superfluous_gateway),
  "superfluous-label": unwrap(superfluous_label),
  "superfluous-termination": unwrap(superfluous_termination),
};

const recommended =
  recommended_module?.rules != null
    ? recommended_module
    : (recommended_module?.default ?? { rules: {} });

/**
 * Rule name → severity ("error" | "warn" | "off"), as published by
 * `bpmnlint:recommended`.
 *
 * Kept as its own export so a deployment can tighten or relax a single rule
 * without touching the editor wiring, and so a test can assert that every
 * enabled rule actually has a factory behind it.
 */
export const LINT_RULES = { ...(recommended.rules ?? {}) };

/** The rules this build can resolve, by name. */
export const LINT_RULE_NAMES = Object.keys(RULE_FACTORIES);

const resolver_cache = {};
for (const [name, factory] of Object.entries(RULE_FACTORIES)) {
  // `StaticResolver` looks rules up as `rule:{package}/{name}`.
  resolver_cache[`rule:bpmnlint/${name}`] = factory;
}

/**
 * The value for bpmn-js' `linting.bpmnlint` option.
 *
 * A config that names a rule without a factory would make `linter.lint()`
 * reject, and `bpmn-js-bpmnlint` does not catch that — the overlays would
 * simply never appear. Filtering here keeps the two in sync by construction.
 */
export const bpmnlint_config = {
  config: {
    rules: Object.fromEntries(
      Object.entries(LINT_RULES).filter(([name]) => name in RULE_FACTORIES),
    ),
  },
  resolver: new StaticResolver(resolver_cache),
};
