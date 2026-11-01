/** read-only lookups over a game state, for code that holds a state and not the engine context: the UI, online play, the bot */
import { describe, expect, it } from "vitest";
import {
  cardCopyOf,
  cardOf,
  cardOfIf,
  cardsOf,
  invOf,
  invOfIf,
  invsOf,
  patchedState,
  pileMap,
  pileOf,
} from "./core";
import { skipMulligans, start } from "./testkit";
import { cardRecIn, invStateIn } from "./records";

const R = "01001";
const D = "01002";
const state = () => skipMulligans(start("the-gathering", [R, D], 1)).state;

describe("lookups over a state", () => {
  it("a card by id: one that must exist throws, one that may not is undefined", () => {
    const s = state();
    const id = s.world.entities[0];
    expect(cardOf(s, id)).toBe(cardRecIn(s, id));
    expect(cardOfIf(s, id)).toBe(cardRecIn(s, id));
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

  it("only needs the world it reads", () => {
    const s = state();
    const worldOnly: Pick<typeof s, "world"> = { world: s.world };
    expect(cardOfIf(worldOnly, s.world.entities[0])).toBeDefined();
    expect(cardOf(worldOnly, s.world.entities[0])).toBeDefined();
    expect(invOfIf(worldOnly, R)).toBeDefined();
    expect(invOf(worldOnly, R)).toBeDefined();
  });

  it("an investigator by id, the same way", () => {
    const s = state();
    expect(invOf(s, R)).toBe(invStateIn(s, R));
    expect(invOfIf(s, D)?.name).toBe("Daisy Walker");
    expect(() => invOf(s, "nobody")).toThrow(/nobody/);
    expect(invOfIf(s, null)).toBeUndefined();
  });

  it("every card in creation order, every investigator in turn order", () => {
    const s = state();
    expect(cardsOf(s).map((c) => c.id)).toEqual(s.world.entities);
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
  it("a copy with some cards' fields overridden: the original is untouched, the tables it didn't change are shared", () => {
    const s = state();
    const [a, b] = s.world.entities;
    const before = cardRecIn(s, a).location;
    const copy = patchedState(s, { [a]: { location: "c9", engagedWith: null } });
    expect(cardOf(copy, a)).toMatchObject({ location: "c9", engagedWith: null });
    expect(cardOf(s, a).location).toBe(before);
    expect(cardCopyOf(copy, b)).toEqual(cardCopyOf(s, b));
    expect(copy.world.tables.damage).toBe(s.world.tables.damage);
    expect(copy.world.tables.location).not.toBe(s.world.tables.location);
    expect(copy.world.tables.card).toBe(s.world.tables.card);
    expect(copy.round).toBe(s.round);
  });

  it("ignores an id the game doesn't have", () => {
    const s = state();
    expect(patchedState(s, { c99999: { location: "c1" } }).world.entities).toEqual(
      s.world.entities,
    );
  });
});

describe("the entity list", () => {
  it("is the creation order of the card table, through a whole game", () => {
    const s = state();
    expect(s.world.entities).toEqual(Object.keys(s.world.tables.card));
    expect(Object.keys(s.world.tables.zone)).toEqual(s.world.entities);
    expect(new Set(s.world.entities).size).toBe(s.world.entities.length);
    expect(cardsOf(s).map((c) => c.id)).toEqual(s.world.entities);
  });
});

describe("a scenario's piles by name", () => {
  it("The Midnight Masks has its cultist deck as a side-deck pile, and the shared decks as theirs", () => {
    const s = skipMulligans(start("the-midnight-masks", [R], 1)).state;
    const piles = pileMap(s);
    expect(piles["sideDeck:cultists"]?.length).toBeGreaterThan(0);
    expect(piles.encounterDeck?.length).toBeGreaterThan(0);
    expect(pileOf(s, "agendaDeck").length).toBeGreaterThan(0);
    expect(pileOf(s, "hand:01001")).toHaveLength(5);
    for (const name of Object.keys(piles).filter((n) => n.startsWith("sideDeck:")))
      for (const id of piles[name as keyof typeof piles]!)
        expect(cardOf(s, id).zone).toBe("sideDeck");
  });
});
