import { describe, expect, it } from "vitest";
import { validateDeck } from "../engine/decks";
import { db } from "../engine/testkit";
import { addOp, applySwaps, basicWeaknesses, customDecks, defaultDeckName, deleteCustomDeck, poolFor, renameCustomDeck, saveCustomDeck, swapBudget, type DeckOp } from "./decks";
import type { Storage } from "./store";

const ROLAND = "01001";
const base = db.decks["roland-starter"];
const FLASHLIGHT = "01087";
const MACHETE = "01020";
const PARANOIA = "01097";

const memory = (): Storage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
const nameOf = (code: string) => db.cards[code].name;

/** a card the deck could take two more of: in the pool, absent from the deck, with room for two copies */
const spare = () => poolFor(db, ROLAND).find((c) => !base.cards[c.code] && (c.deckLimit ?? 2) >= 2)!.code;

describe("poolFor", () => {
  const pool = poolFor(db, ROLAND);
  const codes = new Set(pool.map((c) => c.code));

  it("is level 0 assets, events and skills of the investigator's classes and neutral", () => {
    expect(pool.length).toBeGreaterThan(20);
    for (const c of pool) {
      expect(c.xp ?? 0, c.name).toBe(0);
      expect(["asset", "event", "skill"], c.name).toContain(c.type);
      expect(["guardian", "seeker", "neutral"], c.name).toContain(c.faction);
    }
  });

  it("leaves out other classes, signatures, weaknesses and other investigators' signatures", () => {
    expect([...codes].some((c) => db.cards[c].faction === "mystic")).toBe(false);
    expect(codes.has("01006")).toBe(false); // Roland's .38 Special
    expect(codes.has("01007")).toBe(false); // Cover Up
    expect(codes.has(PARANOIA)).toBe(false);
    expect([...codes].some((c) => db.cards[c].subtype)).toBe(false);
  });

  it("holds the starter deck's own cards, so removed copies can be restored", () => {
    for (const c of [FLASHLIGHT, MACHETE, "01017"]) expect(codes.has(c), nameOf(c)).toBe(true);
  });
});

describe("applySwaps and the swap budget", () => {
  const remove = (code: string): DeckOp => ({ op: "remove", code });
  const add = (code: string): DeckOp => ({ op: "add", code });

  it("swapping two Flashlights for two other cards keeps the deck valid and the same size", () => {
    const ops = [remove(FLASHLIGHT), remove(FLASHLIGHT), add(spare()), add(spare())];
    const deck = applySwaps(db, base, ops);
    expect(deck.cards[FLASHLIGHT]).toBeUndefined();
    expect(deck.cards[spare()]).toBe(2);
    expect(validateDeck(db, deck)).toEqual([]);
    expect(swapBudget(db, base, ops)).toEqual({ used: 2, limit: 5, left: 3 });
  });

  it("the starter deck itself is never changed", () => {
    const before = structuredClone(base);
    applySwaps(db, base, [remove(FLASHLIGHT), add(spare())]);
    expect(base).toEqual(before);
  });

  it("a sixth removal is refused, naming the limit", () => {
    const five = [...Object.keys(base.cards).filter((c) => c !== "01006" && c !== "01007" && c !== PARANOIA).slice(0, 5).map(remove)];
    let ops: DeckOp[] = [];
    for (const o of five) {
      const r = addOp(db, base, ops, o);
      expect(r.ok).toBe(true);
      if (r.ok) ops = r.ops;
    }
    expect(swapBudget(db, base, ops).left).toBe(0);
    const sixth = addOp(db, base, ops, remove(Object.keys(base.cards).filter((c) => c !== "01006" && c !== "01007" && c !== PARANOIA)[5]));
    expect(sixth).toEqual({ ok: false, reason: "limit" });
  });

  it("taking back an added card does not spend the budget, and re-adding a removed card gives it back", () => {
    const ops = [add(spare()), remove(spare())];
    expect(swapBudget(db, base, ops).used).toBe(0);
    expect(applySwaps(db, base, ops).cards).toEqual(base.cards);
    expect(swapBudget(db, base, [remove(FLASHLIGHT), add(FLASHLIGHT)]).used).toBe(0);
  });

  it("a third copy fails validation with the card named", () => {
    const deck = applySwaps(db, base, [add(MACHETE), add(MACHETE)]);
    expect(deck.cards[MACHETE]).toBe(3);
    const problem = validateDeck(db, deck).find((p) => p.reason?.key === "deck.copies");
    expect(problem).toMatchObject({ code: MACHETE, reason: { key: "deck.copies", vars: { card: MACHETE, n: 3, limit: 2 } } });
  });
});

describe("the basic weakness", () => {
  it("lists the loaded basic weaknesses", () => {
    expect(basicWeaknesses(db).map((c) => c.code)).toContain(PARANOIA);
  });

  it("a chosen weakness replaces the deck's, a random one is the flag with none listed", () => {
    const other = basicWeaknesses(db).find((c) => c.code !== PARANOIA)!.code;
    const chosen = applySwaps(db, base, [{ op: "weakness", code: other }]);
    expect(chosen.cards[other]).toBe(1);
    expect(chosen.cards[PARANOIA]).toBeUndefined();
    expect(chosen.randomBasicWeakness).toBe(false);
    expect(validateDeck(db, chosen)).toEqual([]);
    const random = applySwaps(db, base, [{ op: "weakness", code: null }]);
    expect(random.cards[PARANOIA]).toBeUndefined();
    expect(random.randomBasicWeakness).toBe(true);
    expect(validateDeck(db, random)).toEqual([]);
  });
});

describe("saved custom decks", () => {
  const input = () => ({ name: "Roland · test", investigator: ROLAND, base: base.id, ops: [{ op: "remove", code: FLASHLIGHT }, { op: "remove", code: FLASHLIGHT }, { op: "add", code: spare() }, { op: "add", code: spare() }] as DeckOp[] });

  it("round-trips through storage and is offered for its investigator only", () => {
    const store = memory();
    const saved = saveCustomDeck(db, store, input());
    expect(saved.id).toMatch(/^custom:/);
    expect(saved.problems).toEqual([]);
    const back = customDecks(db, ROLAND, store);
    expect(back.map((d) => [d.id, d.name])).toEqual([[saved.id, "Roland · test"]]);
    expect(back[0].deck.cards).toEqual(applySwaps(db, base, input().ops).cards);
    expect(back[0].deck.id).toBe(saved.id);
    expect(customDecks(db, "01002", store)).toEqual([]);
  });

  it("refuses to save an invalid deck", () => {
    const bad = { ...input(), ops: [{ op: "add", code: MACHETE }, { op: "add", code: MACHETE }] as DeckOp[] };
    expect(() => saveCustomDeck(db, memory(), bad)).toThrow(/invalid/i);
  });

  it("renames and deletes", () => {
    const store = memory();
    const a = saveCustomDeck(db, store, input());
    const b = saveCustomDeck(db, store, { ...input(), name: "Second" });
    renameCustomDeck(store, a.id, "Renamed");
    expect(customDecks(db, ROLAND, store).map((d) => d.name)).toEqual(["Renamed", "Second"]);
    deleteCustomDeck(store, b.id);
    expect(customDecks(db, ROLAND, store).map((d) => d.name)).toEqual(["Renamed"]);
  });

  it("a deck that no longer validates (a card's pack is gone) is returned with its reason", () => {
    const store = memory();
    const saved = saveCustomDeck(db, store, input());
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
