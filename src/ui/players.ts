/** the player bar's pure parts: who is shown, who can act, what each avatar says (ADR-0004: viewing is view state) */
import { maxHealth, maxSanity } from "../engine/core";
import type { ChoiceOption, GameState, InvId } from "../engine/types";
import { db } from "./context";
import { ribbonModel } from "./ribbon";
import { viewerOf } from "./store";

/** the part of the view state that says whose table the player is looking at */
export interface Looking {
  viewing: InvId | null;
}

/** whose table is on screen: the one being looked at, else the deciding investigator's */
export function shownInv(game: GameState, view: Looking): InvId | null {
  return view.viewing && game.invs[view.viewing] ? view.viewing : viewerOf(game);
}

/** choices are offered only while the deciding investigator's table is on screen */
export const choicesOffered = (game: GameState, view: Looking): boolean => !!game.pending && shownInv(game, view) === viewerOf(game);

/**
 * A decision that belongs to someone other than the investigator whose turn it is and helps another's play: a commit to
 * another investigator's test, or a reaction. Who, and the string that says what they can do. Null otherwise; a commit
 * window of the decider's own test (a treachery drawn in the mythos phase) is theirs to answer like any decision.
 */
export function canAct(game: GameState): { inv: InvId; key: "players.canCommit" | "players.mayReact" } | null {
  const p = game.pending;
  if (!p || game.active === null || p.inv === game.active) return null;
  if (p.kind === "commit") return game.skillTest && game.skillTest.inv !== p.inv ? { inv: p.inv, key: "players.canCommit" } : null;
  if (p.kind === "reaction") return { inv: p.inv, key: "players.mayReact" };
  return null;
}

/**
 * The view to land on when the decision has just passed to a new investigator: the active investigator's table while
 * another can act (the avatar pulses until it is tapped), otherwise nothing (the decider's table).
 */
export const landingView = (game: GameState): InvId | null => (canAct(game) ? game.active : null);

/**
 * What the instruction bar asks: the decider's choice (with its buttons only on their table), or, while someone else
 * can act and their table is not on screen, who can act and a switch to them. Never an instruction nobody can answer.
 */
export type BarAsk = { kind: "choice"; buttons: boolean } | { kind: "handoff"; inv: InvId; key: "players.canCommit" | "players.mayReact" };
export function barAsk(game: GameState, view: Looking): BarAsk {
  const offered = choicesOffered(game, view);
  const can = canAct(game);
  if (!offered && can) return { kind: "handoff", inv: can.inv, key: can.key };
  return { kind: "choice", buttons: offered };
}

export interface Avatar {
  inv: InvId;
  health: number;
  sanity: number;
  maxHealth: number;
  maxSanity: number;
  /** action pips: how many, how many filled (none outside the investigation phase or for the defeated) */
  pips: number;
  filled: number;
  /** the investigator whose turn it is */
  active: boolean;
  /** the investigator whose table is on screen */
  shown: boolean;
  /** turn state from the ribbon: "done" turns are dimmed */
  turn: "active" | "done" | "todo" | "idle";
  /** defeated or resigned */
  grey: boolean;
  /** what this investigator can do now when it isn't their turn (string key), else null */
  canAct: "players.canCommit" | "players.mayReact" | null;
}

/** every investigator in turn order, as the bar draws them */
export function barModel(game: GameState, view: Looking): Avatar[] {
  const g = { s: game, db, events: [] };
  const shown = shownInv(game, view);
  const turns = new Map(ribbonModel(game).turns.map((t) => [t.inv, t]));
  const can = canAct(game);
  return game.order.map((inv) => {
    const st = game.invs[inv];
    const t = turns.get(inv);
    return {
      inv,
      health: maxHealth(g, inv) - st.damage,
      sanity: maxSanity(g, inv) - st.horror,
      maxHealth: maxHealth(g, inv),
      maxSanity: maxSanity(g, inv),
      pips: t?.pips ?? 0,
      filled: t?.filled ?? 0,
      active: game.active === inv,
      shown: shown === inv,
      turn: t?.state ?? "idle",
      grey: st.status !== "playing",
      canAct: can?.inv === inv ? can.key : null,
    };
  });
}

/**
 * The pending options tied to investigator cards, split by where they are answered: among several (who takes the next
 * turn, the damage, a card's target) or for any investigator but the decider, the avatar answers on a tap; the decider's
 * own card alone is an ability, offered in their sheet.
 */
export function investigatorOptions(game: GameState): { answers: Map<InvId, ChoiceOption>; abilities: ChoiceOption[] } {
  const own = new Map(game.order.map((i) => [game.invs[i].cardId, i]));
  const mine = (game.pending?.options ?? []).filter((o) => o.card && own.has(o.card));
  const answers = new Map<InvId, ChoiceOption>();
  const abilities: ChoiceOption[] = [];
  for (const o of mine) {
    const inv = own.get(o.card!)!;
    if (mine.length > 1 || inv !== game.pending!.inv) answers.set(inv, o);
    else abilities.push(o);
  }
  return { answers, abilities };
}

/**
 * The investigator whose own decision just began, when it deserves a title ("Daisy's turn"): the decider changed to
 * someone who isn't the active investigator (their own test or choice, in any phase, e.g. a treachery's test in the
 * mythos phase). A help to another's test, a reaction, the mulligan and the phase pause play none; the active
 * investigator's turns have their own title.
 */
export function ownDecisionTitle(prev: GameState | null, game: GameState): InvId | null {
  const p = game.pending;
  if (!prev || !p || p.kind === "mulligan" || p.kind === "phase") return null;
  if (prev.pending?.inv === p.inv) return null;
  if (canAct(game) || p.inv === game.active) return null;
  return p.inv;
}

/** the investigator the table should switch to by itself: someone who can act now while their table is not on screen */
export function autoSwitchTarget(game: GameState, view: Looking): InvId | null {
  const can = canAct(game);
  return can && shownInv(game, view) !== can.inv ? can.inv : null;
}

export interface InvestigatorChoice {
  prompt: string;
  options: { inv: InvId; id: string; label: string }[];
  /** exactly one investigator is eligible: the choice is made by itself after a moment */
  single: boolean;
}

/**
 * A pending choice whose options are all investigators (who takes the damage, who a card affects): the avatars to tap in
 * the middle of the screen. Null for anything else, including a reaction (an investigator's own ability beside "pass").
 */
export function investigatorChoice(game: GameState): InvestigatorChoice | null {
  const p = game.pending;
  if (!p || p.kind === "reaction" || p.kind === "commit" || !p.options.length) return null;
  const own = new Map(game.order.map((i) => [game.invs[i].cardId, i]));
  if (!p.options.every((o) => o.card && own.has(o.card))) return null;
  return { prompt: p.prompt, options: p.options.map((o) => ({ inv: own.get(o.card!)!, id: o.id, label: o.label })), single: p.options.length === 1 };
}

/**
 * Run `then` after `ms` if `still` holds by then; the returned function cancels it. View state, not game state
 * (ADR-0004): what it does is dispatch an ordinary choice or set the view.
 */
export function delayed(ms: number, still: () => boolean, then: () => void): () => void {
  const timer = setTimeout(() => {
    if (still()) then();
  }, ms);
  return () => clearTimeout(timer);
}
