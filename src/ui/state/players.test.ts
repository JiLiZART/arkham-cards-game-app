import { describe, expect, it, vi } from "vitest";
import { createCard, type G } from "../../engine/core";
import { run } from "../../engine/engine";
import {
  commitDone,
  db,
  giveCard,
  locId,
  mutate,
  pick,
  putEnemy,
  skipMulligans,
  start,
} from "../../engine/testkit";
import type { GameState } from "../../engine/types";
import {
  abilityOptionsOf,
  autoSwitchTarget,
  barAsk,
  deckOptions,
  HOVER_SHEET_MS,
  sheetFor,
  barModel,
  canAct,
  choicesOffered,
  delayed,
  handFaceUp,
  investigatorChoice,
  investigatorOptions,
  landingView,
  ownDecisionTitle,
  shownInv,
} from "./players";

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
  const withPending = (state: GameState, inv: string, kind: string) =>
    ({ ...state, pending: { ...state.pending!, inv, kind } }) as GameState;

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
    expect(canAct(withPending(state, DAISY, "reaction"))).toEqual({
      inv: DAISY,
      key: "players.mayReact",
    });
  });

  it("other kinds of choice, and choices with nobody's turn, don't signal", () => {
    const { state } = turn();
    expect(canAct(withPending(state, DAISY, "generic"))).toBeNull();
    expect(
      canAct({ ...withPending(state, DAISY, "reaction"), active: null } as GameState),
    ).toBeNull();
  });
});

describe("landingView", () => {
  it("when the decision passes: the active investigator's table while another can act, else the decider's", () => {
    const { state } = turn();
    const daisyReacts = {
      ...state,
      pending: { ...state.pending!, inv: DAISY, kind: "reaction" },
    } as GameState;
    expect(landingView(daisyReacts)).toBe(ROLAND);
    expect(landingView(state)).toBeNull();
  });
});

