import { describe, expect, it } from "vitest";
import { db, mutate, skipMulligans, start } from "../engine/testkit";
import { cardDetails, placeDetails } from "./details";

const rows = (code: string, locale = "en") =>
  Object.fromEntries(cardDetails(db, code, locale).map((r) => [r.k, r]));

describe("cardDetails", () => {
  it("Machete: class and type, level 0, cost, traits, hand slot, combat icon, text", () => {
    const r = rows("01020");
    expect(r.name).toMatchObject({ name: "Machete" });
    expect(r.class).toEqual({ k: "class", faction: "guardian", label: "Guardian · Asset" });
    expect(r.level).toMatchObject({ xp: 0, label: "Level 0" });
    expect(r.cost).toEqual({ k: "cost", cost: "3" });
    expect(r.traits).toEqual({ k: "traits", s: "Item. Weapon. Melee." });
    expect(r.slots).toEqual({ k: "slots", slots: ["hand"] });
    expect(r.icons).toEqual({ k: "icons", icons: ["combat"] });
    expect(r.text.k).toBe("text");
    expect(r.stats).toBeUndefined();
  });

  it("a skill has no cost (—) and no slots", () => {
    const r = rows("01025");
    expect(r.cost).toEqual({ k: "cost", cost: "—" });
    expect(r.slots).toBeUndefined();
    expect(r.class).toMatchObject({ label: "Guardian · Skill" });
  });

  it("an ally shows health and sanity; a firearm its uses; Russian labels", () => {
    expect(rows("01018").stats).toEqual({ k: "stats", health: 2, sanity: 2 });
    expect(rows("01016").uses).toEqual({ k: "uses", n: 4, label: "ammo" });
    expect(rows("01020", "ru").class).toMatchObject({ label: "Защитник · Карта поддержки" });
  });
});

describe("enemy details", () => {
  it("Ghoul Minion: fight, health, evade, attack and the damage on it", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    let id = "";
    r = mutate(r, (g) => {
      const ghoul = Object.values(g.s.cards).find((c) => c.code === "01160")!;
      Object.assign(ghoul, { zone: "enemy", damage: 1 });
      id = ghoul.id;
    });
    const inst = r.state.cards[id];
    const got = Object.fromEntries(
      cardDetails(db, "01160", "en", { inst, game: r.state }).map((x) => [x.k, x]),
    );
    expect(got.enemy).toMatchObject({
      fight: 2,
      health: 2,
      evade: 2,
      perInv: false,
      labels: { fight: "Fight" },
    });
    expect(got.attack).toEqual({ k: "attack", damage: 1, horror: 1, label: "Attack" });
    expect(got.wounds).toEqual({ k: "wounds", n: 1, label: "Damage on it" });
    expect(rows("01160").wounds).toBeUndefined();
    expect(rows("01160", "ru").enemy).toMatchObject({ labels: { evade: "Уклонение" } });
  });
});

describe("placeDetails", () => {
  const card = { x0: 500, y0: 300, x1: 980, y1: 880 };
  it("goes right of the card, top-aligned", () => {
    expect(placeDetails(card, 280, 400, 1600, 900)).toEqual({ x: 992, y: 300 });
  });
  it("falls back to the left near the right edge", () => {
    expect(placeDetails({ x0: 1100, y0: 300, x1: 1580, y1: 880 }, 280, 400, 1600, 900)).toEqual({
      x: 808,
      y: 300,
    });
  });
  it("can prefer the left (the rightmost showcased card), and still falls back to the right", () => {
    expect(placeDetails(card, 280, 400, 1600, 900, "left")).toEqual({ x: 208, y: 300 });
    expect(
      placeDetails({ x0: 100, y0: 300, x1: 300, y1: 880 }, 280, 400, 1600, 900, "left"),
    ).toEqual({ x: 312, y: 300 });
  });
  it("is clamped vertically to the window", () => {
    expect(placeDetails(card, 280, 700, 1600, 900).y).toBe(192);
    expect(placeDetails({ ...card, y0: -20 }, 280, 300, 1600, 900).y).toBe(8);
  });
});

describe("cardDetails for map locations", () => {
  // The Gathering after the first act: Study gone, the Hallway and its neighbours in play
  const r = mutate(skipMulligans(start("the-gathering", ["01001", "01002"], 1)), (g) => {
    for (const c of Object.values(g.s.cards))
      if (["01112", "01113", "01114", "01115"].includes(c.code)) c.zone = "location";
    const hall = Object.values(g.s.cards).find((c) => c.code === "01112")!;
    hall.revealed = true;
    hall.clues = 1;
    Object.values(g.s.cards).find((c) => c.code === "01113")!.revealed = true;
    g.s.invs["01001"].location = hall.id;
  });
  const at = (code: string) => ({
    inst: Object.values(r.state.cards).find((c) => c.code === code)!,
    game: r.state,
  });
  const loc = (code: string, locale = "en") =>
    Object.fromEntries(cardDetails(db, code, locale, at(code)).map((x) => [x.k, x]));

  it("revealed Hallway: shroud, clues now and printed, connections, who is here", () => {
    const h = loc("01112");
    expect(h.name).toMatchObject({ name: "Hallway" });
    expect(h.shroud).toMatchObject({ n: 1, skill: undefined, label: "Shroud" });
    expect(h.clues).toMatchObject({ now: 1, printed: 0, perInv: false });
    expect((h.connections as { names: string[] }).names.sort()).toEqual([
      "Attic",
      "Cellar",
      "Parlor",
    ]);
    expect(h.here).toMatchObject({ invs: ["01001"], enemies: [] });
    expect(h.victory).toBeUndefined();
    expect(h.class).toBeUndefined();
  });

  it("unrevealed Cellar: only its back (name and text)", () => {
    const keys = cardDetails(db, "01114", "en", at("01114")).map((x) => x.k);
    expect(keys.filter((k) => k !== "text")).toEqual(["name"]);
  });

  it("Attic: victory and per-investigator clues; Russian labels", () => {
    expect(loc("01113").victory).toMatchObject({ label: "Victory 1" });
    expect(loc("01113").clues).toMatchObject({
      printed: 2,
      perInv: true,
      perInvLabel: "per investigator",
    });
    expect(loc("01113", "ru").shroud).toMatchObject({ label: "Завеса" });
  });
});
