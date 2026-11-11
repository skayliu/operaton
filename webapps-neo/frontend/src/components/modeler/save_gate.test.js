import { describe, expect, it } from "vitest";
import { create_gate } from "./save_gate.js";

const settled = (promise, ms = 50) =>
  Promise.race([
    promise.then(() => "settled"),
    new Promise((resolve) => setTimeout(() => resolve("pending"), ms)),
  ]);

describe("create_gate", () => {
  it("holds a waiter until it is released", async () => {
    const gate = create_gate();

    expect(await settled(gate.promise)).toBe("pending");

    gate.release();
    expect(await settled(gate.promise)).toBe("settled");
    expect(gate.state).toBe("open");
  });

  it("releases a failed import without claiming it succeeded", async () => {
    const gate = create_gate();

    gate.fail();

    expect(await settled(gate.promise)).toBe("settled");
    expect(gate.state).toBe("failed");
  });

  it("settles once, so a later release cannot rewrite the outcome", () => {
    const gate = create_gate();

    gate.fail();
    gate.release();

    expect(gate.state).toBe("failed");
  });
});
