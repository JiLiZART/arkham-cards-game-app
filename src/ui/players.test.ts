import { describe, expect, it } from "vitest";
import { createCard, type G } from "../engine/core";
import { run } from "../engine/engine";
import { commitDone, db, giveCard, locId, mutate, pick, putEnemy, skipMulligans, start } from "../engine/testkit";
import type { GameState } from "../engine/types";
import { barAsk, barModel, canAct, choicesOffered, investigatorOptions, landingView, shownInv } from "./players";

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

  it("Daisy's own treachery test during Roland's turn: no hand-off signal, the table goes to her", () => {
    const { state } = turn();
    const s = structuredClone(state);
    const g: G = { s, db, events: [] };
    const guts = Object.keys(db.cards).find((c) => db.cards[c].name === "Guts")!;
    giveCard(g, DAISY, guts);
    // Rotting Remains (willpower 3) revealed for Daisy while Roland is the active investigator
    const rr = createCard(g, "01163", "limbo", null);
    const step = s.pending!.step;
    s.pending = null;
    s.queue.push({ ...step, choice: undefined }, { t: "Revelation", inv: DAISY, card: rr });
    run(g);
    expect(s.active).toBe(ROLAND);
    expect(s.pending).toMatchObject({ inv: DAISY, kind: "commit" });
    expect(canAct(s)).toBeNull();
    expect(landingView(s)).toBeNull();
    expect(choicesOffered(s, none)).toBe(true);
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
    // Daisy helping Roland's test
    const daisy = { ...state, skillTest: { inv: ROLAND }, pending: { ...state.pending!, inv: DAISY, kind: "commit" } } as unknown as GameState;
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

describe("investigatorOptions", () => {
  const card = (state: GameState, inv: string) => state.invs[inv].cardId;
  const withOptions = (state: GameState, inv: string, options: { id: string; card?: string }[]) =>
    ({ ...state, pending: { ...state.pending!, inv, kind: "generic", options: options.map((o) => ({ ...o, label: o.id, value: o.id })) } }) as GameState;

  it("choosing among investigators: each is answered by tapping its avatar", () => {
    const { state } = turn();
    const s = withOptions(state, ROLAND, [{ id: ROLAND, card: card(state, ROLAND) }, { id: DAISY, card: card(state, DAISY) }]);
    const o = investigatorOptions(s);
    expect([...o.answers.keys()]).toEqual([ROLAND, DAISY]);
    expect(o.answers.get(DAISY)?.id).toBe(DAISY);
    expect(o.abilities).toEqual([]);
  });

  it("the decider's own investigator card alone (an ability like Roland's reaction) belongs in the sheet", () => {
    const { state } = turn();
    const s = withOptions(state, ROLAND, [{ id: "r", card: card(state, ROLAND) }, { id: "pass" }]);
    const o = investigatorOptions(s);
    expect(o.answers.size).toBe(0);
    expect(o.abilities.map((x) => x.id)).toEqual(["r"]);
  });

  it("another investigator's card, even alone, is a target to tap", () => {
    const { state } = turn();
    const o = investigatorOptions(withOptions(state, ROLAND, [{ id: DAISY, card: card(state, DAISY) }]));
    expect([...o.answers.keys()]).toEqual([DAISY]);
  });

  it("no investigator cards: nothing for the avatars", () => {
    const { state } = turn();
    const o = investigatorOptions(withOptions(state, ROLAND, [{ id: "pass" }]));
    expect(o.answers.size + o.abilities.length).toBe(0);
  });
});

describe("barAsk", () => {
  const helping = (state: GameState) => ({ ...state, skillTest: { inv: ROLAND }, pending: { ...state.pending!, inv: DAISY, kind: "commit" } }) as unknown as GameState;

  it("the decider's own table: their choice, with its buttons", () => {
    expect(barAsk(turn().state, none)).toEqual({ kind: "choice", buttons: true });
  });

  it("looking at a teammate during your own decision: the instruction stays, its buttons wait", () => {
    expect(barAsk(turn().state, { viewing: DAISY })).toEqual({ kind: "choice", buttons: false });
  });

  it("someone else can act and their table is not on screen: who, and the switch to them", () => {
    expect(barAsk(helping(turn().state), { viewing: ROLAND })).toEqual({ kind: "handoff", inv: DAISY, key: "players.canCommit" });
  });

  it("once their table is on screen, it is their choice", () => {
    expect(barAsk(helping(turn().state), none)).toEqual({ kind: "choice", buttons: true });
  });
});