describe("barModel", () => {
  it("every investigator in turn order with counts, the active one flagged, three pips for the active turn", () => {
    const { state } = turn();
    const bar = barModel(state, none);
    expect(bar.map((a) => a.inv)).toEqual([ROLAND, DAISY]);
    expect(bar[0]).toMatchObject({
      health: 9,
      sanity: 5,
      active: true,
      shown: true,
      grey: false,
      pips: 3,
      filled: 3,
    });
    expect(bar[1]).toMatchObject({ active: false, shown: false });
  });

  it("marks the viewed investigator, not the active one, as shown", () => {
    const bar = barModel(turn().state, { viewing: DAISY });
    expect(bar.map((a) => [a.inv, a.active, a.shown])).toEqual([
      [ROLAND, true, false],
      [DAISY, false, true],
    ]);
  });

  it("flags the investigator who can act", () => {
    const { state } = turn();
    // Daisy helping Roland's test
    const daisy = {
      ...state,
      skillTest: { inv: ROLAND },
      pending: { ...state.pending!, inv: DAISY, kind: "commit" },
    } as unknown as GameState;
    expect(barModel(daisy, { viewing: ROLAND }).map((a) => a.canAct)).toEqual([
      null,
      "players.canCommit",
    ]);
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
    ({
      ...state,
      pending: {
        ...state.pending!,
        inv,
        kind: "generic",
        options: options.map((o) => ({ ...o, label: o.id, value: o.id })),
      },
    }) as GameState;

  it("choosing among investigators: each is answered by tapping its avatar", () => {
    const { state } = turn();
    const s = withOptions(state, ROLAND, [
      { id: ROLAND, card: card(state, ROLAND) },
      { id: DAISY, card: card(state, DAISY) },
    ]);
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
    const o = investigatorOptions(
      withOptions(state, ROLAND, [{ id: DAISY, card: card(state, DAISY) }]),
    );
    expect([...o.answers.keys()]).toEqual([DAISY]);
  });

  it("no investigator cards: nothing for the avatars", () => {
    const { state } = turn();
    const o = investigatorOptions(withOptions(state, ROLAND, [{ id: "pass" }]));
    expect(o.answers.size + o.abilities.length).toBe(0);
  });
});

describe("abilityOptionsOf", () => {
  const withOptions = (state: GameState, options: { id: string; card?: string }[]) =>
    ({
      ...state,
      pending: {
        ...state.pending!,
        inv: ROLAND,
        kind: "reaction",
        options: options.map((o) => ({ ...o, label: o.id, value: o.id })),
      },
    }) as GameState;
  const cardOf = (state: GameState, i: string) => state.invs[i].cardId;

  it("the investigator's own ability on their card is offered on their stat bar, and a pass is not", () => {
    const { state } = turn();
    const s = withOptions(state, [{ id: "r", card: cardOf(state, ROLAND) }, { id: "pass" }]);
    expect(abilityOptionsOf(s, ROLAND).map((o) => o.id)).toEqual(["r"]);
    expect(abilityOptionsOf(s, DAISY)).toEqual([]);
  });

  it("answers among investigators stay on the avatars: none for the stat bar", () => {
    const { state } = turn();
    const s = withOptions(state, [
      { id: ROLAND, card: cardOf(state, ROLAND) },
      { id: DAISY, card: cardOf(state, DAISY) },
    ]);
    expect(abilityOptionsOf(s, ROLAND)).toEqual([]);
    expect(abilityOptionsOf(s, DAISY)).toEqual([]);
  });

  it("nothing pending, nothing offered", () => {
    expect(abilityOptionsOf({ ...turn().state, pending: null } as GameState, ROLAND)).toEqual([]);
  });
});

describe("seats in an online room", () => {
  const theirs = { viewing: null, mySeats: [DAISY] };
  const mine = { viewing: null, mySeats: [ROLAND] };

  it("offers the choices only on the browser that holds the deciding seat", () => {
    const { state } = turn();
    expect(choicesOffered(state, mine)).toBe(true);
    expect(choicesOffered(state, theirs)).toBe(false);
  });

  it("offers nothing to a spectator", () => {
    expect(choicesOffered(turn().state, { viewing: null, mySeats: [] })).toBe(false);
  });

  it("a browser stays on its own seat while another's investigator decides", () => {
    expect(shownInv(turn().state, theirs)).toBe(DAISY);
    expect(shownInv(turn().state, mine)).toBe(ROLAND);
  });

  it("a spectator is shown the board: no investigator's table", () => {
    expect(shownInv(turn().state, { viewing: null, mySeats: [] })).toBeNull();
  });

  it("what a browser chose to look at stays, held seat or not", () => {
    expect(shownInv(turn().state, { viewing: ROLAND, mySeats: [DAISY] })).toBe(ROLAND);
  });

  it("the deciding table is shown without a room", () => {
    expect(shownInv(turn().state, { viewing: null, mySeats: null })).toBe(ROLAND);
  });

  it("hands are face up only on the seats this browser holds", () => {
    expect(handFaceUp(mine, ROLAND)).toBe(true);
    expect(handFaceUp(mine, DAISY)).toBe(false);
    expect(handFaceUp({ viewing: null, mySeats: [] }, ROLAND)).toBe(false);
    expect(handFaceUp(none, DAISY)).toBe(true);
  });

  it("every seat is held when there is no room", () => {
    expect(choicesOffered(turn().state, { viewing: null, mySeats: null })).toBe(true);
    expect(choicesOffered(turn().state, none)).toBe(true);
  });

  it("the bar says who it waits for when the decider sits elsewhere", () => {
    expect(barAsk(turn().state, theirs)).toEqual({ kind: "waiting", inv: ROLAND });
    expect(barAsk(turn().state, { viewing: ROLAND, mySeats: [] })).toEqual({
      kind: "waiting",
      inv: ROLAND,
    });
  });

  it("the bar offers the choice when the decider sits here", () => {
    expect(barAsk(turn().state, mine)).toEqual({ kind: "choice", buttons: true });
  });

  it("someone else can act and sits here: the hand-off is offered", () => {
    const helping = {
      ...turn().state,
      skillTest: { inv: ROLAND },
      pending: { ...turn().state.pending!, inv: DAISY, kind: "commit" },
    } as unknown as GameState;
    expect(barAsk(helping, { viewing: ROLAND, mySeats: [DAISY] })).toEqual({
      kind: "handoff",
      inv: DAISY,
      key: "players.canCommit",
    });
    expect(barAsk(helping, { viewing: ROLAND, mySeats: [ROLAND] })).toEqual({
      kind: "waiting",
      inv: DAISY,
    });
  });
});

describe("barAsk", () => {
  const helping = (state: GameState) =>
    ({
      ...state,
      skillTest: { inv: ROLAND },
      pending: { ...state.pending!, inv: DAISY, kind: "commit" },
    }) as unknown as GameState;

  it("the decider's own table: their choice, with its buttons", () => {
    expect(barAsk(turn().state, none)).toEqual({ kind: "choice", buttons: true });
  });

  it("looking at a teammate during your own decision: the instruction stays, its buttons wait", () => {
    expect(barAsk(turn().state, { viewing: DAISY })).toEqual({ kind: "choice", buttons: false });
  });

  it("someone else can act and their table is not on screen: who, and the switch to them", () => {
    expect(barAsk(helping(turn().state), { viewing: ROLAND })).toEqual({
      kind: "handoff",
      inv: DAISY,
      key: "players.canCommit",
    });
  });

  it("once their table is on screen, it is their choice", () => {
    expect(barAsk(helping(turn().state), none)).toEqual({ kind: "choice", buttons: true });
  });
});

/** Daisy's own treachery test (Rotting Remains) opens while Roland is the active investigator */
const daisysTest = (base: GameState): GameState => {
  const s = structuredClone(base);
  const g: G = { s, db, events: [] };
  const guts = Object.keys(db.cards).find((c) => db.cards[c].name === "Guts")!;
  giveCard(g, DAISY, guts);
  const rr = createCard(g, "01163", "limbo", null);
  const step = s.pending!.step;
  s.pending = null;
  s.queue.push({ ...step, choice: undefined }, { t: "Revelation", inv: DAISY, card: rr });
  run(g);
  return s;
};

describe("ownDecisionTitle", () => {
  it("an investigator who wasn't deciding gets a decision of their own while someone else is active: a title for them", () => {
    const { state } = turn();
    const test = daisysTest(state);
    expect(state.pending!.inv).toBe(ROLAND);
    expect(test.pending).toMatchObject({ inv: DAISY, kind: "commit" });
    expect(ownDecisionTitle(state, test)).toBe(DAISY);
  });

  it("no title when the decider didn't change, or when the decision is the active investigator's own", () => {
    const { state } = turn();
    expect(ownDecisionTitle(state, state)).toBeNull();
    expect(ownDecisionTitle(daisysTest(state), state)).toBeNull(); // back to Roland, whose turn it is
  });

  it("a help (a commit to a teammate's test, a reaction) plays no title", () => {
    const { state } = turn();
    const help = (kind: string) =>
      ({ ...state, pending: { ...state.pending!, inv: DAISY, kind } }) as GameState;
    expect(ownDecisionTitle(state, help("reaction"))).toBeNull();
    let r = turn();
    r = mutate(r, (g) => {
      giveCard(g, ROLAND, "01025");
      giveCard(g, DAISY, "01093");
      putEnemy(g, "01160", locId(g, "01111"), ROLAND);
    });
    const before = pick(r, /^Fight Ghoul Minion/).state;
    const after = commitDone(pick(r, /^Fight Ghoul Minion/)).state;
    expect(after.pending).toMatchObject({ inv: DAISY, kind: "commit" });
    expect(ownDecisionTitle(before, after)).toBeNull();
  });

  it("no title for the mulligan or the phase pause", () => {
    const { state } = turn();
    const p = (kind: string) =>
      ({ ...state, active: null, pending: { ...state.pending!, inv: DAISY, kind } }) as GameState;
    expect(ownDecisionTitle(state, p("mulligan"))).toBeNull();
    expect(ownDecisionTitle(state, p("phase"))).toBeNull();
  });

  it("nothing from nothing", () => {
    expect(ownDecisionTitle(null, turn().state)).toBeNull();
  });
});

describe("autoSwitchTarget", () => {
  it("while someone else can act and their table isn't on screen: them", () => {
    let r = turn();
    r = mutate(r, (g) => {
      giveCard(g, ROLAND, "01025");
      giveCard(g, DAISY, "01093");
      putEnemy(g, "01160", locId(g, "01111"), ROLAND);
    });
    const { state } = commitDone(pick(r, /^Fight Ghoul Minion/));
    expect(autoSwitchTarget(state, { viewing: ROLAND })).toBe(DAISY);
    expect(autoSwitchTarget(state, { viewing: DAISY })).toBeNull();
    expect(autoSwitchTarget(state, { viewing: null })).toBeNull(); // the decider's table is the default view
  });

  it("nothing when nobody is waiting on someone else", () => {
    const { state } = turn();
    expect(autoSwitchTarget(state, { viewing: DAISY })).toBeNull();
  });
});

describe("investigatorChoice", () => {
  it("every option an investigator: their avatars, to tap", () => {
    const { state } = turn([ROLAND, DAISY, SKIDS]);
    const own = new Map(state.order.map((i) => [state.invs[i].cardId, i]));
    const pending = {
      ...state.pending!,
      options: [...own].map(([card, inv]) => ({ id: `pick:${inv}`, label: inv, card })),
    };
    const c = investigatorChoice({ ...state, pending } as GameState);
    expect(c?.options.map((o) => o.inv)).toEqual([ROLAND, DAISY, SKIDS]);
    expect(c?.single).toBe(false);
  });

  it("exactly one option: it is the single choice to make by itself", () => {
    const { state } = turn();
    const card = state.invs[DAISY].cardId;
    const c = investigatorChoice({
      ...state,
      pending: { ...state.pending!, options: [{ id: "only", label: "Daisy", card }] },
    } as GameState);
    expect(c).toMatchObject({ single: true, options: [{ inv: DAISY, id: "only" }] });
  });

  it("any other option beside the investigators, or none at all: not an investigator choice", () => {
    const { state } = turn();
    expect(investigatorChoice(state)).toBeNull();
    const card = state.invs[DAISY].cardId;
    expect(
      investigatorChoice({
        ...state,
        pending: {
          ...state.pending!,
          options: [
            { id: "a", label: "Daisy", card },
            { id: "b", label: "Nobody" },
          ],
        },
      } as GameState),
    ).toBeNull();
    expect(investigatorChoice({ ...state, pending: null } as GameState)).toBeNull();
  });
});

describe("delayed", () => {
  it("runs once after the delay while the guard still holds", () => {
    vi.useFakeTimers();
    const then = vi.fn();
    delayed(1000, () => true, then);
    vi.advanceTimersByTime(999);
    expect(then).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(then).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
  it("does nothing when the guard no longer holds, or when cancelled", () => {
    vi.useFakeTimers();
    const then = vi.fn();
    let ok = true;
    delayed(1000, () => ok, then);
    ok = false;
    vi.advanceTimersByTime(1500);
    expect(then).not.toHaveBeenCalled();
    const cancel = delayed(1000, () => true, then);
    cancel();
    vi.advanceTimersByTime(1500);
    expect(then).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("deckOptions", () => {
  const tappedGame = () => {
    let r = skipMulligans(
      start("the-gathering", [ROLAND, DAISY], 1, { chaosBag: ["0"] as never, tapDecks: true }),
    );
    if (r.state.pending?.options.some((o) => o.label === "Roland Banks"))
      r = pick(r, "Roland Banks");
    return r;
  };
  const untilDraw = (deck: string) => {
    let r = tappedGame();
    for (let k = 0; k < 600; k++) {
      const p = r.state.pending!;
      if (p.kind === "draw" && p.promptVars?.deck === deck) return r.state;
      r = pick(r, p.kind === "turn" ? /^End turn/ : /./);
    }
    throw new Error("no draw");
  };

  it("on a turn with an action left, the deck pile offers the Draw action", () => {
    const { state } = tappedGame();
    const d = deckOptions(state, state.pending!.inv);
    expect(d.player?.label).toMatch(/^Draw/);
    expect(d.encounter).toBeNull();
    expect(d.waiting).toBe(false);
  });

  it("a waiting upkeep draw lights the investigator's deck", () => {
    const state = untilDraw("player");
    const d = deckOptions(state, state.pending!.inv);
    expect(d.player).toMatchObject({ id: "draw" });
    expect(d.encounter).toBeNull();
    expect(d.waiting).toBe(true);
  });

  it("a waiting mythos draw lights the encounter deck", () => {
    const state = untilDraw("encounter");
    const d = deckOptions(state, state.pending!.inv);
    expect(d.encounter).toMatchObject({ id: "draw" });
    expect(d.player).toBeNull();
    expect(d.waiting).toBe(true);
  });

  it("nothing is offered to someone else's table, or when nothing waits", () => {
    const state = untilDraw("encounter");
    const other = state.order.find((i) => i !== state.pending!.inv)!;
    expect(deckOptions(state, other)).toEqual({ player: null, encounter: null, waiting: false });
    expect(deckOptions({ ...state, pending: null } as GameState, ROLAND)).toEqual({
      player: null,
      encounter: null,
      waiting: false,
    });
  });
});

describe("sheetFor", () => {
  it("opens the sheet of an investigator who isn't on screen once the mouse has rested on their avatar for 500 ms", () => {
    expect(HOVER_SHEET_MS).toBe(500);
    expect(sheetFor(DAISY, ROLAND, 499)).toBeNull();
    expect(sheetFor(DAISY, ROLAND, 500)).toBe(DAISY);
    expect(sheetFor(DAISY, ROLAND, 2000)).toBe(DAISY);
  });

  it("never for the investigator on screen, and not at all when nobody is hovered", () => {
    expect(sheetFor(ROLAND, ROLAND, 5000)).toBeNull();
    expect(sheetFor(null, ROLAND, 5000)).toBeNull();
  });
});
