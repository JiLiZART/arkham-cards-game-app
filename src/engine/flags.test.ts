import { describe, expect, it } from "vitest";
import type { GameState } from "./types";
import {
  aside,
  attacked,
  campaignNotes,
  connections,
  damageBonus,
  defeated,
  noAttack,
  noReady,
  peril,
  prevented,
  xp,
} from "./flags";

const g = () => ({ s: { flags: {} } as unknown as GameState });

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

  it("get, set, clear and take one value under its key", () => {
    const x = g();
    expect(noReady.get(x, "c1")).toBeUndefined();
    noReady.set(x, "c1", true);
    expect(x.s.flags).toEqual({ "noReady:c1": true });
    attacked.set(x, ["c3", "01001"], 2);
    expect(attacked.get(x, ["c3", "01001"])).toBe(2);
    noReady.clear(x, "c1");
    expect("noReady:c1" in x.s.flags).toBe(false);
    damageBonus.set(x, "k", 1);
    expect(damageBonus.take(x, "k")).toBe(1);
    expect("damageBonus:k" in x.s.flags).toBe(false);
  });

  it("add: a number family counts up from nothing", () => {
    const x = g();
    expect(xp.add(x, "01001", -2)).toBe(-2);
    expect(x.s.flags["xp:01001"]).toBe(-2);
  });
});

describe("global flags", () => {
  it("one value under a fixed name", () => {
    const x = g();
    peril.set(x, true);
    expect(x.s.flags.peril).toBe(true);
    expect(peril.get(x)).toBe(true);
    peril.clear(x);
    expect("peril" in x.s.flags).toBe(false);
    expect(connections.get(x)).toBeUndefined();
  });
});

describe("campaignNotes", () => {
  it("reads the log and count entries a scenario leaves for the campaign log, in the order they were set", () => {
    const x = g();
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
