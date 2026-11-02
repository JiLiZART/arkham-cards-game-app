import { describe, expect, it } from "vitest";
import { addCounter, counter, setCounter, type GameContext } from "../context";
import { findByCode } from "../queries";
import { gOf, skipMulligans, start } from "../kits/testkit";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";

const R = "01001";
const fresh = (): GameContext => gOf(skipMulligans(start("the-gathering", [R], 1)));

describe("counters", () => {
  it("read and change a card's tokens", () => {
    const game = fresh();
    const study = findByCode(game, "01111", [ZONE.Location])!.id;
    expect(counter(game, study, "clues")).toBe(cardRecIn(game.s, study).clues);
    expect(addCounter(game, study, "clues", -1)).toBe(cardRecIn(game.s, study).clues);
    setCounter(game, study, "doom", 3);
    expect(cardRecIn(game.s, study).doom).toBe(3);
  });

  it("read and change an investigator's damage, horror, clues and resources", () => {
    const game = fresh();
    expect(counter(game, R, "resources")).toBe(5);
    expect(addCounter(game, R, "resources", 2)).toBe(7);
    setCounter(game, R, "horror", 1);
    expect(invStateIn(game.s, R).horror).toBe(1);
  });

  it("no clamping: what the rule writes is what is stored (rules clamp where they must)", () => {
    const game = fresh();
    expect(addCounter(game, R, "clues", -1)).toBe(-1);
  });

  it("refuses doom and uses on an investigator, and an id that is neither", () => {
    const game = fresh();
    expect(() => counter(game, R, "doom")).toThrow(/doom/);
    expect(() => counter(game, "nobody", "clues")).toThrow(/nobody/);
  });
});
