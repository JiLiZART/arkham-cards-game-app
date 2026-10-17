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
 * A decision that belongs to someone other than the investigator whose turn it is (a commit to another's test, a
 * reaction): who, and the string that says what they can do. Null otherwise.
 */
export function canAct(game: GameState): { inv: InvId; key: "players.canCommit" | "players.mayReact" } | null {
  const p = game.pending;
  if (!p || game.active === null || p.inv === game.active) return null;
  if (p.kind === "commit") return { inv: p.inv, key: "players.canCommit" };
  if (p.kind === "reaction") return { inv: p.inv, key: "players.mayReact" };
  return null;
}

/**
 * The view to land on when the decision has just passed to a new investigator: the active investigator's table while
 * another can act (the avatar pulses until it is tapped), otherwise nothing (the decider's table).
 */
export const landingView = (game: GameState): InvId | null => (canAct(game) ? game.active : null);

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
