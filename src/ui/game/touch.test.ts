import { describe, expect, it } from "vitest";
import { LONG_PRESS_MS, longPressFired, SECOND_TAP_MS, tapDecision } from "./touch";

describe("tapDecision", () => {
  const none = { id: null, at: 0 };

  it("a first tap on a card peeks it", () => {
    expect(tapDecision(none, "c1", 1000)).toEqual({ action: "peek", next: { id: "c1", at: 1000 } });
  });

  it("a second tap on the same card within 1.5 s chooses, and forgets the peek", () => {
    const first = tapDecision(none, "c1", 1000);
    expect(tapDecision(first.next, "c1", 1000 + SECOND_TAP_MS - 1)).toEqual({
      action: "choose",
      next: none,
    });
  });

  it("a second tap too late, or on another card, peeks again", () => {
    const first = tapDecision(none, "c1", 1000).next;
    expect(tapDecision(first, "c1", 1000 + SECOND_TAP_MS + 1).action).toBe("peek");
    expect(tapDecision(first, "c2", 1100)).toEqual({
      action: "peek",
      next: { id: "c2", at: 1100 },
    });
  });

  it("the timings are the spec's", () => {
    expect(SECOND_TAP_MS).toBe(1500);
    expect(LONG_PRESS_MS).toBe(450);
  });
});

describe("longPressFired", () => {
  it("a finger held still for 450 ms is a long press; moving away or lifting early is not", () => {
    const down = { x: 100, y: 100, at: 0 };
    expect(longPressFired(down, { x: 102, y: 101 }, LONG_PRESS_MS)).toBe(true);
    expect(longPressFired(down, { x: 102, y: 101 }, LONG_PRESS_MS - 1)).toBe(false);
    expect(longPressFired(down, { x: 130, y: 100 }, LONG_PRESS_MS + 10)).toBe(false);
  });
});
