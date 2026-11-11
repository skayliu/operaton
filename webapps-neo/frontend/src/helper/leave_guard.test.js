import { describe, it, expect, afterEach, vi } from "vitest";
import {
  allow_next_leave,
  clear_leave_guard,
  has_leave_guard,
  request_leave,
  set_leave_guard,
} from "./leave_guard.js";

// The modeler asks its "leave without saving?" question with a dialog, so its
// guard answers with a promise. Everything below is about that contract: the
// router must hold the navigation until the dialog settles, and must never be
// left waiting if the page goes away first.
afterEach(() => clear_leave_guard());

describe("request_leave", () => {
  it("allows leaving when no page registered a guard", () => {
    expect(request_leave()).toEqual({ allow: true });
  });

  it("takes a synchronous answer as it is", () => {
    set_leave_guard(() => false);
    expect(request_leave()).toEqual({ allow: false });
  });

  it("treats a non-boolean synchronous answer as allow", () => {
    set_leave_guard(() => undefined);
    expect(request_leave()).toEqual({ allow: true });
  });

  it("holds the navigation until an asynchronous guard answers", async () => {
    let answer;
    set_leave_guard(() => new Promise((resolve) => (answer = resolve)));

    const decision = request_leave();
    expect(decision).toMatchObject({ allow: false, started: true });

    answer(true);
    await expect(decision.pending).resolves.toBe(true);
  });

  it("stays put when the answer is 'no'", async () => {
    set_leave_guard(() => Promise.resolve(false));
    const decision = request_leave();
    await expect(decision.pending).resolves.toBe(false);
  });

  it("stays put when the guard fails to ask", async () => {
    set_leave_guard(() => Promise.reject(new Error("dialog unavailable")));
    const decision = request_leave();
    await expect(decision.pending).resolves.toBe(false);
  });

  it("drops a second navigation while a question is already open", () => {
    set_leave_guard(() => new Promise(() => {}));
    expect(request_leave()).toMatchObject({ allow: false, started: true });
    // `started: false` tells the caller it must not act on this one.
    expect(request_leave()).toMatchObject({ allow: false, started: false });
  });

  it("lets the next check through without asking", () => {
    const guard = vi.fn(() => true);
    set_leave_guard(guard);

    allow_next_leave();
    expect(request_leave()).toEqual({ allow: true });
    expect(guard).not.toHaveBeenCalled();

    // The bypass is one-shot.
    expect(request_leave()).toEqual({ allow: true });
    expect(guard).toHaveBeenCalledTimes(1);
  });

  it("settles an open question as 'stay' when the guard is released", async () => {
    let answer;
    const release = set_leave_guard(
      () => new Promise((resolve) => (answer = resolve)),
    );

    const decision = request_leave();
    release();

    await expect(decision.pending).resolves.toBe(false);
    expect(has_leave_guard()).toBe(false);
    // A late click in the unmounted dialog must not resurrect the navigation.
    answer(true);
    await expect(decision.pending).resolves.toBe(false);
  });
});
