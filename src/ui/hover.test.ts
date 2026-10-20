import { describe, expect, it } from "vitest";
import { placeHover } from "./hover";

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
  it("with a limit on the right (the strip's buttons) the copy ends before it", () => {
    const b = placeHover({ x0: 1450, y0: 300, x1: 1542, y1: 429 }, 150, vw, vh, 1290);
    expect(b.x + b.w).toBeLessThanOrEqual(1290);
    expect(b.x).toBeGreaterThanOrEqual(8);
    expect(b.w).toBe(184);
  });
  it("a limit too near the left edge scales the copy down to fit before it", () => {
    const b = placeHover({ x0: 1450, y0: 300, x1: 1542, y1: 429 }, 150, vw, vh, 150);
    expect(b.x + b.w).toBeLessThanOrEqual(150);
    expect(b.x).toBeGreaterThanOrEqual(8);
  });
});
