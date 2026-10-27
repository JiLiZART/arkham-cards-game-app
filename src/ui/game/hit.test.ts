import { describe, expect, it } from "vitest";
import { hitRect } from "./hit";

describe("hitRect", () => {
  const rects = [
    { id: "a", x0: 0, y0: 0, x1: 100, y1: 100 },
    { id: "b", x0: 80, y0: 80, x1: 200, y1: 200 },
  ];
  it("finds the rect under the point, edges included", () => {
    expect(hitRect(10, 10, rects)).toBe("a");
    expect(hitRect(150, 200, rects)).toBe("b");
    expect(hitRect(100, 0, rects)).toBe("a");
  });
  it("prefers the later rect where they overlap and misses empty space", () => {
    expect(hitRect(90, 90, rects)).toBe("b");
    expect(hitRect(300, 10, rects)).toBeNull();
    expect(hitRect(10, 10, [])).toBeNull();
  });
});
