/** the store's building blocks (ADR-0023), on hand-built worlds */
import { describe, expect, it } from "vitest";
import {
  cardRecIfIn,
  withCardsIn,
  invRecIn,
  invViewIn,
  newWorld,
  pileKey,
  pileRead,
  pileRecIn,
  PILED_ZONES,
} from "./records";
import type { InvRecord, World, Zone } from "./types";

const ZONES: Zone[] = [
  "deck",
  "hand",
  "discard",
  "play",
  "threat",
  "commit",
  "encounterDeck",
  "encounterDiscard",
  "sideDeck",
  "location",
  "enemy",
  "attached",
  "act",
  "agenda",
  "actDeck",
  "agendaDeck",
  "victory",
  "setAside",
  "removed",
  "investigator",
  "resolving",
  "limbo",
];

const record = (id: string): InvRecord => ({
  id,
  cardId: "c1",
  name: "Roland Banks",
  location: null,
  damage: 0,
  horror: 0,
  clues: 0,
  resources: 5,
  actionsLeft: 0,
  restrictedActions: [],
  actionsThisRound: [],
  actionsTaken: 0,
  defeatedHealth: 0,
  status: "playing",
  turnDone: false,
  physicalTrauma: 0,
  mentalTrauma: 0,
  player: 0,
});
const world = (): World => {
  const w = newWorld();
  w.tables.investigator["01001"] = record("01001");
  w.piles["deck:01001"] = ["c3", "c4"];
  w.piles["hand:01001"] = ["c5"];
  return w;
};

describe("pileKey", () => {
  it("names exactly one pile for each zone that has one, and none for the others", () => {
    const named = ZONES.filter((z) => pileKey(z, "01001") !== null);
    expect(named.sort()).toEqual([...PILED_ZONES].sort());
    expect(pileKey("deck", "01001")).toBe("deck:01001");
    expect(pileKey("hand", "01002")).toBe("hand:01002");
    expect(pileKey("discard", "01001")).toBe("discard:01001");
    expect(pileKey("encounterDeck", null)).toBe("encounterDeck");
    expect(pileKey("encounterDiscard", null)).toBe("encounterDiscard");
    expect(pileKey("actDeck", null)).toBe("actDeck");
    expect(pileKey("agendaDeck", null)).toBe("agendaDeck");
  });

  it("an investigator's piles need an owner; a side deck's name isn't in the zone", () => {
    expect(pileKey("deck", null)).toBeNull();
    expect(pileKey("hand", null)).toBeNull();
    expect(pileKey("sideDeck", null)).toBeNull();
  });
});

describe("piles of a world", () => {
  it("reading a pile that doesn't exist gives an empty one and creates nothing", () => {
    const w = newWorld();
    expect(pileRead({ world: w }, "encounterDeck")).toEqual([]);
    expect(w.piles).toEqual({});
  });

  it("the writer creates the pile, and later reads see what was written", () => {
    const w = newWorld();
    pileRecIn({ world: w }, "discard:01001").push("c9");
    expect(pileRead({ world: w }, "discard:01001")).toEqual(["c9"]);
    expect(w.piles["discard:01001"]).toEqual(["c9"]);
  });
});

describe("live investigator views", () => {
  it("read the record and the piles as they are now", () => {
    const w = world();
    const view = invViewIn({ world: w }, "01001")!;
    expect(view.name).toBe("Roland Banks");
    expect(view.deck).toEqual(["c3", "c4"]);
    expect(view.hand).toEqual(["c5"]);
    expect(view.discard).toEqual([]);
    invRecIn({ world: w }, "01001").resources = 7;
    pileRecIn({ world: w }, "hand:01001").push("c6");
    expect(view.resources).toBe(7);
    expect(view.hand).toEqual(["c5", "c6"]);
  });

  it("write through to the record, and a pile assigned replaces the pile's contents in place", () => {
    const w = world();
    const view = invViewIn({ world: w }, "01001")!;
    view.clues = 3;
    expect(w.tables.investigator["01001"].clues).toBe(3);
    const pile = w.piles["hand:01001"]!;
    view.hand = ["c8", "c9"];
    expect(w.piles["hand:01001"]).toBe(pile);
    expect(pile).toEqual(["c8", "c9"]);
    view.deck.unshift("c1");
    expect(w.piles["deck:01001"]).toEqual(["c1", "c3", "c4"]);
  });

  it("are one object per record and world, and a different world gets its own", () => {
    const w = world();
    expect(invViewIn({ world: w }, "01001")).toBe(invViewIn({ world: w }, "01001"));
    const copy: World = structuredClone(w);
    const other = invViewIn({ world: copy }, "01001")!;
    expect(other).not.toBe(invViewIn({ world: w }, "01001"));
    expect(other.deck).toEqual(["c3", "c4"]);
  });

  it("spread into a plain object with every record field and the three piles", () => {
    const w = world();
    const spread = { ...invViewIn({ world: w }, "01001")! };
    expect(Object.keys(spread).sort()).toEqual(
      [...Object.keys(record("x")), "defeatedBy", "deck", "hand", "discard"].sort(),
    );
    expect(spread.deck).toEqual(["c3", "c4"]);
  });

  it("a status set later shows in a view made before", () => {
    const w = world();
    const view = invViewIn({ world: w }, "01001")!;
    expect(view.defeatedBy).toBeUndefined();
    invRecIn({ world: w }, "01001").defeatedBy = "damage";
    expect(view.defeatedBy).toBe("damage");
  });

  it("an unknown investigator has no view, and an unknown card no record", () => {
    const w = world();
    expect(invViewIn({ world: w }, "nobody")).toBeUndefined();
    expect(cardRecIfIn({ world: w }, "c99")).toBeUndefined();
  });
});

describe("withCardsIn", () => {
  it("a copy of a state with more cards in it (for fixtures): the original is untouched", () => {
    const w = world();
    w.entities.push("c1");
    w.tables.card.c1 = { id: "c1", code: "01001" } as never;
    const s = { world: w } as never as Parameters<typeof withCardsIn>[0];
    const copy = withCardsIn(s, {
      c7: { id: "c7", code: "01160" } as never,
      c1: { id: "c1", code: "x" } as never,
    });
    expect(copy.world.entities).toEqual(["c1", "c7"]);
    expect(copy.world.tables.card.c7.code).toBe("01160");
    expect(copy.world.tables.card.c1.code).toBe("x");
    expect(w.entities).toEqual(["c1"]);
    expect(w.tables.card.c1.code).toBe("01001");
    expect(copy.world.tables.investigator).toBe(w.tables.investigator);
  });
});
