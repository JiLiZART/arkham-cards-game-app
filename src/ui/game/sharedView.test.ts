import { describe, expect, it } from "vitest";
import type { GameState } from "../../engine/types";
import { sharedView } from "./sharedView";

/** just the cards the lookups read */
const game = {
  world: {
    tables: {
      card: { enemy: { id: "enemy", code: "01160" }, hand: { id: "hand", code: "01016" } },
      owner: { hand: "01001" },
    },
  },
} as unknown as Pick<GameState, "world">;

describe("sharedView", () => {
  it("shares the act, agenda and reference decks", () => {
    for (const deck of ["act", "agenda", "reference"] as const)
      expect(sharedView(game, { deck })).toBe(true);
  });

  it("shares a card no investigator owns", () => {
    expect(sharedView(game, { card: "enemy" })).toBe(true);
  });

  it("keeps an investigator's card to its viewer", () => {
    expect(sharedView(game, { card: "hand" })).toBe(false);
  });

  it("drops a card that is not on this table", () => {
    expect(sharedView(game, { card: "nowhere" })).toBe(false);
  });

  it("keeps investigators, play areas and the chaos bag local", () => {
    expect(sharedView(game, { inv: "01001" })).toBe(false);
    expect(sharedView(game, { assets: "01001" })).toBe(false);
    expect(sharedView(game, { threats: "01001" })).toBe(false);
    expect(sharedView(game, { bag: true })).toBe(false);
    expect(sharedView(game, null)).toBe(false);
  });
});
