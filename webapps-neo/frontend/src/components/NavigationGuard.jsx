import { LocationProvider, useLocation } from "preact-iso";
import { useEffect, useMemo, useRef } from "preact/hooks";
import {
  allow_next_leave,
  has_leave_guard,
  request_leave,
} from "../helper/leave_guard.js";

/**
 * Re-publishes the router's location with a guarded `route()`.
 *
 * `preact-iso` navigates in two ways: a click listener on `window`, and direct
 * `route()` calls from components (tab bars, hotkeys, list selections). The
 * click path is intercepted below; every in-app `route()` goes through this
 * provider, so one wrapper covers all ~80 call sites without touching them.
 *
 * The guard may need an answer from the user (a dialog rather than a blocking
 * `window.confirm`), so navigation is only started once that answer arrives.
 * `raw_route` is the unwrapped navigator, for the paths that replay a
 * navigation the user has already approved.
 */
export const GuardedLocation = ({ children }) => {
  const location = useLocation();
  const value = useMemo(
    () => ({
      ...location,
      raw_route: location.route,
      route: (url, replace) => {
        const decision = request_leave();
        if (decision.allow) return location.route(url, replace);
        // Nothing to wait for: either the guard said no, or another
        // navigation is already asking and this one is dropped.
        if (!decision.started) return;
        void decision.pending.then(
          (allow) => allow && location.route(url, replace),
        );
      },
    }),
    [location],
  );

  return (
    <LocationProvider.ctx.Provider value={value}>
      {children}
    </LocationProvider.ctx.Provider>
  );
};

/**
 * Blocks navigation away from a page that registered a leave guard.
 *
 * Routes covered:
 *   1. `route()` — see `GuardedLocation` above.
 *   2. Clicking a link. `preact-iso` listens on `window` in the bubble phase,
 *      so a capture-phase listener here runs first and can stop the event
 *      before the router ever sees it.
 *   3. Back / forward, via the Navigation API where the browser has it
 *      (Chromium). `navigate` fires for traversal too, and `preventDefault()`
 *      cancels it. Firefox and Safari lack the API; those users still get (1)
 *      and (2), and the browser's own prompt on tab close or reload.
 */
export const NavigationGuard = () => {
  const { url, raw_route } = useLocation();
  const current_url = useRef(url);
  // The unwrapped navigator, called only after the guard has been answered.
  const route_ref = useRef(raw_route);
  route_ref.current = raw_route;

  useEffect(() => {
    current_url.current = url;
  }, [url]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const on_click = (event) => {
      if (!has_leave_guard() || event.defaultPrevented) return;
      // Modified clicks and middle clicks open a new tab/window: the current
      // document is not going anywhere.
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const path =
          typeof event.composedPath === "function" ? event.composedPath() : [],
        link =
          path.find((node) => node?.nodeName === "A" && node.href) ??
          event.target?.closest?.("a[href]");
      if (!link) return;

      const target = link.href;
      if (!target || link.origin !== window.location.origin) return;
      if (link.hasAttribute?.("download")) return;
      if (link.target && !/^(_?self)?$/i.test(link.target)) return;
      // Same document: an in-page anchor (#content, #top) or a re-click of the
      // current entry. Nothing is left behind.
      if (target === window.location.href) return;
      const next = new URL(target);
      if (
        next.pathname + next.search ===
        window.location.pathname + window.location.search
      ) {
        return;
      }

      const decision = request_leave();
      if (decision.allow) return;
      event.preventDefault();
      event.stopPropagation();
      if (!decision.started) return;
      void decision.pending.then(
        (allow) =>
          allow &&
          route_ref.current?.(next.pathname + next.search + next.hash),
      );
    };

    window.addEventListener("click", on_click, true);
    return () => window.removeEventListener("click", on_click, true);
  }, []);

  useEffect(() => {
    const navigation = globalThis.navigation;
    if (!navigation?.addEventListener) return undefined;

    const on_navigate = (event) => {
      if (!has_leave_guard()) return;
      // Reload stays with `beforeunload`: the browser's own prompt is the only
      // one that also covers closing the tab.
      if (event.navigationType === "reload") return;

      const decision = request_leave();
      if (decision.allow) return;
      event.preventDefault();
      if (!decision.started) return;
      void decision.pending.then((allow) => {
        if (!allow) return;
        // The traversal was cancelled; replay it now that the user agreed.
        // Only `traverseTo` can aim at the entry the user picked, and the
        // replay must not ask the same question again.
        if (
          event.navigationType === "traverse" &&
          typeof navigation.traverseTo === "function"
        ) {
          allow_next_leave();
          navigation.traverseTo(event.destination.key);
        }
      });
    };

    navigation.addEventListener("navigate", on_navigate);
    return () => navigation.removeEventListener("navigate", on_navigate);
  }, []);

  return null;
};
