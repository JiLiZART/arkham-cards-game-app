import { describe, expect, it } from "vitest";
import { CARD_RATIO, resolveBox, showcaseLayout } from "./showcaseLayout";

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

describe("showcaseLayout on the phone", () => {
  const phone = (n: number) => showcaseLayout(n, 852, 393, true);

  it("one or two cards stand at least 85 % of the screen's height, to be read", () => {
    for (const n of [1, 2]) expect(phone(n).width * CARD_RATIO).toBeGreaterThanOrEqual(393 * 0.85);
  });

  it("leaves the help line its column beside the cards, and every card fits", () => {
    for (const n of [1, 2, 3, 4, 6]) {
      const l = phone(n);
      const rows = Math.ceil(n / l.cols);
      expect(l.cols * (l.width + 18), `${n} wide`).toBeLessThanOrEqual(852 - 240);
      expect(rows * l.width * CARD_RATIO + (rows - 1) * 18, `${n} tall`).toBeLessThanOrEqual(
        393 - 24,
      );
    }
  });
});

describe("resolveBox", () => {
  it("on the desktop the resolving card stands 260 px wide under the prompt banner", () => {
    expect(resolveBox(1600, 900, false)).toEqual({ x: 670, y: 120, w: 260, h: 364 });
  });

  it("on the phone it fits between the top bar and the instruction bar", () => {
    const b = resolveBox(852, 393, true);
    expect(b.y).toBeGreaterThanOrEqual(36);
    expect(b.y + b.h).toBeLessThanOrEqual(393 - 120);
    expect(b.h / b.w).toBeCloseTo(CARD_RATIO, 1);
    expect(b.x + b.w / 2).toBeCloseTo(852 / 2, 0);
  });
});
