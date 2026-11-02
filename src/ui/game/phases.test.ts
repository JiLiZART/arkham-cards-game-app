import { describe, expect, it } from "vitest";
import { locId, mutate, pick, putEnemy, skipMulligans, start } from "../../engine/kits/testkit";
import { phaseIsEmpty } from "./phases";
import { cardRecIn } from "../../engine/world/store";

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
    const r = mutate(
      roland(),
      (game) => void putEnemy(game, "01160", locId(game, "01111"), ROLAND),
    );
    expect(phaseIsEmpty(r.state, "enemy")).toBe(false);
  });

  it("a ready hunter moves: not empty; an exhausted one does nothing", () => {
    const hunter = (exhausted: boolean) =>
      mutate(roland(), (game) => {
        const id = putEnemy(game, "01159", locId(game, "01111"), null); // Swarm of Rats is a hunter
        cardRecIn(game.s, id).exhausted = exhausted;
      });
    expect(phaseIsEmpty(hunter(false).state, "enemy")).toBe(false);
    expect(phaseIsEmpty(hunter(true).state, "enemy")).toBe(true);
  });

  it("the mythos, investigation and upkeep phases always have something", () => {
    for (const p of ["mythos", "investigation", "upkeep"])
      expect(phaseIsEmpty(roland().state, p)).toBe(false);
  });
});
