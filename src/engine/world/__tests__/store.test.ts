/** the store's building blocks (ADR-0023), on hand-built worlds */
import { describe, expect, it } from "vitest";
import {
  allCardRecsIn,
  cardDataIn,
  cardRecIfIn,
  cardRecIn,
  putCardIn,
  withCardsIn,
  invRecIn,
  invViewIn,
  newWorld,
  pileKey,
  pileRead,
  pileRecIn,
  PILED_ZONES,
} from "../store";
import type { CardInst, InvRecord, World, Zone } from "../types";
import { ZONE, INV_STATUS, PILE } from "../constants";

const ZONES: Zone[] = [
  ZONE.Deck,
  ZONE.Hand,
  ZONE.Discard,
  ZONE.Play,
  ZONE.Threat,
  ZONE.Commit,
  ZONE.EncounterDeck,
  ZONE.EncounterDiscard,
  ZONE.SideDeck,
  ZONE.Location,
  ZONE.Enemy,
  ZONE.Attached,
  ZONE.Act,
  ZONE.Agenda,
  ZONE.ActDeck,
  ZONE.AgendaDeck,
  ZONE.Victory,
  ZONE.SetAside,
  ZONE.Removed,
  ZONE.Investigator,
  ZONE.Resolving,
  ZONE.Limbo,
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
  status: INV_STATUS.Playing,
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
    expect(pileKey(ZONE.Deck, "01001")).toBe("deck:01001");
    expect(pileKey(ZONE.Hand, "01002")).toBe("hand:01002");
    expect(pileKey(ZONE.Discard, "01001")).toBe("discard:01001");
    expect(pileKey(ZONE.EncounterDeck, null)).toBe("encounterDeck");
    expect(pileKey(ZONE.EncounterDiscard, null)).toBe("encounterDiscard");
    expect(pileKey(ZONE.ActDeck, null)).toBe("actDeck");
    expect(pileKey(ZONE.AgendaDeck, null)).toBe("agendaDeck");
  });

  it("an investigator's piles need an owner; a side deck's name isn't in the zone", () => {
    expect(pileKey(ZONE.Deck, null)).toBeNull();
    expect(pileKey(ZONE.Hand, null)).toBeNull();
    expect(pileKey(ZONE.SideDeck, null)).toBeNull();
  });
});

