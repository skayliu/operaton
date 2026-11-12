import { useTranslation } from "react-i18next";
import { KIND_NAMES } from "../components/modeler/modeler_helpers.js";
import { app_path } from "../config.js";
import "../components/modeler/modeler.css";

/**
 * The "what do you want to model?" screen, shown when the route carries no
 * `:kind`.
 *
 * It lives in its own module on purpose: `Modeler.jsx` imports the BPMN editor
 * (and with it bpmn-js, the properties panel and bpmnlint), and a picker that
 * shipped with those imports would make opening `/modeler` cost the whole
 * editor bundle before a single card is on screen.
 */
export const ModelerPicker = () => {
  const [t] = useTranslation();

  return (
    <main id="content" class="modeler-page">
      <div class="modeler-picker">
        <h1>{t("modeler.title")}</h1>
        <p class="modeler-picker-lead">{t("modeler.pick.lead")}</p>
        <ul class="modeler-picker-grid">
          <li>
            <a class="modeler-pick" href={app_path("/modeler/bpmn")}>
              <span class="modeler-pick-kind">{KIND_NAMES.bpmn}</span>
              <span class="modeler-pick-title">
                {t("modeler.pick.bpmn-title")}
              </span>
              <span class="modeler-pick-text">
                {t("modeler.pick.bpmn-text")}
              </span>
            </a>
          </li>
          <li>
            {/* A placeholder rather than a link: the DMN editor does not exist
                yet, and a card that leads to an error page reads as a bug. */}
            <span class="modeler-pick is-pending" aria-disabled="true">
              <span class="modeler-pick-kind">{KIND_NAMES.dmn}</span>
              <span class="modeler-pick-title">
                {t("modeler.pick.dmn-title")}
              </span>
              <span class="modeler-pick-text">{t("modeler.pick.dmn-text")}</span>
              <span class="modeler-pick-badge">{t("modeler.pick.soon")}</span>
            </span>
          </li>
        </ul>
      </div>
    </main>
  );
};
