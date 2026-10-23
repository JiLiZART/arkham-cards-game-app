import { describe, expect, it } from "vitest";
import { CARD_RATIO, showcaseLayout } from "./showcaseLayout";

const at = (n: number, w = 1920, h = 1080) => showcaseLayout(n, w, h);

describe("showcaseLayout", () => {
  it("up to four cards stand in one row at full width", () => {
    for (const n of [1, 2, 3, 4]) expect(at(n)).toEqual({ cols: n, width: 340 });
  });

  it("five to eight cards go to two rows, a little smaller", () => {
    for (const n of [5, 6, 7, 8]) {
      const l = at(n);
      expect(Math.ceil(n / l.cols)).toBe(2);
      expect(l.width).toBeLessThan(340);
      expect(l.width).toBeGreaterThan(200);
    }
  });

  it("more shrink further, and everything always fits the screen", () => {
    expect(at(10).width).toBeLessThanOrEqual(at(8).width);
    expect(at(20).width).toBeLessThan(at(8).width);
    for (const [w, h] of [
      [1920, 1080],
      [1600, 900],
      [1366, 768],
    ]) {
      for (const n of [1, 2, 4, 6, 10, 20]) {
        const l = showcaseLayout(n, w, h);
        const rows = Math.ceil(n / l.cols);
        expect(l.cols * (l.width + 18), `${n} wide @${w}`).toBeLessThanOrEqual(w - 100);
        expect(
          rows * l.width * CARD_RATIO + (rows - 1) * 18,
          `${n} tall @${h}`,
        ).toBeLessThanOrEqual(h - 200);
      }
    }
  });

  it("a narrow screen caps the width of four cards", () => {
    expect(at(4, 1366, 768).width).toBeLessThan(300);
  });
});
