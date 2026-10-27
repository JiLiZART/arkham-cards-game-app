import { describe, expect, it } from "vitest";
import { locId, mutate, pick, putEnemy, skipMulligans, start } from "../../engine/testkit";
import { phaseIsEmpty } from "./phases";

const ROLAND = "01001";
const roland = () => {
  let r = skipMulligans(start("the-gathering", [ROLAND], 1));
  if (r.state.pending?.options.some((o) => o.label === "Roland Banks")) r = pick(r, "Roland Banks");
  return r;
};

describe("phaseIsEmpty", () => {
  it("an enemy phase with no enemy that could move or attack is empty: its pause is skipped", () => {
    expect(phaseIsEmpty(roland().state, "enemy")).toBe(true);
  });

  it("an engaged, ready enemy attacks: not empty", () => {
    const r = mutate(roland(), (g) => void putEnemy(g, "01160", locId(g, "01111"), ROLAND));
    expect(phaseIsEmpty(r.state, "enemy")).toBe(false);
  });

  it("a ready hunter moves: not empty; an exhausted one does nothing", () => {
    const hunter = (exhausted: boolean) =>
      mutate(roland(), (g) => {
        const id = putEnemy(g, "01159", locId(g, "01111"), null); // Swarm of Rats is a hunter
        g.s.cards[id].exhausted = exhausted;
      });
    expect(phaseIsEmpty(hunter(false).state, "enemy")).toBe(false);
    expect(phaseIsEmpty(hunter(true).state, "enemy")).toBe(true);
  });

  it("the mythos, investigation and upkeep phases always have something", () => {
    for (const p of ["mythos", "investigation", "upkeep"])
      expect(phaseIsEmpty(roland().state, p)).toBe(false);
  });
});
