import { describe, expect, it } from "vitest";
import { centreOn, placeHover } from "./hover";

describe("hover placement", () => {
  const vw = 1600;
  const vh = 900;
  it("twice the size, centred on the card", () => {
    const b = placeHover({ x0: 700, y0: 300, x1: 800, y1: 440 }, 150, vw, vh);
    expect([b.w, b.h]).toEqual([200, 280]);
    expect(b.x + b.w / 2).toBe(750);
    expect(b.y + b.h / 2).toBe(370);
  });
  it("a card at the right edge shifts left to stay on screen", () => {
    const b = placeHover({ x0: 1500, y0: 300, x1: 1600, y1: 440 }, 150, vw, vh);
    expect(b.x + b.w).toBe(vw - 8);
    expect(b.w).toBe(200);
  });
  it("a card at the bottom moves up so its details fit", () => {
    const b = placeHover({ x0: 700, y0: 760, x1: 800, y1: 900 }, 150, vw, vh);
    expect(b.y + b.h + 150).toBe(vh - 8);
  });
  it("a card too tall for the window is scaled down to fit with its details", () => {
    const b = placeHover({ x0: 600, y0: 100, x1: 900, y1: 520 }, 150, vw, vh);
    expect(b.h + 150).toBeLessThanOrEqual(vh - 16 + 1e-9);
    expect(b.w / b.h).toBeCloseTo(300 / 420);
  });
});

describe("centring the strip card's buttons on its copy", () => {
  const vw = 1600;
  const vh = 900;
  const copy = { x: 1200, y: 300, w: 184, h: 258 };
  it("their centre is the copy's centre", () => {
    const p = centreOn(copy, 120, 90, vw, vh);
    expect(p.x + 60).toBe(1292);
    expect(p.y + 45).toBe(429);
  });
  it("wider than the copy: still centred, and kept inside the window", () => {
    const p = centreOn({ x: 1500, y: 300, w: 92, h: 129 }, 160, 90, vw, vh);
    expect(p.x + 160).toBeLessThanOrEqual(vw - 8);
    expect(p.x).toBeGreaterThanOrEqual(8);
  });
  it("clamped at the bottom", () => {
    const p = centreOn({ x: 1200, y: 800, w: 184, h: 258 }, 120, 90, vw, vh);
    expect(p.y + 90).toBeLessThanOrEqual(vh - 8);
  });
  it("clamped at the top", () => {
    const p = centreOn({ x: 1200, y: -100, w: 184, h: 100 }, 120, 90, vw, vh);
    expect(p.y).toBeGreaterThanOrEqual(8);
  });
});
