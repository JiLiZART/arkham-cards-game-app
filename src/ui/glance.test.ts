import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import type { CardDef } from "../content/schema";
import { chipsFor, GLANCE_OVERRIDES, type Chip } from "./glance";

const by = (name: string) =>
  Object.values(db.cards).find(
    (c) => c.pack === "core" && c.name === name && c.faction !== "mythos",
  )!;
const chips = (name: string) => chipsFor(by(name));
const c = (icon: string, n?: number, plus?: true): Chip => ({
  icon,
  ...(n !== undefined ? { n } : {}),
  ...(plus ? { plus } : {}),
});

describe("chipsFor", () => {
  it("a weapon: what it does, then its damage, then what it commits (Machete)", () => {
    expect(chips("Machete")).toEqual([c("combat"), c("damage", 1, true), c("combat", 1)]);
  });

  it("a skill card that adds damage (Vicious Blow)", () => {
    expect(chips("Vicious Blow")).toEqual([c("damage", 1, true), c("combat", 1)]);
  });

  it("a tool that investigates (Flashlight)", () => {
    expect(chips("Flashlight")).toEqual([c("intellect"), c("intellect", 1)]);
  });

  it("an event that gains resources (Emergency Cache) has no commit icons to add", () => {
    expect(chips("Emergency Cache")).toEqual([c("resource", 3)]);
  });

  it("a card the data can't read has an override (Dynamite Blast)", () => {
    expect(chips("Dynamite Blast")[0]).toEqual(c("damage", 3));
    expect(GLANCE_OVERRIDES[by("Dynamite Blast").code]).toBeDefined();
  });

  it("a skill card with only icons shows them merged by skill (Opportunist)", () => {
    expect(chips("Opportunist")).toEqual([c("wild", 1)]);
  });

  it("clues, cards and healing show their amounts", () => {
    expect(chips("Working a Hunch")).toEqual([c("clue", 1), c("intellect", 2)]);
    expect(chips("Pickpocketing")).toEqual([c("card", 1), c("agility", 1)]);
    expect(chips("Fearless")).toEqual([c("sanity", 1), c("willpower", 1)]);
  });

  it("a card with nothing to say has no badge (Cryptic Research)", () => {
    expect(chips("Cryptic Research")).toEqual([]);
  });

  it("a weakness shows the weakness icon alone", () => {
    expect(chips("Cover Up")).toEqual([c("weakness")]);
  });

  it("at most three chips: the effects win, the commit icons are cut", () => {
    const l = chips("Roland's .38 Special");
    expect(l).toHaveLength(3);
    expect(l.slice(0, 2)).toEqual([c("combat"), c("damage", 1, true)]);
    expect(chips(".45 Automatic")).toEqual([c("combat"), c("damage", 1, true), c("agility", 1)]);
  });

  it("reads a dozen more core cards by hand", () => {
    const cases: [string, Chip[]][] = [
      ["Beat Cop", [c("damage", 1), c("combat", 1)]],
      ["Guard Dog", [c("damage", 1), c("combat", 1)]],
      ["First Aid", [c("health", 1), c("sanity", 1), c("willpower", 1)]],
      ["Evidence!", [c("clue", 1), c("intellect", 2)]],
      ["Dodge", [c("willpower", 1), c("agility", 1)]],
      ["Magnifying Glass", [c("intellect", 1)]],
      ["Backstab", [c("agility"), c("damage", 2, true), c("combat", 1)]],
      ["Sneak Attack", [c("damage", 2), c("intellect", 1), c("combat", 1)]],
      ["Baseball Bat", [c("combat"), c("damage", 1, true), c("combat", 1)]],
      ["Hard Knocks", [c("combat", 1), c("agility", 1)]],
      ["Dr. Milan Christopher", [c("resource", 1), c("intellect", 1)]],
      ["Switchblade", [c("combat"), c("damage", 1, true), c("agility", 1)]],
    ];
    for (const [name, want] of cases) expect(chips(name), name).toEqual(want);
  });

  it("an override wins over the derivation", () => {
    const machete = by("Machete");
    expect(chipsFor(machete, { [machete.code]: [c("clue", 2)] })).toEqual([c("clue", 2)]);
  });

  it("never reads a cost as a gain, and an empty card is safe", () => {
    const bare = { ...by("Cryptic Research"), icons: {}, abilities: [] } as CardDef;
    expect(chipsFor(bare)).toEqual([]);
  });
});
