import { Component } from "preact";
import { useTranslation } from "react-i18next";

/**
 * Shown when a page fails to load, instead of a permanently blank content
 * area.
 *
 * The usual cause is a lazily imported chunk that cannot be fetched: after a
 * redeploy the old hashed file name is gone, and a dropped connection fails the
 * request outright. A reload is the fix in both cases, so the page offers one
 * rather than expecting the user to guess.
 */
const LoadFailed = ({ error }) => {
  const [t] = useTranslation(),
    message = error?.message ?? String(error ?? "");

  return (
    <main id="content" class="p-3">
      <h1>{t("common.load-failed.title")}</h1>
      <p>{t("common.load-failed.text")}</p>
      {message && (
        <p class="info-box">
          <code>{message}</code>
        </p>
      )}
      <button type="button" onClick={() => window.location.reload()}>
        {t("common.load-failed.reload")}
      </button>
    </main>
  );
};

/**
 * Catches render errors below it — including a rejected lazy import — and
 * replaces that subtree with a message.
 *
 * Without a boundary a rejected import unmounts the whole application, which
 * looks exactly like a page that renders nothing at all.
 */
export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("[route] failed to render", error);
  }

  render() {
    return this.state.error ? (
      <LoadFailed error={this.state.error} />
    ) : (
      this.props.children
    );
  }
}
