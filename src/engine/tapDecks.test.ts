import { describe, expect, it } from "vitest";
import { autoPlay, botChoice } from "./bot";
import { dispatch, run, type Result } from "./engine";
import { db, pick, skipMulligans, start } from "./testkit";
import type { G } from "./core";
import type { GameState } from "./types";

const ROLAND = "01001";
const DAISY = "01002";

/** a game that asks for tapped decks, past the mulligans (and the choice of who plays first) */
const tapped = (invs = [ROLAND, DAISY], extra: object = { tapDecks: true }) => {
  let r = skipMulligans(start("the-gathering", invs, 1, { chaosBag: ["0"] as never, ...extra }));
  if (r.state.pending?.options.some((o) => o.label === "Roland Banks")) r = pick(r, "Roland Banks");
  return r;
};

/** the bot answers until `stop` holds (or something is wrong) */
function until(r: Result, stop: (s: GameState) => boolean, max = 600): Result {
  for (let k = 0; k < max && r.state.pending && !stop(r.state); k++) {
    const p = r.state.pending;
    const next = dispatch(db, r.state, { type: "choose", inv: p.inv, option: botChoice(db, r) });
    if (next.error) throw new Error(next.error);
    r = next;
  }
  return r;
}
const draws = (deck: string) => (s: GameState) => s.pending?.kind === "draw" && s.pending.promptVars?.deck === deck;
const handSize = (s: GameState, i: string) => s.invs[i].hand.length;

describe("tapped draws", () => {
  it("setup draws don't wait: the opening hands are dealt and the first choice is the mulligan", () => {
    const r = start("the-gathering", [ROLAND], 1, { tapDecks: true });
    expect(r.state.pending?.kind).toBe("mulligan");
    expect(handSize(r.state, ROLAND)).toBe(5);
  });

  it("the upkeep draw waits for the drawing investigator, then draws one card", () => {
    const r = until(tapped([ROLAND]), draws("player"));
    const p = r.state.pending!;
    expect(p).toMatchObject({ kind: "draw", inv: ROLAND, promptKey: "tapDeck.player", promptVars: { deck: "player", n: 1 } });
    expect(p.options.map((o) => o.label)).toEqual(["Draw"]);
    const before = handSize(r.state, ROLAND);
    const deck = r.state.invs[ROLAND].deck.length;
    const next = pick(r, "draw");
    expect(handSize(next.state, ROLAND)).toBe(before + 1);
    expect(next.state.invs[ROLAND].deck.length).toBe(deck - 1);
  });

  it("the cards leave the deck only when the tap comes", () => {
    const r = until(tapped([ROLAND]), draws("player"));
    const s = r.state;
    expect(s.invs[ROLAND].deck.length).toBeGreaterThan(0);
    expect(s.pending!.step.t).toBe("Draw");
  });

  it("the mythos draws come one investigator at a time, each tapping the encounter deck in turn", () => {
    let r = until(tapped(), draws("encounter"));
    const first = r.state.pending!.inv;
    expect([ROLAND, DAISY]).toContain(first);
    const deck = r.state.encounterDeck.length;
    r = pick(r, "draw");
    expect(r.state.encounterDeck.length).toBeLessThan(deck);
    r = until(r, draws("encounter"));
    expect(r.state.pending).toMatchObject({ kind: "draw", inv: first === ROLAND ? DAISY : ROLAND, promptVars: { deck: "encounter" } });
  });

  it("a draw of two cards from one effect is one tap", () => {
    const { state } = tapped();
    const s = structuredClone(state);
    const g: G = { s, db, events: [] };
    const step = s.pending!.step;
    s.pending = null;
    s.queue.push({ ...step, choice: undefined }, { t: "Draw", inv: DAISY, n: 2 });
    run(g);
    expect(s.pending).toMatchObject({ kind: "draw", inv: DAISY, promptKey: "tapDeck.player.many", promptVars: { deck: "player", n: 2 } });
    const hand = handSize(s, DAISY);
    const r = pick({ state: s, events: [] }, "draw");
    expect(handSize(r.state, DAISY)).toBe(hand + 2);
    expect(r.state.pending?.kind).not.toBe("draw");
  });

  it("the Draw action is the tap: choosing it draws at once, with no second wait", () => {
    const r = tapped([ROLAND]);
    const hand = handSize(r.state, ROLAND);
    const next = pick(r, /^Draw/);
    expect(handSize(next.state, ROLAND)).toBe(hand + 1);
    expect(next.state.pending?.kind).toBe("turn");
  });

  it("a game that doesn't ask for tapped decks never waits", () => {
    let r = tapped([ROLAND], {});
    for (let k = 0; k < 120; k++) {
      const p: GameState["pending"] = r.state.pending;
      if (!p) break;
      expect(p.kind).not.toBe("draw");
      r = dispatch(db, r.state, { type: "choose", inv: p.inv, option: botChoice(db, r) });
    }
  });

  it("the bot plays a tapped game to the end of its steps without a stall", () => {
    const r = autoPlay(db, tapped(), 3000);
    expect(r.state.round).toBeGreaterThanOrEqual(2);
  });

  it("replaying the same choices gives the same game", () => {
    const run1 = until(tapped(), (s) => s.round >= 3, 900);
    const run2 = until(tapped(), (s) => s.round >= 3, 900);
    expect(run2.state).toEqual(run1.state);
  });

  it("a wait after the scenario has ended is skipped", () => {
    const { state } = tapped([ROLAND]);
    const s = structuredClone(state);
    s.phase = "ended";
    const g: G = { s, db, events: [] };
    const step = s.pending!.step;
    s.pending = null;
    s.queue.push({ ...step, choice: undefined }, { t: "Draw", inv: ROLAND, n: 1 });
    run(g);
    expect((s as GameState).pending?.kind).not.toBe("draw");
  });
});
