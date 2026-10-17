import { describe, expect, it } from "vitest";
import { ARC_MS, centreTransform, RISE_MS, riseAndArcFrames, riseDelay, STAGGER_MS } from "./flights";

describe("riseAndArcFrames", () => {
  const own = { x: 500, y: 200, w: 340, h: 476 };
  const pile = { x: 20, y: 600, w: 80, h: 112 };
  const { card, flip, duration } = riseAndArcFrames(own, pile);

  it("starts on the pile, rises one pile-card height face down, then arcs to rest", () => {
    expect(duration).toBe(RISE_MS + ARC_MS);
    expect(card[0]).toMatchObject({ offset: 0, transform: centreTransform(own, pile) });
    expect(card[1]).toMatchObject({ offset: RISE_MS / duration, transform: centreTransform(own, { ...pile, y: pile.y - pile.h }) });
    expect(card.at(-1)).toMatchObject({ offset: 1, transform: "none" });
  });

  it("stays face down through the rise and finishes turning in the arc's first half", () => {
    const riseEnd = RISE_MS / duration;
    expect(flip.filter((f) => (f.offset as number) <= riseEnd).every((f) => f.transform === "rotateY(180deg)")).toBe(true);
    const half = (RISE_MS + ARC_MS / 2) / duration;
    expect(flip.find((f) => f.transform === "rotateY(0deg)")?.offset).toBeCloseTo(half);
    expect(flip.at(-1)).toMatchObject({ offset: 1, transform: "rotateY(0deg)" });
  });

  it("each card leaves 150 ms after the one before", () => {
    expect(STAGGER_MS).toBe(150);
    expect([0, 1, 2].map(riseDelay)).toEqual([0, 150, 300]);
  });
});