describe("piles of a world", () => {
  it("reading a pile that doesn't exist gives an empty one and creates nothing", () => {
    const w = newWorld();
    expect(pileRead({ world: w }, PILE.EncounterDeck)).toEqual([]);
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

const card = (id: string, extra: Partial<CardInst> = {}): CardInst => ({
  id,
  code: "01160",
  owner: null,
  controller: null,
  zone: ZONE.Enemy,
  exhausted: false,
  revealed: false,
  damage: 0,
  horror: 0,
  clues: 0,
  doom: 0,
  uses: 0,
  resources: 0,
  location: null,
  engagedWith: null,
  attachedTo: null,
  ...extra,
});

describe("a card's fields, each in its own table", () => {
  it("the card table holds the identity alone; a zone always has an entry, a default value has none", () => {
    const w = world();
    putCardIn({ world: w }, card("c1", { zone: "deck", owner: "01001", controller: "01001" }));
    expect(w.tables.card.c1).toEqual({ id: "c1", code: "01160" });
    expect(w.tables.zone.c1).toBe("deck");
    expect(w.tables.owner.c1).toBe("01001");
    for (const t of ["exhausted", "revealed", "damage", "horror", "clues", "doom", "uses"] as const)
      expect(w.tables[t]).not.toHaveProperty("c1");
    for (const t of ["resources", "location", "engagedWith", "attachedTo"] as const)
      expect(w.tables[t]).not.toHaveProperty("c1");
    expect(w.entities).toEqual(["c1"]);
  });

  it("an owner of none has no entry in the owner table", () => {
    const w = world();
    putCardIn({ world: w }, card("c1"));
    expect(w.tables.owner).not.toHaveProperty("c1");
    expect(w.tables.controller).not.toHaveProperty("c1");
  });

  it("a view shows every field, the default for an absent entry", () => {
    const w = world();
    putCardIn({ world: w }, card("c1", { damage: 2, location: "c9" }));
    const v = cardRecIn({ world: w }, "c1");
    expect([v.damage, v.horror, v.exhausted, v.owner, v.location, v.zone]).toEqual([
      2,
      0,
      false,
      null,
      "c9",
      "enemy",
    ]);
  });

  it("a view held across a write shows it, and a write through the view lands in the table", () => {
    const w = world();
    putCardIn({ world: w }, card("c1"));
    const v = cardRecIn({ world: w }, "c1");
    w.tables.damage.c1 = 2;
    expect(v.damage).toBe(2);
    v.horror = 1;
    expect(w.tables.horror.c1).toBe(1);
    v.exhausted = true;
    expect(w.tables.exhausted.c1).toBe(true);
    v.zone = ZONE.Discard;
    expect(w.tables.zone.c1).toBe("discard");
  });

  it("healing every point of damage leaves no entry, and so does readying", () => {
    const w = world();
    putCardIn({ world: w }, card("c1", { damage: 2, exhausted: true, owner: "01001" }));
    const v = cardRecIn({ world: w }, "c1");
    v.damage = 0;
    v.exhausted = false;
    v.owner = null;
    expect(w.tables.damage).not.toHaveProperty("c1");
    expect(w.tables.exhausted).not.toHaveProperty("c1");
    expect(w.tables.owner).not.toHaveProperty("c1");
    expect([v.damage, v.exhausted, v.owner]).toEqual([0, false, null]);
  });

  it("a card's code is changed in the identity record", () => {
    const w = world();
    putCardIn({ world: w }, card("c1"));
    const v = cardRecIn({ world: w }, "c1");
    v.code = "01161";
    expect(w.tables.card.c1.code).toBe("01161");
    expect(v.code).toBe("01161");
  });

  it("is one object per card and world, and a different world gets its own", () => {
    const w = world();
    putCardIn({ world: w }, card("c1"));
    const a = cardRecIn({ world: w }, "c1");
    expect(cardRecIn({ world: w }, "c1")).toBe(a);
    const copy = structuredClone(w);
    expect(cardRecIn({ world: copy }, "c1")).not.toBe(a);
  });

  it("a card added after the view was made is seen, and the list of all cards follows creation order", () => {
    const w = world();
    putCardIn({ world: w }, card("c1"));
    expect(allCardRecsIn({ world: w }).map((c) => c.id)).toEqual(["c1"]);
    putCardIn({ world: w }, card("c2"));
    expect(allCardRecsIn({ world: w }).map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(cardRecIn({ world: w }, "c2").code).toBe("01160");
  });

  it("the list of all cards is a copy: changing it leaves the next one whole", () => {
    const w = world();
    putCardIn({ world: w }, card("c1"));
    putCardIn({ world: w }, card("c2"));
    allCardRecsIn({ world: w }).reverse();
    expect(allCardRecsIn({ world: w }).map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("cardDataIn is a plain object with every field, and a view serializes to the same JSON", () => {
    const w = world();
    putCardIn({ world: w }, card("c1", { damage: 1, owner: "01001", zone: "play" }));
    const data = cardDataIn({ world: w }, "c1");
    expect(data).toEqual(card("c1", { damage: 1, owner: "01001", zone: "play" }));
    expect(Object.keys(data)).toEqual(Object.keys(card("c1")));
    expect(JSON.parse(JSON.stringify(cardRecIn({ world: w }, "c1")))).toEqual(data);
  });
});

describe("withCardsIn", () => {
  it("a copy of a state with more cards in it (for fixtures): the original is untouched", () => {
    const w = world();
    putCardIn({ world: w }, card("c1", { damage: 1 }));
    const s = { world: w } as never as Parameters<typeof withCardsIn>[0];
    const copy = withCardsIn(s, {
      c7: card("c7", { code: "01159", zone: "enemy", location: "dest" }),
      c1: card("c1", { code: "x", damage: 3 }),
    });
    expect(copy.world.entities).toEqual(["c1", "c7"]);
    expect(cardRecIn(copy, "c7")).toMatchObject({ code: "01159", location: "dest" });
    expect(cardRecIn(copy, "c1")).toMatchObject({ code: "x", damage: 3 });
    expect(w.entities).toEqual(["c1"]);
    expect(cardRecIn(s, "c1")).toMatchObject({ code: "01160", damage: 1 });
    expect(copy.world.tables.investigator).toBe(w.tables.investigator);
  });
});
