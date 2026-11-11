import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

/**
 * How long a load may take before the spinner gains an explanation.
 *
 * A chunk that never arrives (offline, or a stale hashed chunk after a
 * redeploy) would otherwise spin forever without telling the user anything.
 */
const SLOW_AFTER_MS = 10_000;

/**
 * A loading indicator for anything that suspends, or awaits data.
 *
 * `page` fills the content area of a route whose page shell has not been
 * loaded yet — without it, the block is sized for inline use (a table cell or
 * a side panel).
 *
 * `detail` is a quieter second line for context the label cannot carry, such
 * as "this page downloads the modeler once".
 */
export const Loading = ({
  label,
  detail,
  page = false,
  show_slow_hint = true,
}) => {
  const [t] = useTranslation(),
    [slow, set_slow] = useState(false);

  useEffect(() => {
    if (!show_slow_hint) return;
    const timer = setTimeout(() => set_slow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [show_slow_hint]);

  return (
    <div
      class={page ? "loading-block page" : "loading-block"}
      role="status"
      aria-live="polite"
    >
      <span class="loading-spinner" aria-hidden="true" />
      <p class="loading-label">{label ?? t("common.loading")}</p>
      {detail && <p class="loading-detail">{detail}</p>}
      {slow && <p class="loading-hint">{t("common.loading-slow")}</p>}
    </div>
  );
};
