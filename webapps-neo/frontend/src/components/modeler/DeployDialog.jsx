import { useSignal, useSignalEffect, untracked } from "@preact/signals";
import { useContext } from "preact/hooks";
import { useTranslation } from "react-i18next";
import engine_rest, { RESPONSE_STATE } from "../../api/engine_rest.jsx";
import { AppState } from "../../state.js";
import { Dialog } from "../Dialog.jsx";
import { deployment_name_for, error_message } from "./modeler_helpers.js";

/**
 * Deploys the document currently open in the modeler.
 *
 * `build_files` returns `[{ name, data }]` where `data` is a string or a Blob;
 * it is awaited per submit so the tool bar does not have to export on every
 * keystroke. The list shape is already what P1 needs for deploying a BPMN
 * together with the DMN / form it references.
 *
 * A failed deployment stays in this dialog: a 403 (missing Deployment CREATE
 * permission) belongs next to the retry button, not on the page behind it.
 */
export const DeployDialog = ({ open, build_files, default_name, on_deployed }) => {
  const state = useContext(AppState),
    [t] = useTranslation(),
    name = useSignal(""),
    tenant = useSignal(""),
    dedup = useSignal(true),
    changed_only = useSignal(true),
    busy = useSignal(false),
    error = useSignal(null),
    files = useSignal([]);

  // Seed the name and the file list when the dialog opens, so the user sees
  // what is about to be uploaded before pressing deploy.
  const prepare = async () => {
    error.value = null;
    files.value = (await build_files()).map((file) => ({
      name: file.name,
      data: file.data,
    }));
    if (!name.value) {
      name.value = default_name || deployment_name_for(files.value[0]?.name);
    }
  };

  const submit = async () => {
    if (busy.value) return;
    busy.value = true;
    error.value = null;

    try {
      // Read the document again on submit rather than trusting the list prepared
      // when the dialog opened: the user may have edited after opening it, and a
      // fast click can beat the async `prepare` entirely.
      const pending = (await build_files()).map((file) => ({
        name: file.name,
        data: file.data,
      }));
      files.value = pending;

      if (!pending.length || pending.some((file) => !file.data)) {
        error.value = t("modeler.deploy.empty");
        return;
      }

      const fd = new FormData();
      fd.append(
        "deployment-name",
        name.value.trim() || deployment_name_for(pending[0]?.name),
      );
      fd.append("enable-duplicate-filtering", String(dedup.value));
      if (dedup.value) fd.append("deploy-changed-only", String(changed_only.value));
      if (tenant.value.trim()) fd.append("tenant-id", tenant.value.trim());

      for (const file of pending) {
        const blob =
          file.data instanceof Blob
            ? file.data
            : new Blob([file.data], { type: "application/xml" });
        fd.append(file.name, blob, file.name);
      }

      // Use the request's own result rather than reading the shared signal:
      // the deployment list page may be refreshing the same signal and the
      // value read there could belong to that call.
      const result = await engine_rest.deployment.create(state, fd);

      if (result?.status !== RESPONSE_STATE.SUCCESS) {
        error.value = deployment_error(result, t);
        return;
      }

      // The deployment list is the page the user lands on next; refresh it now
      // so it is not stale.
      void engine_rest.deployment.all(state);
      on_deployed?.(result.data);
      open.value = false;
    } catch (caught) {
      // POST_FORM already turns HTTP failures into a result; this covers the
      // unexpected: export throwing, FormData rejecting, a bug in the modal.
      error.value = error_message(caught, t("modeler.deploy.failed"));
    } finally {
      // Whatever happened, the button must not stay disabled forever.
      busy.value = false;
    }
  };

  return (
    <Dialog open={open} title={t("modeler.deploy.title")}>
      <DeployBody
        open={open}
        prepare={prepare}
        name={name}
        tenant={tenant}
        dedup={dedup}
        changed_only={changed_only}
        files={files}
        busy={busy}
        error={error}
        submit={submit}
      />
    </Dialog>
  );
};

/**
 * A failure message that names the HTTP status when the engine sent one: a 403
 * (missing Deployment CREATE permission) and a 500 (the diagram is invalid)
 * need completely different reactions from the user.
 */
const deployment_error = (result, t) => {
  const error = result?.error;
  const detail = error_message(error, "");
  const status = Number(error?.status);
  if (status && detail)
    return t("modeler.deploy.failed-status", { status, message: detail });
  return detail || t("modeler.deploy.failed");
};

/**
 * The dialog's fields. Split out so `useSignalEffect` runs only while the
 * dialog is mounted with a prepared file list.
 */
const DeployBody = ({
  open,
  prepare,
  name,
  tenant,
  dedup,
  changed_only,
  files,
  busy,
  error,
  submit,
}) => {
  const [t] = useTranslation();

  // `prepare` is async; run it whenever the dialog transitions to open. Doing
  // this in an effect on the signal keeps the exported XML current even when
  // the user edited after opening the dialog once before.
  //
  // `untracked` is not optional: `prepare` writes `files` and `name`, and
  // tracking those writes would re-enter this effect on every pass — an
  // endless export/rebuild loop that leaves the Deploy button looking dead.
  useSignalEffect(() => {
    if (!open.value) return;
    untracked(() => void prepare());
  });

  return (
    <div class="dialog-fields">
      <p class="info-box">{t("modeler.deploy.hint")}</p>

      <label>
        {t("modeler.deploy.name")}
        <input
          type="text"
          value={name.value}
          onInput={(e) => (name.value = e.currentTarget.value)}
        />
      </label>

      <label>
        {t("modeler.deploy.tenant")}
        <input
          type="text"
          value={tenant.value}
          placeholder={t("modeler.deploy.tenant-placeholder")}
          onInput={(e) => (tenant.value = e.currentTarget.value)}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={dedup.value}
          onChange={(e) => (dedup.value = e.currentTarget.checked)}
        />
        {t("modeler.deploy.duplicate-filtering")}
      </label>

      {dedup.value && (
        <label>
          <input
            type="checkbox"
            checked={changed_only.value}
            onChange={(e) => (changed_only.value = e.currentTarget.checked)}
          />
          {t("modeler.deploy.deploy-changed-only")}
        </label>
      )}

      <div>
        <strong>{t("modeler.deploy.files")}</strong>
        <ul class="modeler-deploy-files">
          {files.value.map((file) => (
            <li key={file.name}>
              <code>{file.name}</code>
            </li>
          ))}
        </ul>
      </div>

      {error.value && (
        <p class="error" role="alert">
          {error.value}
        </p>
      )}

      <div class="button-group">
        <button type="button" onClick={() => (open.value = false)}>
          {t("common.cancel")}
        </button>
        <button type="button" class="primary" disabled={busy.value} onClick={submit}>
          {busy.value ? t("modeler.deploy.deploying") : t("modeler.deploy.submit")}
        </button>
      </div>
    </div>
  );
};
