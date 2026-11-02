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
  type GameContext,
} from "../context";
import { findByCode } from "../queries";
import { gOf, putEnemy, skipMulligans, start } from "../kits/testkit";
import { cardRecIn, invStateIn, pileRecIn } from "../world/store";
import { ZONE, INV_STATUS, PILE } from "../world/constants";

const R = "01001";
const D = "01002";
const fresh = (): GameContext => gOf(skipMulligans(start("the-gathering", [R, D], 1)));
const study = (game: GameContext) => findByCode(game, "01111", [ZONE.Location])!.id;

describe("card field setters", () => {
  it("exhaust and ready, reveal, location, control, ownership, code", () => {
    const game = fresh();
    const e = putEnemy(game, "01160", study(game));
    exhaust(game, e);
    expect(cardRecIn(game.s, e).exhausted).toBe(true);
    ready(game, e);
    expect(cardRecIn(game.s, e).exhausted).toBe(false);
    const loc = findByCode(game, "01112", [ZONE.Location, ZONE.SetAside])!.id;
    setCardLocation(game, e, loc);
    expect(cardRecIn(game.s, e).location).toBe(loc);
    reveal(game, loc);
    expect(cardRecIn(game.s, loc).revealed).toBe(true);
    setController(game, e, R);
    setOwner(game, e, D);
    expect(cardRecIn(game.s, e)).toMatchObject({ controller: R, owner: D });
    setController(game, e, null);
    expect(cardRecIn(game.s, e).controller).toBeNull();
    setCode(game, e, "01159");
    expect(cardRecIn(game.s, e).code).toBe("01159");
    attachTo(game, e, loc);
    expect(cardRecIn(game.s, e).attachedTo).toBe(loc);
  });
});

describe("investigator setters", () => {
  it("counters reach the action, trauma and defeated-health counts, and none of doom and uses", () => {
    const game = fresh();
    addCounter(game, R, "actionsLeft", 3);
    addCounter(game, R, "actionsTaken", 1);
    addCounter(game, R, "physicalTrauma", 1);
    addCounter(game, R, "mentalTrauma", 2);
    addCounter(game, R, "defeatedHealth", 4);
    expect(invStateIn(game.s, R)).toMatchObject({
      actionsLeft: 3,
      actionsTaken: 1,
      physicalTrauma: 1,
      mentalTrauma: 2,
      defeatedHealth: 4,
    });
    expect(() => counter(game, study(game), "actionsLeft")).toThrow(/actionsLeft/);
  });

  it("begin a turn's actions, grant and spend restricted ones, note an action, clear the round and the turn's marks", () => {
    const game = fresh();
    beginActions(game, R, 3, [{ trait: "Tome", left: 1 }]);
    expect(invStateIn(game.s, R)).toMatchObject({ actionsLeft: 3, actionsTaken: 0 });
    grantRestricted(game, R, { designator: "fight", left: 2 });
    expect(inv(game, R).restrictedActions).toHaveLength(2);
    spendRestricted(game, R, 1, 2);
    expect(inv(game, R).restrictedActions[1].left).toBe(0);
    noteAction(game, R, "fight");
    expect(invStateIn(game.s, R)).toMatchObject({ actionsTaken: 1, actionsThisRound: ["fight"] });
    clearRoundActions(game);
    expect(invStateIn(game.s, R).actionsThisRound).toEqual([]);
    setTurnDone(game, R, true);
    expect(invStateIn(game.s, R).turnDone).toBe(true);
    clearTurnDone(game);
    expect(invStateIn(game.s, R).turnDone).toBe(false);
  });

  it("status, with how it was defeated", () => {
    const game = fresh();
    setStatus(game, R, INV_STATUS.Defeated, "damage");
    expect(invStateIn(game.s, R)).toMatchObject({ status: "defeated", defeatedBy: "damage" });
    setStatus(game, D, INV_STATUS.Resigned);
    expect(invStateIn(game.s, D).status).toBe("resigned");
    expect(invStateIn(game.s, D).defeatedBy).toBeUndefined();
  });
});

describe("arrangeOnTop", () => {
  it("puts the chosen cards on top in order and keeps the rest below, for a deck and the encounter deck", () => {
    const game = fresh();
    const deck = [...inv(game, R).deck];
    arrangeOnTop(game, R, [deck[4], deck[2]]);
    expect(inv(game, R).deck.slice(0, 3)).toEqual([deck[4], deck[2], deck[0]]);
    expect(inv(game, R).deck).toHaveLength(deck.length);
    const enc = [...pileRecIn(game.s, PILE.EncounterDeck)];
    arrangeOnTop(game, "encounter", [enc[3]]);
    expect(pileRecIn(game.s, PILE.EncounterDeck)[0]).toBe(enc[3]);
    expect(pileRecIn(game.s, PILE.EncounterDeck)).toHaveLength(enc.length);
  });
});
