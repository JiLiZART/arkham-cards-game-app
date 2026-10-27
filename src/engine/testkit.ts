/** helpers for engine tests (not used at runtime) */
import { content } from "../content/index";
import { createGame, dispatch, type Result } from "./engine";
import type { GameSetup, InvId } from "./types";

export const db = content;

export function deckCodes(deckId: string): string[] {
  const d = db.decks[deckId];
  const out: string[] = [];
  for (const [code, n] of Object.entries(d.cards)) for (let k = 0; k < n; k++) out.push(code);
  if (d.randomBasicWeakness) out.push("01098");
  return out;
}

export const DECK_BY_INV: Record<string, string> = {
  "01001": "roland-starter",
  "01002": "daisy-starter",
  "01003": "skids-starter",
  "01004": "agnes-starter",
  "01005": "wendy-starter",
};

export function setup(
  scenarioId: string,
  invs: InvId[],
  seed = 1,
  extra: Partial<GameSetup> = {},
): GameSetup {
  return {
    campaignId: "night-of-the-zealot",
    scenarioId,
    difficulty: "standard",
    seed,
    investigators: invs.map((code) => ({ code, deck: deckCodes(DECK_BY_INV[code]) })),
    ...extra,
  };
}

export function start(scenarioId: string, invs: InvId[], seed = 1, extra: Partial<GameSetup> = {}) {
  return createGame(db, setup(scenarioId, invs, seed, extra));
}

/** answer the pending choice with the first option whose label matches */
export function pick(r: Result, match: RegExp | string): Result {
  const p = r.state.pending;
  if (!p) throw new Error("no pending choice");
  const o = p.options.find((x) =>
    typeof match === "string" ? x.id === match || x.label === match : match.test(x.label),
  );
  if (!o)
    throw new Error(
      `no option ${match} in [${p.options.map((x) => x.label).join(" | ")}] (${p.prompt})`,
    );
  const next = dispatch(db, r.state, { type: "choose", inv: p.inv, option: o.id });
  if (next.error) throw new Error(next.error);
  return next;
}

/** keep answering with the first matching option while the prompt matches */
export function skipMulligans(r: Result): Result {
  while (r.state.pending?.kind === "mulligan") r = pick(r, "done");
  return r;
}

import { card, createCard, def, findByCode, inv, moveCard, type G } from "./core";
import { run } from "./engine";

export const gOf = (r: Result): G => ({ s: r.state, db, events: [] });

/** mutate state directly (test setup), then re-ask the pending choice so its options are fresh */
export function mutate(r: Result, fn: (g: G) => void): Result {
  const s = structuredClone(r.state);
  const g: G = { s, db, events: [] };
  fn(g);
  if (s.pending) {
    const step = s.pending.step;
    s.pending = null;
    s.queue.push({ ...step, choice: undefined });
    run(g);
  }
  return { state: s, events: g.events };
}

/** put a card from the investigator's deck (or a new copy) into their hand */
export function giveCard(g: G, i: string, code: string) {
  const existing = inv(g, i).deck.find((id) => card(g, id).code === code);
  const id = existing ?? createCard(g, code, "limbo", i);
  moveCard(g, id, "hand");
  return id;
}

/** spawn a fresh enemy at a location (by code), optionally engaged */
export function putEnemy(g: G, code: string, at: string, engagedWith: string | null = null) {
  const id = createCard(g, code, "limbo");
  moveCard(g, id, "enemy", { location: at });
  g.s.cards[id].engagedWith = engagedWith;
  return id;
}

export const locId = (g: G, code: string) => findByCode(g, code, ["location"])!.id;
export const options = (r: Result) => r.state.pending?.options.map((o) => o.label) ?? [];
export { def };

/** close the commit window if it is open (it is skipped when nothing can be committed) */
export function commitDone(r: Result): Result {
  return r.state.pending?.kind === "commit" ? pick(r, "done") : r;
}
