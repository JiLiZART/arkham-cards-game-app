/** the player bar's pure parts: who is shown, who can act, what each avatar says (ADR-0004: viewing is view state) */
import { maxHealth, maxSanity } from "../../engine/core";
import type { ChoiceOption, GameState, InvId } from "../../engine/types";
import { db } from "./context";
import { ribbonModel } from "../game/ribbon";
import { viewerOf } from "./store";

/** the part of the view state that says whose table the player is looking at */
export interface Looking {
  viewing: InvId | null;
  /** the investigators this device answers for in an online room; null (or absent): every one, as in hot-seat play */
  mySeats?: readonly InvId[] | null;
}

/** whether this device answers for `inv` (every device does without a room) */
export const holdsSeat = (view: Looking, inv: InvId | null): boolean =>
  !view.mySeats || (!!inv && view.mySeats.includes(inv));

/**
 * Whose table is on screen: the one being looked at, else the deciding investigator's. In an online room, while the
 * decider sits at another device, this device stays on its own seat; one with no seat is shown the board (null).
 */
export function shownInv(game: GameState, view: Looking): InvId | null {
  if (view.viewing && game.invs[view.viewing]) return view.viewing;
  const decider = viewerOf(game);
  if (holdsSeat(view, decider)) return decider;
  return view.mySeats?.[0] ?? null;
}

/** a hand shows its cards only on a seat this device holds; in the room's other seats it lies face down */
export const handFaceUp = (view: Looking, inv: InvId | null): boolean => holdsSeat(view, inv);

/** choices are offered only while the deciding investigator's table is on screen */
export const choicesOffered = (game: GameState, view: Looking): boolean =>
  !!game.pending && shownInv(game, view) === viewerOf(game) && holdsSeat(view, viewerOf(game));

/**
 * A decision that belongs to someone other than the investigator whose turn it is and helps another's play: a commit to
 * another investigator's test, or a reaction. Who, and the string that says what they can do. Null otherwise; a commit
 * window of the decider's own test (a treachery drawn in the mythos phase) is theirs to answer like any decision.
 */
export function canAct(
  game: GameState,
): { inv: InvId; key: "players.canCommit" | "players.mayReact" } | null {
  const p = game.pending;
  if (!p || game.active === null || p.inv === game.active) return null;
  if (p.kind === "commit")
    return game.skillTest && game.skillTest.inv !== p.inv
      ? { inv: p.inv, key: "players.canCommit" }
      : null;
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
export type BarAsk =
  | { kind: "choice"; buttons: boolean }
  /** the decider sits at another device: nothing to press here */
  | { kind: "waiting"; inv: InvId }
  | { kind: "handoff"; inv: InvId; key: "players.canCommit" | "players.mayReact" };
export function barAsk(game: GameState, view: Looking): BarAsk {
  const decider = viewerOf(game) ?? game.lead;
  const offered = choicesOffered(game, view);
  const can = canAct(game);
  if (!holdsSeat(view, decider)) return { kind: "waiting", inv: decider };
  if (!offered && can) return { kind: "handoff", inv: can.inv, key: can.key };
  return { kind: "choice", buttons: offered };
}

/** the pending options that are an investigator's own ability (on their card, not an answer among investigators): the stat bar's and the sheet's buttons */
export function abilityOptionsOf(game: GameState, inv: InvId): ChoiceOption[] {
  const card = game.invs[inv]?.cardId;
  return investigatorOptions(game).abilities.filter((o) => o.card === card);
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
export function investigatorOptions(game: GameState): {
  answers: Map<InvId, ChoiceOption>;
  abilities: ChoiceOption[];
} {
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
  return can && holdsSeat(view, can.inv) && shownInv(game, view) !== can.inv ? can.inv : null;
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
  return {
    prompt: p.prompt,
    options: p.options.map((o) => ({ inv: own.get(o.card!)!, id: o.id, label: o.label })),
    single: p.options.length === 1,
  };
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

export interface DeckOptions {
  /** the option that draws from the viewer's own deck: a waiting draw, or the turn's Draw action */
  player: ChoiceOption | null;
  /** the option that draws from the encounter deck (a waiting draw) */
  encounter: ChoiceOption | null;
  /** a draw is waiting for a tap (not just the Draw action being available) */
  waiting: boolean;
}

/**
 * The decks a tap can answer now: the viewer's deck for a waiting draw of theirs or for the turn's Draw action, the
 * encounter deck for a waiting encounter draw. Only the deciding investigator's table gets them (the pile column shows
 * the viewer's decks). `waiting` is for the highlights that would otherwise glow all turn (the phone drawer's handle).
 */
export function deckOptions(game: GameState, viewer: InvId | null): DeckOptions {
  const none: DeckOptions = { player: null, encounter: null, waiting: false };
  const p = game.pending;
  if (!p || !viewer || p.inv !== viewer) return none;
  if (p.kind === "draw") {
    const o = p.options[0] ?? null;
    return p.promptVars?.deck === "encounter"
      ? { player: null, encounter: o, waiting: true }
      : { player: o, encounter: null, waiting: true };
  }
  if (p.kind === "turn") {
    const draw =
      p.options.find((o) => (o.value as { kind?: string } | null)?.kind === "draw") ?? null;
    return { player: draw, encounter: null, waiting: false };
  }
  return none;
}

/** how long the mouse rests on an avatar before its investigator's sheet opens, and how long the sheet stays after the pointer leaves */
export const HOVER_SHEET_MS = 500;
export const SHEET_GRACE_MS = 150;

/** the investigator whose sheet a resting mouse opens: the one hovered, once long enough, unless they are the one on screen */
export const sheetFor = (
  hovered: InvId | null,
  shown: InvId | null,
  elapsed: number,
): InvId | null => (hovered && hovered !== shown && elapsed >= HOVER_SHEET_MS ? hovered : null);
