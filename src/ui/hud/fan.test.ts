import { describe, expect, it } from "vitest";
import { boxTransform, dockRadius, dockRect, dockTransform, dockWeight, FAN_CARD_H, FAN_CARD_W, fanLayout, fanWidth, HOVER_LIFT, hoverScale, showBox } from "./fan";

describe("hand fan size", () => {
  it("rests at 225×315 and hovers at 1.28× (about 288×403)", () => {
    expect([FAN_CARD_W, FAN_CARD_H]).toEqual([225, 315]);
    expect(FAN_CARD_W * hoverScale(1080)).toBeCloseTo(288);
    expect(FAN_CARD_H * hoverScale(1080)).toBeCloseTo(403.2);
  });
  it("the hovered card fits an 800 px tall window at the full zoom, and a short one as tall as it can", () => {
    expect(hoverScale(800)).toBe(1.28);
    expect(hoverScale(300) * FAN_CARD_H).toBeCloseTo(300 - 28);
  });
});

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
    expect(hoverScale(380) * FAN_CARD_H).toBeCloseTo(380 - 28);
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
    expect(r.x1 - r.x0).toBeCloseTo(288);
    expect(r.y1 - r.y0).toBeCloseTo(403.2);
    expect((r.x0 + r.x1) / 2).toBe(632);
  });
});

describe("flight keyframes", () => {
  it("boxTransform maps the card's untransformed box onto a screen box (identity for its own box)", () => {
    // untransformed card at slot x 200 in a fan starting at 432, window 900 tall: box 519.5..744.5 x 758..1073
    expect(boxTransform({ x: 519.5, y: 758, w: 225, h: 315 }, 200, 432, 900)).toBe("translate(0px, 0px) scale(1)");
    expect(boxTransform({ x: 20, y: 300, w: 45, h: 63 }, 200, 432, 900)).toBe("translate(-589.5px, -710px) scale(0.2)");
  });
  it("showBox sits above the hand at about the hover size, inside the window", () => {
    const b = showBox(1600, 900);
    expect(b.h).toBeCloseTo(403.2);
    expect(b.y).toBeGreaterThanOrEqual(60);
    expect(b.y + b.h).toBeLessThan(900);
  });
});
