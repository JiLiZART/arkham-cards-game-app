import { describe, expect, it } from "vitest";
import { isInitiator } from "./mesh";

describe("isInitiator", () => {
  it("is exactly one of the two players, so offers never cross", () => {
    expect(isInitiator("a1", "b2")).toBe(true);
    expect(isInitiator("b2", "a1")).toBe(false);
  });
});
