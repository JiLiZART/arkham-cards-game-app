import { describe, expect, it } from "vitest";
import {
  addCounter,
  arrangeOnTop,
  attachTo,
  beginActions,
  clearRoundActions,
  clearTurnDone,
  counter,
  exhaust,
  findByCode,
  grantRestricted,
  inv,
  noteAction,
  ready,
  reveal,
  setCardLocation,
  setCode,
  setController,
  setOwner,
  setStatus,
  setTurnDone,
  spendRestricted,
  type G,
} from "./core";
import { gOf, putEnemy, skipMulligans, start } from "./testkit";
import { cardRecIn, invStateIn, pileRecIn } from "./records";

const R = "01001";
const D = "01002";
const fresh = (): G => gOf(skipMulligans(start("the-gathering", [R, D], 1)));
const study = (g: G) => findByCode(g, "01111", ["location"])!.id;

describe("card field setters", () => {
  it("exhaust and ready, reveal, location, control, ownership, code", () => {
    const g = fresh();
    const e = putEnemy(g, "01160", study(g));
    exhaust(g, e);
    expect(cardRecIn(g.s, e).exhausted).toBe(true);
    ready(g, e);
    expect(cardRecIn(g.s, e).exhausted).toBe(false);
    const loc = findByCode(g, "01112", ["location", "setAside"])!.id;
    setCardLocation(g, e, loc);
    expect(cardRecIn(g.s, e).location).toBe(loc);
    reveal(g, loc);
    expect(cardRecIn(g.s, loc).revealed).toBe(true);
    setController(g, e, R);
    setOwner(g, e, D);
    expect(cardRecIn(g.s, e)).toMatchObject({ controller: R, owner: D });
    setController(g, e, null);
    expect(cardRecIn(g.s, e).controller).toBeNull();
    setCode(g, e, "01159");
    expect(cardRecIn(g.s, e).code).toBe("01159");
    attachTo(g, e, loc);
    expect(cardRecIn(g.s, e).attachedTo).toBe(loc);
  });
});

describe("investigator setters", () => {
  it("counters reach the action, trauma and defeated-health counts, and none of doom and uses", () => {
    const g = fresh();
    addCounter(g, R, "actionsLeft", 3);
    addCounter(g, R, "actionsTaken", 1);
    addCounter(g, R, "physicalTrauma", 1);
    addCounter(g, R, "mentalTrauma", 2);
    addCounter(g, R, "defeatedHealth", 4);
    expect(invStateIn(g.s, R)).toMatchObject({
      actionsLeft: 3,
      actionsTaken: 1,
      physicalTrauma: 1,
      mentalTrauma: 2,
      defeatedHealth: 4,
    });
    expect(() => counter(g, study(g), "actionsLeft")).toThrow(/actionsLeft/);
  });

  it("begin a turn's actions, grant and spend restricted ones, note an action, clear the round and the turn's marks", () => {
    const g = fresh();
    beginActions(g, R, 3, [{ trait: "Tome", left: 1 }]);
    expect(invStateIn(g.s, R)).toMatchObject({ actionsLeft: 3, actionsTaken: 0 });
    grantRestricted(g, R, { designator: "fight", left: 2 });
    expect(inv(g, R).restrictedActions).toHaveLength(2);
    spendRestricted(g, R, 1, 2);
    expect(inv(g, R).restrictedActions[1].left).toBe(0);
    noteAction(g, R, "fight");
    expect(invStateIn(g.s, R)).toMatchObject({ actionsTaken: 1, actionsThisRound: ["fight"] });
    clearRoundActions(g);
    expect(invStateIn(g.s, R).actionsThisRound).toEqual([]);
    setTurnDone(g, R, true);
    expect(invStateIn(g.s, R).turnDone).toBe(true);
    clearTurnDone(g);
    expect(invStateIn(g.s, R).turnDone).toBe(false);
  });

  it("status, with how it was defeated", () => {
    const g = fresh();
    setStatus(g, R, "defeated", "damage");
    expect(invStateIn(g.s, R)).toMatchObject({ status: "defeated", defeatedBy: "damage" });
    setStatus(g, D, "resigned");
    expect(invStateIn(g.s, D).status).toBe("resigned");
    expect(invStateIn(g.s, D).defeatedBy).toBeUndefined();
  });
});

describe("arrangeOnTop", () => {
  it("puts the chosen cards on top in order and keeps the rest below, for a deck and the encounter deck", () => {
    const g = fresh();
    const deck = [...inv(g, R).deck];
    arrangeOnTop(g, R, [deck[4], deck[2]]);
    expect(inv(g, R).deck.slice(0, 3)).toEqual([deck[4], deck[2], deck[0]]);
    expect(inv(g, R).deck).toHaveLength(deck.length);
    const enc = [...pileRecIn(g.s, "encounterDeck")];
    arrangeOnTop(g, "encounter", [enc[3]]);
    expect(pileRecIn(g.s, "encounterDeck")[0]).toBe(enc[3]);
    expect(pileRecIn(g.s, "encounterDeck")).toHaveLength(enc.length);
  });
});
