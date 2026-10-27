import { describe, expect, it } from "vitest";
import { validateDeck } from "../../engine/decks";
import { db } from "../../engine/testkit";
import {
  basicWeaknesses,
  builderPool,
  changeCopies,
  deckTabs,
  editDeck,
  replaceCard,
  customDecks,
  defaultDeckName,
  deleteCustomDeck,
  emptyDeck,
  renameCustomDeck,
  saveCustomDeck,
  withWeakness,
} from "./decks";
import type { Storage } from "../state/store";

const ROLAND = "01001";
const base = db.decks["roland-starter"];
const FLASHLIGHT = "01087";
const MACHETE = "01020";
const PARANOIA = "01097";

const memory = (): Storage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

describe("building a deck", () => {
  it("an empty deck holds the signature cards and the weakness slot, with a random basic weakness", () => {
    const d = emptyDeck(db, ROLAND);
    expect(Object.keys(d.cards).sort()).toEqual(["01006", "01007"]);
    expect(d.randomBasicWeakness).toBe(true);
    expect(validateDeck(db, d).map((p) => p.reason?.key)).toEqual(["deck.size"]);
  });

  it("changeCopies adds and takes away one copy at a time, never below none, and never changes its input", () => {
    const before = { ...base.cards };
    const more = changeCopies(base.cards, FLASHLIGHT, 1);
    expect(more[FLASHLIGHT]).toBe(base.cards[FLASHLIGHT] + 1);
    expect(base.cards).toEqual(before);
    expect(changeCopies({ a: 1 }, "a", -1)).toEqual({});
    expect(changeCopies({}, "a", -1)).toEqual({});
  });

  it("the basic weakness: a chosen one replaces the deck's, a random one is the flag with none listed", () => {
    const other = basicWeaknesses(db).find((c) => c.code !== PARANOIA)!.code;
    const chosen = withWeakness(db, base, other);
    expect(chosen.cards[other]).toBe(1);
    expect(chosen.cards[PARANOIA]).toBeUndefined();
    expect(chosen.randomBasicWeakness).toBe(false);
    expect(validateDeck(db, chosen)).toEqual([]);
    const random = withWeakness(db, base, null);
    expect(random.cards[PARANOIA]).toBeUndefined();
    expect(random.randomBasicWeakness).toBe(true);
    expect(validateDeck(db, random)).toEqual([]);
  });

  it("the pool of a builder: player cards the investigator may take, with the reason for the others, the signatures left out", () => {
    const rows = builderPool(db, "en", ROLAND, { query: "", factions: [], types: [], levels: [] });
    const codes = new Set(rows.map((c) => c.code));
    expect(codes.has(MACHETE)).toBe(true);
    expect(codes.has("01006")).toBe(false); // Roland's .38 Special
    expect(codes.has("01007")).toBe(false); // Cover Up
    expect(
      rows.every((c) => !c.subtype && c.faction !== "mythos" && c.type !== "investigator"),
    ).toBe(true);
    // preset to the classes of the investigator's options
    expect(new Set(rows.map((c) => c.faction))).toEqual(new Set(["guardian", "seeker", "neutral"]));
  });
});

describe("saved custom decks", () => {
  function poolRows() {
    return builderPool(db, "en", ROLAND, {
      query: "",
      factions: [],
      types: [],
      levels: [0],
    }).filter(
      (c) =>
        !c.keywords.includes("exceptional") &&
        (c.deckLimit ?? 2) >= 2 &&
        !Object.keys(base.cards).some((k) => db.cards[k].name === c.name),
    );
  }
  const six = () => {
    const swapped = { ...base.cards };
    const out = Object.keys(swapped)
      .filter((k) => k !== "01006" && k !== "01007" && k !== PARANOIA && swapped[k] === 2)
      .slice(0, 3);
    for (const k of out) delete swapped[k];
    for (const c of poolRows().slice(0, 3)) swapped[c.code] = 2;
    return {
      name: "Roland · test",
      investigator: ROLAND,
      base: base.id,
      cards: swapped,
      randomBasicWeakness: base.randomBasicWeakness,
    };
  };

  it("round-trips through storage and is offered for its investigator only", () => {
    const store = memory();
    const saved = saveCustomDeck(db, store, six());
    expect(saved.id).toMatch(/^custom:/);
    expect(saved.problems).toEqual([]);
    const back = customDecks(db, ROLAND, store);
    expect(back.map((d) => [d.id, d.name])).toEqual([[saved.id, "Roland · test"]]);
    expect(back[0].deck.cards).toEqual(six().cards);
    expect(back[0].deck.id).toBe(saved.id);
    expect(customDecks(db, "01002", store)).toEqual([]);
  });

  it("six cards swapped out is fine: there is no swap limit, only the deckbuilding rules", () => {
    const store = memory();
    const saved = saveCustomDeck(db, store, six());
    expect(saved.problems).toEqual([]);
    expect(Object.keys(saved.deck.cards).filter((c) => !base.cards[c]).length).toBe(3);
  });

  it("refuses to save an invalid deck", () => {
    const bad = { ...six(), cards: changeCopies(changeCopies(base.cards, MACHETE, 1), MACHETE, 1) };
    expect(() => saveCustomDeck(db, memory(), bad)).toThrow(/invalid/i);
  });

  it("renames and deletes", () => {
    const store = memory();
    const a = saveCustomDeck(db, store, six());
    const b = saveCustomDeck(db, store, { ...six(), name: "Second" });
    renameCustomDeck(store, a.id, "Renamed");
    expect(customDecks(db, ROLAND, store).map((d) => d.name)).toEqual(["Renamed", "Second"]);
    deleteCustomDeck(store, b.id);
    expect(customDecks(db, ROLAND, store).map((d) => d.name)).toEqual(["Renamed"]);
  });

  it("a deck that no longer validates (a card's pack is gone) is returned with its reason", () => {
    const store = memory();
    const saved = saveCustomDeck(db, store, six());
    const raw = JSON.parse(store.getItem("ah:decks")!);
    raw[0].deck.cards["99999"] = 1;
    store.setItem("ah:decks", JSON.stringify(raw));
    const [deck] = customDecks(db, ROLAND, store);
    expect(deck.id).toBe(saved.id);
    expect(deck.problems.map((p) => p.reason?.key)).toContain("deck.unknown");
  });

  it("garbage in storage is ignored", () => {
    const store = memory();
    store.setItem("ah:decks", "{nope");
    expect(customDecks(db, ROLAND, store)).toEqual([]);
  });
});

