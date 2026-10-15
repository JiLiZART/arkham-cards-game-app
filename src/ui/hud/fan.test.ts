import { describe, expect, it } from "vitest";
import { dockRadius, dockRect, dockTransform, dockWeight, FAN_CARD_W, fanLayout, fanWidth, HOVER_LIFT, hoverScale } from "./fan";

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

  it("hover is 1.28× where the window is tall enough, otherwise as tall as fits", () => {
    expect(hoverScale(1080)).toBe(1.28);
    expect(hoverScale(500) * 420).toBeCloseTo(500 - 28);
  });

  it("a single card sits in the middle, unrotated", () => {
    expect(fanLayout(1, 600)).toEqual([{ x: 300, y: 0, rotate: 0 }]);
  });
});

describe("dock magnification", () => {
  const R = dockRadius(114);
  it("is 1 on the card centre, 0 at and beyond the radius", () => {
    expect(dockWeight(500, 500, R)).toBe(1);
    expect(dockWeight(500, 500 + R, R)).toBeCloseTo(0);
    expect(dockWeight(500, 500 - R - 40, R)).toBe(0);
  });
  it("falls off symmetrically and monotonically", () => {
    let prev = 1;
    for (let d = 10; d < R; d += 10) {
      const w = dockWeight(500, 500 + d, R);
      expect(w).toBeCloseTo(dockWeight(500, 500 - d, R));
      expect(w).toBeLessThan(prev);
      prev = w;
    }
  });
  it("neighbours are raised a little: about half for the next card, almost nothing two cards away", () => {
    expect(dockWeight(0, 114, R)).toBeGreaterThan(0.4);
    expect(dockWeight(0, 114, R)).toBeLessThan(0.7);
    expect(dockWeight(0, 228, R)).toBeLessThan(0.1);
  });
  it("full weight is unrotated, lifted and scaled to the hover zoom; zero weight is the resting arc", () => {
    const slot = { x: 0, y: 10, rotate: 6 };
    expect(dockTransform(slot, 1, hoverScale(1080))).toBe(`translateY(${HOVER_LIFT}px) rotate(0deg) scale(1.28)`);
    expect(dockTransform(slot, 0, 1.28, 36)).toBe("translateY(-26px) rotate(6deg) scale(1)");
  });
});

describe("dockRect", () => {
  it("at full weight the card is k× its size with its bottom 12 px above the screen edge", () => {
    const r = dockRect({ x: 200, y: 10, rotate: 5 }, 1, 1.28, 36, 432, 900);
    expect(r.y1).toBeCloseTo(888);
    expect(r.x1 - r.x0).toBeCloseTo(384);
    expect(r.y1 - r.y0).toBeCloseTo(537.6);
    expect((r.x0 + r.x1) / 2).toBe(632);
  });
});
