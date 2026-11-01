/** read-only lookups over a game state, for code that holds a state and not the engine context: the UI, online play, the bot */
import { describe, expect, it } from "vitest";
import { cardOf, cardOfIf, cardsOf, invOf, invOfIf, invsOf, patchedState } from "./core";
import { skipMulligans, start } from "./testkit";

const R = "01001";
const D = "01002";
const state = () => skipMulligans(start("the-gathering", [R, D], 1)).state;

describe("lookups over a state", () => {
  it("a card by id: one that must exist throws, one that may not is undefined", () => {
    const s = state();
    const id = Object.keys(s.cards)[0];
    expect(cardOf(s, id)).toBe(s.cards[id]);
    expect(cardOfIf(s, id)).toBe(s.cards[id]);
    expect(() => cardOf(s, "c99999")).toThrow(/c99999/);
    expect(cardOfIf(s, "c99999")).toBeUndefined();
    expect(cardOfIf(s, null)).toBeUndefined();
    expect(cardOfIf(s, undefined)).toBeUndefined();
  });

  it("a missing state is a missing card or investigator, not an error (a game not yet started)", () => {
    expect(cardOfIf(null, "c1")).toBeUndefined();
    expect(cardOfIf(undefined, "c1")).toBeUndefined();
    expect(invOfIf(null, R)).toBeUndefined();
  });

  it("only needs the record it reads", () => {
    const s = state();
    const cardsOnly: Pick<typeof s, "cards"> = { cards: s.cards };
    const invsOnly: Pick<typeof s, "invs"> = { invs: s.invs };
    expect(cardOfIf(cardsOnly, Object.keys(s.cards)[0])).toBeDefined();
    expect(cardOf(cardsOnly, Object.keys(s.cards)[0])).toBeDefined();
    expect(invOfIf(invsOnly, R)).toBeDefined();
    expect(invOf(invsOnly, R)).toBeDefined();
  });

  it("an investigator by id, the same way", () => {
    const s = state();
    expect(invOf(s, R)).toBe(s.invs[R]);
    expect(invOfIf(s, D)?.name).toBe("Daisy Walker");
    expect(() => invOf(s, "nobody")).toThrow(/nobody/);
    expect(invOfIf(s, null)).toBeUndefined();
  });

  it("every card in creation order, every investigator in turn order", () => {
    const s = state();
    expect(cardsOf(s).map((c) => c.id)).toEqual(Object.keys(s.cards));
    expect(invsOf(s).map((i) => i.id)).toEqual(s.order);
  });

  it("refuse writes at compile time", () => {
    const s = state();
    const never = () => {
      // @ts-expect-error a card view can't be written
      cardOf(s, "c1").clues = 1;
      // @ts-expect-error nor an investigator view
      invOf(s, R).damage = 1;
      // @ts-expect-error nor an element of a list
      cardsOf(s)[0].zone = "discard";
      // @ts-expect-error nor a pile
      invsOf(s)[0].hand.push("c1");
    };
    expect(typeof never).toBe("function");
  });
});

describe("patchedState", () => {
  it("a copy with some cards' fields overridden: the original is untouched, the other cards are shared", () => {
    const s = state();
    const [a, b] = Object.keys(s.cards);
    const before = s.cards[a].location;
    const copy = patchedState(s, { [a]: { location: "c9", engagedWith: null } });
    expect(cardOf(copy, a)).toMatchObject({ location: "c9", engagedWith: null });
    expect(cardOf(s, a).location).toBe(before);
    expect(cardOf(copy, b)).toBe(cardOf(s, b));
    expect(copy.round).toBe(s.round);
  });

  it("ignores an id the game doesn't have", () => {
    const s = state();
    expect(Object.keys(patchedState(s, { c99999: { location: "c1" } }).cards)).toEqual(
      Object.keys(s.cards),
    );
  });
});
