import { describe, expect, it } from "vitest";
import type { GameState } from "../types";
import { newWorld } from "../store";
import {
  aside,
  attacked,
  campaignNotes,
  costMod,
  damageBonus,
  defeated,
  dying,
  flagsForSnapshot,
  hunch,
  hunchRevealed,
  noAttack,
  noReady,
  peril,
  prevented,
  surge,
  xp,
} from "../flags";

const gameOf = () => ({ s: { flags: {}, world: newWorld() } as unknown as GameState });

describe("flag families", () => {
  it("keep the key formats saves and recordings already hold", () => {
    expect(noReady.key("c12")).toBe("noReady:c12");
    expect(attacked.key(["c3", "01001"])).toBe("attacked:c3:01001");
    expect(noAttack.key(["c3", "01001"])).toBe("noAttack:c3:01001");
    expect(prevented.key("atk:7")).toBe("prevented:atk:7");
    expect(aside.key("01002")).toBe("aside:01002");
    expect(defeated.key("01116")).toBe("defeated:01116");
    expect(xp.key("01001")).toBe("xp:01001");
  });

  it("get, set, clear and take one value, a family about an entity in its table", () => {
    const x = gameOf();
    expect(noReady.get(x, "c1")).toBeUndefined();
    noReady.set(x, "c1", true);
    expect(x.s.world.tables.noReady).toEqual({ c1: true });
    expect(x.s.flags).toEqual({});
    attacked.set(x, ["c3", "01001"], 2);
    expect(attacked.get(x, ["c3", "01001"])).toBe(2);
    expect(x.s.world.tables.attacked).toEqual({ "c3:01001": 2 });
    noReady.clear(x, "c1");
    expect(x.s.world.tables.noReady).not.toHaveProperty("c1");
    expect(noReady.get(x, "c1")).toBeUndefined();
    surge.set(x, "c2", true);
    expect(surge.take(x, "c2")).toBe(true);
    expect(surge.get(x, "c2")).toBeUndefined();
  });

  it("a family keyed by a card code or an event stays in the scenario's flags", () => {
    const x = gameOf();
    damageBonus.set(x, "k", 1);
    expect(x.s.flags).toEqual({ "damageBonus:k": 1 });
    expect(damageBonus.take(x, "k")).toBe(1);
    expect("damageBonus:k" in x.s.flags).toBe(false);
    defeated.set(x, "01116", true);
    prevented.set(x, "atk:7", [1, 0]);
    expect(Object.keys(x.s.flags)).toEqual(["defeated:01116", "prevented:atk:7"]);
  });

  it("add: a number family counts up from nothing", () => {
    const x = gameOf();
    expect(xp.add(x, "01001", -2)).toBe(-2);
    expect(x.s.world.tables.xp["01001"]).toBe(-2);
    expect(costMod.add(x, "c4", 1)).toBe(1);
    expect(costMod.add(x, "c4", 1)).toBe(2);
    expect(x.s.world.tables.costMod.c4).toBe(2);
  });

  it("each family about an entity has a table of its own", () => {
    const x = gameOf();
    dying.set(x, "c1", true);
    aside.set(x, "01002", ["c5"]);
    hunch.set(x, "01001", ["c6"]);
    hunchRevealed.set(x, "01001", "c6");
    noAttack.set(x, ["c3", "01001"], 4);
    const t = x.s.world.tables;
    expect([t.dying, t.aside, t.hunch, t.hunchRevealed, t.noAttack]).toEqual([
      { c1: true },
      { "01002": ["c5"] },
      { "01001": ["c6"] },
      { "01001": "c6" },
      { "c3:01001": 4 },
    ]);
  });
});

describe("flagsForSnapshot", () => {
  it("is the flags as they were before the families moved: every entry under its old key", () => {
    const x = gameOf();
    peril.set(x, true);
    defeated.set(x, "01116", true);
    noReady.set(x, "c1", true);
    xp.add(x, "01001", 3);
    attacked.set(x, ["c3", "01001"], 2);
    hunch.set(x, "01001", ["c6"]);
    expect(flagsForSnapshot(x.s)).toEqual({
      peril: true,
      "defeated:01116": true,
      "noReady:c1": true,
      "xp:01001": 3,
      "attacked:c3:01001": 2,
      "hunch:01001": ["c6"],
    });
  });

  it("leaves the state alone", () => {
    const x = gameOf();
    noReady.set(x, "c1", true);
    const before = JSON.stringify(x.s);
    flagsForSnapshot(x.s);
    expect(JSON.stringify(x.s)).toBe(before);
  });
});

describe("global flags", () => {
  it("one value under a fixed name", () => {
    const x = gameOf();
    peril.set(x, true);
    expect(x.s.flags.peril).toBe(true);
    expect(peril.get(x)).toBe(true);
    peril.clear(x);
    expect("peril" in x.s.flags).toBe(false);
  });
});

describe("campaignNotes", () => {
  it("reads the log and count entries a scenario leaves for the campaign log, in the order they were set", () => {
    const x = gameOf();
    x.s.flags = {
      "log:hidden:mark_of_elokoss": true,
      peril: true,
      "count::cultists": 2,
      "log:x:off": false,
      "xp:01001": 1,
    };
    expect(campaignNotes(x.s)).toEqual([
      { kind: "log", section: "hidden", id: "mark_of_elokoss", value: true },
      { kind: "count", section: "", id: "cultists", value: 2 },
    ]);
  });
});
