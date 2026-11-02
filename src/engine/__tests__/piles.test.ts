import { describe, expect, it } from "vitest";
import { inv, type GameContext } from "../context";
import { moveCard, reshuffleDiscard, shuffleThenTop } from "../movement";
import { gOf, skipMulligans, start } from "../kits/testkit";
import type { InstId } from "../world/types";
import { cardRecIn, pileRecIn } from "../world/store";
import { ZONE, PILE } from "../world/constants";

const R = "01001";
const fresh = (): GameContext => gOf(skipMulligans(start("the-gathering", [R], 1)));

/** every pile a card id sits in */
function pilesOf(game: GameContext, id: InstId): string[] {
  const me = inv(game, R);
  const piles: [string, readonly InstId[]][] = [
    ["deck", me.deck],
    ["hand", me.hand],
    ["discard", me.discard],
    ["encounterDeck", pileRecIn(game.s, PILE.EncounterDeck)],
    ["encounterDiscard", pileRecIn(game.s, PILE.EncounterDiscard)],
  ];
  return piles.filter(([, p]) => p.includes(id)).map(([name]) => name);
}

describe("reshuffleDiscard", () => {
  it("an investigator's discard pile becomes part of the deck: every card's zone is the deck, the discard is empty", () => {
    const game = fresh();
    const me = inv(game, R);
    const moved = me.deck.slice(0, 3);
    for (const id of moved) moveCard(game, id, ZONE.Discard);
    const size = me.deck.length + me.discard.length;
    reshuffleDiscard(game, R);
    expect(me.discard).toEqual([]);
    expect(me.deck.length).toBe(size);
    for (const id of moved) {
      expect(cardRecIn(game.s, id).zone).toBe("deck");
      expect(pilesOf(game, id)).toEqual(["deck"]);
    }
  });

  it("the encounter discard pile goes back into the encounter deck the same way", () => {
    const game = fresh();
    const moved = pileRecIn(game.s, PILE.EncounterDeck).slice(0, 2);
    for (const id of moved) moveCard(game, id, ZONE.EncounterDiscard);
    reshuffleDiscard(game, "encounter");
    expect(pileRecIn(game.s, PILE.EncounterDiscard)).toEqual([]);
    for (const id of moved) {
      expect(cardRecIn(game.s, id).zone).toBe("encounterDeck");
      expect(pilesOf(game, id)).toEqual(["encounterDeck"]);
    }
  });
});

describe("shuffleThenTop", () => {
  it("takes the cards out, shuffles the rest, and puts them on top in the order given, each in the deck only", () => {
    const game = fresh();
    const me = inv(game, R);
    const [a, b] = [me.deck[5], me.deck[9]];
    const size = me.deck.length;
    shuffleThenTop(game, R, [a, b]);
    expect(me.deck.slice(0, 2)).toEqual([a, b]);
    expect(me.deck.length).toBe(size);
    for (const id of [a, b]) {
      expect(cardRecIn(game.s, id).zone).toBe("deck");
      expect(pilesOf(game, id)).toEqual(["deck"]);
    }
  });

  it("puts a card from the discard pile on top of its owner's deck", () => {
    const game = fresh();
    const me = inv(game, R);
    const c = me.deck[3];
    moveCard(game, c, ZONE.Discard);
    shuffleThenTop(game, R, [c]);
    expect(me.deck[0]).toBe(c);
    expect(cardRecIn(game.s, c).zone).toBe("deck");
    expect(pilesOf(game, c)).toEqual(["deck"]);
  });
});
