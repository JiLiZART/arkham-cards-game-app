import { describe, expect, it } from "vitest";
import { CLOSE_DISTANCE, dragOffset, closesOnDrag, closesOnKey } from "./sheetDrag";

describe("the bottom sheet's drag", () => {
  it("follows a downward drag one to one and never lifts above its resting place", () => {
    expect(dragOffset(0, 40)).toBe(40);
    expect(dragOffset(100, 70)).toBe(0);
    expect(dragOffset(100, 100)).toBe(0);
  });

  it("closes on a drop of more than 60 px", () => {
    expect(CLOSE_DISTANCE).toBe(60);
    expect(closesOnDrag(61)).toBe(true);
    expect(closesOnDrag(60)).toBe(false);
    expect(closesOnDrag(0)).toBe(false);
  });

  it("closes on Escape only", () => {
    expect(closesOnKey("Escape")).toBe(true);
    expect(closesOnKey("Enter")).toBe(false);
  });
});
