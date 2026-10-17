import { describe, expect, it } from "vitest";
import { commitDone, giveCard, locId, mutate, pick, putEnemy, skipMulligans, start } from "../engine/testkit";
import type { GameState } from "../engine/types";
import { barModel, canAct, choicesOffered, landingView, shownInv } from "./players";

const ROLAND = "01001";
const DAISY = "01002";
const SKIDS = "01003";
const AGNES = "01004";

/** Roland's turn in a two-player game (Roland first) */
const turn = (invs = [ROLAND, DAISY]) => {
  let r = skipMulligans(start("the-gathering", invs, 1, { chaosBag: ["0"] as never }));
  if (r.state.pending?.options.some((o) => o.label === "Roland Banks")) r = pick(r, "Roland Banks");
  return r;
};
const none = { viewing: null };

describe("shownInv and choicesOffered", () => {
  it("the deciding investigator's table is shown by default, with the choices", () => {
    const { state } = turn();
    expect(shownInv(state, none)).toBe(ROLAND);
    expect(choicesOffered(state, none)).toBe(true);
  });

  it("looking at Daisy during Roland's turn shows her table and offers no choices", () => {
    const { state } = turn();
    const look = { viewing: DAISY };
    expect(shownInv(state, look)).toBe(DAISY);
    expect(choicesOffered(state, look)).toBe(false);
    expect(choicesOffered(state, { viewing: ROLAND })).toBe(true);
  });

  it("looking at an investigator that isn't in the game is ignored", () => {
    expect(shownInv(turn().state, { viewing: "99999" })).toBe(ROLAND);
  });
});

describe("canAct", () => {
  const withPending = (state: GameState, inv: string, kind: string) => ({ ...state, pending: { ...state.pending!, inv, kind } }) as GameState;

  it("nothing on the active investigator's own turn or own commit window", () => {
    const { state } = turn();
    expect(canAct(state)).toBeNull();
    expect(canAct(withPending(state, ROLAND, "commit"))).toBeNull();
  });

  it("a commit window for Daisy during Roland's test: Daisy can commit", () => {
    let r = turn();
    r = mutate(r, (g) => {
      giveCard(g, ROLAND, "01025");
      giveCard(g, DAISY, "01093");
      putEnemy(g, "01160", locId(g, "01111"), ROLAND);
    });
    r = pick(r, /^Fight Ghoul Minion/);
    expect(canAct(r.state)).toBeNull();
    r = commitDone(r);
    expect(r.state.pending).toMatchObject({ inv: DAISY, kind: "commit" });
    expect(canAct(r.state)).toEqual({ inv: DAISY, key: "players.canCommit" });
  });

  it("a reaction for someone other than the active investigator: they may react", () => {
    const { state } = turn();
    expect(canAct(withPending(state, DAISY, "reaction"))).toEqual({ inv: DAISY, key: "players.mayReact" });
  });

  it("other kinds of choice, and choices with nobody's turn, don't signal", () => {
    const { state } = turn();
    expect(canAct(withPending(state, DAISY, "generic"))).toBeNull();
    expect(canAct({ ...withPending(state, DAISY, "reaction"), active: null } as GameState)).toBeNull();
  });
});

describe("landingView", () => {
  it("when the decision passes: the active investigator's table while another can act, else the decider's", () => {
    const { state } = turn();
    const daisyReacts = { ...state, pending: { ...state.pending!, inv: DAISY, kind: "reaction" } } as GameState;
    expect(landingView(daisyReacts)).toBe(ROLAND);
    expect(landingView(state)).toBeNull();
  });
});

describe("barModel", () => {
  it("every investigator in turn order with counts, the active one flagged, three pips for the active turn", () => {
    const { state } = turn();
    const bar = barModel(state, none);
    expect(bar.map((a) => a.inv)).toEqual([ROLAND, DAISY]);
    expect(bar[0]).toMatchObject({ health: 9, sanity: 5, active: true, shown: true, grey: false, pips: 3, filled: 3 });
    expect(bar[1]).toMatchObject({ active: false, shown: false });
  });

  it("marks the viewed investigator, not the active one, as shown", () => {
    const bar = barModel(turn().state, { viewing: DAISY });
    expect(bar.map((a) => [a.inv, a.active, a.shown])).toEqual([[ROLAND, true, false], [DAISY, false, true]]);
  });

  it("flags the investigator who can act", () => {
    const { state } = turn();
    const daisy = { ...state, pending: { ...state.pending!, inv: DAISY, kind: "commit" } } as GameState;
    expect(barModel(daisy, { viewing: ROLAND }).map((a) => a.canAct)).toEqual([null, "players.canCommit"]);
  });

  it("four players with one defeated: all four stay, the defeated one is grey with no pips", () => {
    const { state } = turn([ROLAND, DAISY, SKIDS, AGNES]);
    const s = structuredClone(state);
    s.invs[SKIDS].status = "defeated" as never;
    const bar = barModel(s, none);
    expect(bar.map((a) => a.inv)).toEqual(s.order);
    expect(bar.find((a) => a.inv === SKIDS)).toMatchObject({ grey: true, pips: 0, filled: 0 });
    expect(bar.filter((a) => !a.grey)).toHaveLength(3);
  });
});
