import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("joins class names with single spaces", () => {
    expect(cx("fan-card", "legal")).toBe("fan-card legal");
  });

  it("leaves out false, null, undefined and empty parts", () => {
    expect(cx("fan-card", false, null, undefined, "", "focused")).toBe("fan-card focused");
  });

  it("is empty when no part is set", () => {
    expect(cx(false, undefined)).toBe("");
  });
});
