import { describe, expect, it } from "vitest";
import { cardCopyOf } from "../core";
import { skipMulligans, start } from "../testkit";
import { snapshotOf } from "./snapshot";

const state = () => skipMulligans(start("the-gathering", ["01001", "01002"], 1)).state;

describe("snapshotOf", () => {
  it("lists every card in creation order with every one of its fields", () => {
    const s = state();
    const snap = snapshotOf(s);
    expect(snap.cards.map((c) => c.id)).toEqual(s.world.entities);
    expect(Object.keys(snap.cards[0])).toEqual(Object.keys(cardCopyOf(s, snap.cards[0].id)));
    expect(snap.cards[3]).toEqual(cardCopyOf(s, snap.cards[3].id));
    expect(snap.cards[3]).toHaveProperty("zone");
  });

  it("lists every investigator in turn order with every field but its piles", () => {
    const s = state();
    const snap = snapshotOf(s);
    expect(snap.investigators.map((i) => i.id)).toEqual(s.order);
    expect(snap.investigators[0]).toEqual(s.world.tables.investigator["01001"]);
    expect("deck" in snap.investigators[0]).toBe(false);
  });

  it("lists the piles by name, in order, leaving out the empty ones", () => {
    const s = state();
    const snap = snapshotOf(s);
    expect(snap.piles["deck:01001"]).toEqual(s.world.piles["deck:01001"]);
    expect(snap.piles["hand:01002"]).toEqual(s.world.piles["hand:01002"]);
    expect(snap.piles.encounterDeck).toEqual(s.world.piles.encounterDeck);
    for (const pile of Object.values(snap.piles)) expect(pile.length).toBeGreaterThan(0);
    expect(snap.piles).toEqual(
      Object.fromEntries(Object.entries(s.world.piles).filter(([, p]) => p?.length)),
    );
  });

  it("holds the scenario's own state: all of the state's other fields, the engine version aside", () => {
    const s = state();
    const snap = snapshotOf(s);
    const stored = new Set(["world", "version"]);
    const rest = Object.keys(s)
      .filter((k) => !stored.has(k))
      .sort();
    expect(Object.keys(snap.scenario).sort()).toEqual(rest);
    expect(snap.scenario.round).toBe(s.round);
    expect(snap.scenario.pending).toEqual(s.pending);
  });

  it("is plain JSON: a copy through JSON is equal, and the state is untouched", () => {
    const s = state();
    const before = JSON.stringify(s);
    const snap = snapshotOf(s);
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    expect(JSON.stringify(s)).toBe(before);
  });
});
