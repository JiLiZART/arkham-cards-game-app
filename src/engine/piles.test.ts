import { describe, expect, it } from "vitest";
import { inv, moveCard, reshuffleDiscard, shuffleThenTop, type G } from "./core";
import { gOf, skipMulligans, start } from "./testkit";
import type { InstId } from "./types";

const R = "01001";
const fresh = (): G => gOf(skipMulligans(start("the-gathering", [R], 1)));

/** every pile a card id sits in */
function pilesOf(g: G, id: InstId): string[] {
  const me = inv(g, R);
  const piles: [string, readonly InstId[]][] = [
    ["deck", me.deck],
    ["hand", me.hand],
    ["discard", me.discard],
    ["encounterDeck", g.s.encounterDeck],
    ["encounterDiscard", g.s.encounterDiscard],
  ];
  return piles.filter(([, p]) => p.includes(id)).map(([name]) => name);
}

describe("reshuffleDiscard", () => {
  it("an investigator's discard pile becomes part of the deck: every card's zone is the deck, the discard is empty", () => {
    const g = fresh();
    const me = inv(g, R);
    const moved = me.deck.slice(0, 3);
    for (const id of moved) moveCard(g, id, "discard");
    const size = me.deck.length + me.discard.length;
    reshuffleDiscard(g, R);
    expect(me.discard).toEqual([]);
    expect(me.deck.length).toBe(size);
    for (const id of moved) {
      expect(g.s.cards[id].zone).toBe("deck");
      expect(pilesOf(g, id)).toEqual(["deck"]);
    }
  });

  it("the encounter discard pile goes back into the encounter deck the same way", () => {
    const g = fresh();
    const moved = g.s.encounterDeck.slice(0, 2);
    for (const id of moved) moveCard(g, id, "encounterDiscard");
    reshuffleDiscard(g, "encounter");
    expect(g.s.encounterDiscard).toEqual([]);
    for (const id of moved) {
      expect(g.s.cards[id].zone).toBe("encounterDeck");
      expect(pilesOf(g, id)).toEqual(["encounterDeck"]);
    }
  });
});

describe("shuffleThenTop", () => {
  it("takes the cards out, shuffles the rest, and puts them on top in the order given, each in the deck only", () => {
    const g = fresh();
    const me = inv(g, R);
    const [a, b] = [me.deck[5], me.deck[9]];
    const size = me.deck.length;
    shuffleThenTop(g, R, [a, b]);
    expect(me.deck.slice(0, 2)).toEqual([a, b]);
    expect(me.deck.length).toBe(size);
    for (const id of [a, b]) {
      expect(g.s.cards[id].zone).toBe("deck");
      expect(pilesOf(g, id)).toEqual(["deck"]);
    }
  });

  it("puts a card from the discard pile on top of its owner's deck", () => {
    const g = fresh();
    const me = inv(g, R);
    const c = me.deck[3];
    moveCard(g, c, "discard");
    shuffleThenTop(g, R, [c]);
    expect(me.deck[0]).toBe(c);
    expect(g.s.cards[c].zone).toBe("deck");
    expect(pilesOf(g, c)).toEqual(["deck"]);
  });
});
