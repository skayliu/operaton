import { useContext, useEffect } from "preact/hooks";
import { useTranslation } from "react-i18next";
import engine_rest, { RESPONSE_STATE } from "../api/engine_rest.jsx";
import { AppState } from "../state.js";
import {
  KIND_NAMES,
  definition_label,
  definition_meta,
} from "../components/modeler/modeler_helpers.js";
import { app_path } from "../config.js";
import "../components/modeler/modeler.css";

/**
 * The screen shown when the route carries no `:kind`.
 *
 * Two lists rather than the two large cards this used to draw: "start a new
 * model" and "open a deployed one". The second is what makes versioning
 * reachable — picking a deployed process definition opens its XML in the
 * editor, and deploying that document creates the next version of it.
 *
 * It lives in its own module on purpose: `Modeler.jsx` imports the BPMN editor
 * (and with it bpmn-js, the properties panel and bpmnlint), and a picker that
 * shipped with those imports would make opening `/modeler` cost the whole
 * editor bundle before a single row is on screen.
 */
export const ModelerPicker = () => {
  const [t] = useTranslation(),
    state = useContext(AppState),
    // The request lives in the app state tree, so a second visit reuses the
    // slot instead of issuing a second query, and a cockpit page that cleared
    // it shows up here as "loading" again.
    request = state?.api?.process?.definition?.definitions ?? null;

  useEffect(() => {
    if (!state) return;
    void engine_rest.process_definition.latest(state);
  }, [state]);

  // The slot is a signal; the response lives on its value. Reading the data
  // straight off the signal yields undefined, which left the deployed list
  // permanently empty even after a successful request.
  const response = request?.value ?? null,
    definitions = response?.data ?? [],
    loading = response?.status === RESPONSE_STATE.LOADING,
    failed = response?.status === RESPONSE_STATE.ERROR,
    settled = response?.status === RESPONSE_STATE.SUCCESS;

  return (
    <main id="content" class="modeler-page">
      <div class="modeler-picker">
        <h1>{t("modeler.title")}</h1>
        <p class="modeler-picker-lead">{t("modeler.pick.lead")}</p>

        <h2 class="modeler-picker-heading">{t("modeler.pick.new")}</h2>
        <ul class="modeler-list">
          <li>
            <a class="modeler-row" href={app_path("/modeler/bpmn")}>
              <span class="modeler-row-kind">{KIND_NAMES.bpmn}</span>
              <span class="modeler-row-body">
                <span class="modeler-row-title">
                  {t("modeler.pick.bpmn-title")}
                </span>
                <span class="modeler-row-text">{t("modeler.pick.bpmn-text")}</span>
              </span>
            </a>
          </li>
        </ul>

        <h2 class="modeler-picker-heading">{t("modeler.deployed.title")}</h2>
        <p class="modeler-picker-lead">{t("modeler.deployed.lead")}</p>

        {failed && (
          <p class="error" role="alert">
            {t("modeler.deployed.failed")}
          </p>
        )}

        {!failed && settled && definitions.length === 0 && (
          <p class="info-box">{t("modeler.deployed.empty")}</p>
        )}

        {!failed && definitions.length > 0 && (
          <ul class="modeler-list" aria-busy={loading}>
            {definitions.map((definition) => (
              <li key={definition.id ?? definition.key}>
                <a
                  class="modeler-row"
                  href={app_path("/modeler/bpmn/" + encodeURIComponent(definition.id))}
                >
                  <span class="modeler-row-kind">{t("modeler.deployed.badge")}</span>
                  <span class="modeler-row-body">
                    <span class="modeler-row-title">
                      {definition_label(definition)}
                    </span>
                    <span class="modeler-row-text">
                      {definition_meta(definition)}
                    </span>
                  </span>
                  <span class="modeler-row-action">
                    {t("modeler.deployed.open")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {loading && (
          <p class="modeler-picker-lead">{t("modeler.deployed.loading")}</p>
        )}

        <p class="modeler-storage-note">{t("modeler.storage.note")}</p>
      </div>
    </main>
  );
};