describe("defaultDeckName", () => {
  it("is the investigator's first name and the date", () => {
    expect(defaultDeckName(db, ROLAND, "en", new Date(2026, 9, 17))).toBe("Roland · 17 Oct");
    expect(defaultDeckName(db, "01003", "en", new Date(2026, 9, 17))).toBe("Skids · 17 Oct");
  });
});

describe("the deck step's tabs and edits", () => {
  it("replaceCard takes one copy out and puts one in", () => {
    expect(replaceCard({ a: 2, b: 1 }, "a", "c")).toEqual({ a: 1, b: 1, c: 1 });
    expect(replaceCard({ a: 1 }, "a", "a")).toEqual({ a: 1 });
    expect(replaceCard({ a: 1 }, "a", "b")).toEqual({ b: 1 });
  });

  it("the tabs are the starter decks first, then the saved decks, valid or not, each with its problems", () => {
    const store = memory();
    expect(deckTabs(db, ROLAND, store).map((t) => [t.id, t.kind])).toEqual([
      ["roland-starter", "starter"],
    ]);
    const id = editDeck(
      db,
      store,
      ROLAND,
      db.decks["roland-starter"],
      { ...base.cards, [MACHETE]: 2 },
      "en",
    );
    const tabs = deckTabs(db, ROLAND, store);
    expect(tabs.map((t) => t.kind)).toEqual(["starter", "custom"]);
    expect(tabs[1].id).toBe(id);
    expect(tabs[1].problems.length).toBeGreaterThan(0); // 31 cards: kept as a draft, with its problems
  });

  it("an edit of a starter deck makes a new saved deck and never changes the starter", () => {
    const store = memory();
    const before = structuredClone(db.decks["roland-starter"]);
    const id = editDeck(
      db,
      store,
      ROLAND,
      db.decks["roland-starter"],
      changeCopies(base.cards, FLASHLIGHT, -1),
      "en",
    );
    expect(id).not.toBe("roland-starter");
    expect(db.decks["roland-starter"]).toEqual(before);
    expect(customDecks(db, ROLAND, store)[0].deck.cards[FLASHLIGHT]).toBe(
      base.cards[FLASHLIGHT] - 1,
    );
  });

  it("a second new deck the same day gets a number, so the tabs can be told apart", () => {
    const store = memory();
    editDeck(db, store, ROLAND, db.decks["roland-starter"], base.cards, "en");
    editDeck(db, store, ROLAND, db.decks["roland-starter"], base.cards, "en");
    const names = customDecks(db, ROLAND, store).map((d) => d.name);
    expect(names[1]).toBe(`${names[0]} (2)`);
  });

  it("an edit of a saved deck changes it in place", () => {
    const store = memory();
    const id = editDeck(
      db,
      store,
      ROLAND,
      db.decks["roland-starter"],
      changeCopies(base.cards, FLASHLIGHT, -1),
      "en",
    );
    const saved = customDecks(db, ROLAND, store)[0].deck;
    const again = editDeck(
      db,
      store,
      ROLAND,
      saved,
      changeCopies(saved.cards, FLASHLIGHT, 1),
      "en",
    );
    expect(again).toBe(id);
    expect(customDecks(db, ROLAND, store)).toHaveLength(1);
    expect(customDecks(db, ROLAND, store)[0].deck.cards).toEqual(base.cards);
    expect(customDecks(db, ROLAND, store)[0].problems).toEqual([]);
  });
});
