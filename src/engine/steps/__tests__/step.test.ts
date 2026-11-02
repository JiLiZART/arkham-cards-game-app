import { describe, expect, it } from "vitest";
import { STEP_HANDLERS } from "../dispatch";
import { STEP } from "../step";

describe("the step kinds", () => {
  it("name each kind by itself", () => {
    for (const [key, value] of Object.entries(STEP)) expect(key).toBe(value);
  });

  it("each have a handler, and each handler a kind", () => {
    expect(Object.keys(STEP_HANDLERS).sort()).toEqual(Object.values(STEP).sort());
  });
});
