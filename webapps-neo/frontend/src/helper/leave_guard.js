/**
 * A single "may I leave this page?" slot for components that own unsaved
 * state.
 *
 * The router (`preact-iso`) has no navigation hook: links are handled by a
 * listener on `window`, and in-app jumps call `route()` directly. A page that
 * wants a say therefore registers a guard here, and the three navigation paths
 * the app has — `route()`, a click on a link, the browser's back/forward —
 * consult it before they act.
 *
 * One slot, not a stack: only the page on screen can veto, and a component
 * that registers while another one is mounted would be a bug rather than a
 * feature.
 */
let guard = null;

/** The question the guard is waiting on, when it answers asynchronously. */
let pending = null;

/** Set by `allow_next_leave()`: the next check skips the guard once. */
let bypass = false;

/**
 * Register `fn`, which returns `true` to allow leaving and `false` to stay.
 * Returning a promise means "ask first": navigation is held until it settles,
 * and leaving happens only if it resolves to anything but `false`. That is how
 * a page can put a real dialog in front of the router — `window.confirm` was
 * synchronous, a component is not.
 *
 * Returns the release function; it only clears the slot if this guard is still
 * the registered one, so a late cleanup cannot drop a newer guard.
 */
export const set_leave_guard = (fn) => {
  guard = fn;
  pending = null;
  bypass = false;
  return () => {
    if (guard !== fn) return;
    guard = null;
    // Nobody is left to answer an open question: settle the navigation that
    // is waiting on it as "stay" instead of leaving its caller hanging.
    pending?.resolve(false);
    pending = null;
    bypass = false;
  };
};

/** Whether a page currently wants to be asked before it is left. */
export const has_leave_guard = () => guard !== null;

/**
 * Ask the registered guard.
 *
 * Returns `{ allow: true }` or `{ allow: false }` when the guard answered on
 * the spot, and `{ started, pending }` when the user has to be asked: `pending`
 * resolves to whether leaving is allowed. Only the caller that started the
 * question should wait on it (`started` is false for a second navigation that
 * arrives while a question is already open — that one is simply dropped rather
 * than queued behind an answer that may no longer be about it).
 *
 * A missing guard means "no opinion, go ahead"; a guard that throws must not
 * trap the user in the page either.
 */
export const request_leave = () => {
  if (bypass) {
    bypass = false;
    return { allow: true };
  }
  if (!guard) return { allow: true };
  if (pending) return { allow: false, started: false, pending: pending.promise };

  let answer;
  try {
    answer = guard();
  } catch {
    return { allow: true };
  }

  if (!answer || typeof answer.then !== "function") {
    return { allow: answer !== false };
  }

  const entry = { promise: null, resolve: null };
  entry.promise = new Promise((resolve) => (entry.resolve = resolve));
  pending = entry;
  answer.then(
    (allowed) => {
      if (pending === entry) pending = null;
      entry.resolve(allowed !== false);
    },
    () => {
      // A guard that fails to ask must not capture the user, but it must not
      // claim a "yes" either: stay put and let them try again.
      if (pending === entry) pending = null;
      entry.resolve(false);
    },
  );
  return { allow: false, started: true, pending: entry.promise };
};

/**
 * Let the next check through without asking. Used by the back/forward path,
 * where the browser replays a traversal after the user has already answered:
 * that replay must not raise the same question again.
 */
export const allow_next_leave = () => {
  bypass = true;
};

/** Test/teardown helper: forget the guard without going through its owner. */
export const clear_leave_guard = () => {
  guard = null;
  pending?.resolve(false);
  pending = null;
  bypass = false;
};
