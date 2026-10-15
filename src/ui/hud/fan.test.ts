import { describe, expect, it } from "vitest";
import { FAN_CARD_W, fanLayout, fanWidth, hoverScale } from "./fan";

describe("hand fan", () => {
  it("is symmetric around the centre", () => {
    const f = fanLayout(5, 800);
    expect(f[2]).toEqual({ x: 400, y: 0, rotate: 0 });
    expect(f[0].x - 400).toBeCloseTo(-(f[4].x - 400));
    expect(f[0].rotate).toBeCloseTo(-f[4].rotate);
    expect(f[0].y).toBeCloseTo(f[4].y);
    expect(f[0].rotate).toBeLessThan(0);
  });

  it("tightens the overlap as the hand grows", () => {
    const step = (n: number) => fanLayout(n, 700)[1].x - fanLayout(n, 700)[0].x;
    expect(step(4)).toBeGreaterThan(step(8));
    expect(step(8)).toBeGreaterThan(step(12));
    expect(Math.abs(fanLayout(12, 700)[0].rotate)).toBeLessThanOrEqual(18);
  });

  it("keeps at least 32 px of each of 12 cards visible at a 1280 px viewport", () => {
    const f = fanLayout(12, fanWidth(1280));
    for (let i = 1; i < f.length; i++) expect(f[i].x - f[i - 1].x).toBeGreaterThanOrEqual(32);
    expect(f[0].x - FAN_CARD_W / 2).toBeGreaterThanOrEqual(0);
    expect(f[11].x + FAN_CARD_W / 2).toBeLessThanOrEqual(fanWidth(1280) + 0.001);
  });

  it("hover is 1.6× where the window is tall enough, otherwise as tall as fits", () => {
    expect(hoverScale(1080)).toBe(1.6);
    expect(hoverScale(600) * 420).toBe(600 - 28);
  });

  it("a single card sits in the middle, unrotated", () => {
    expect(fanLayout(1, 600)).toEqual([{ x: 300, y: 0, rotate: 0 }]);
  });
});
