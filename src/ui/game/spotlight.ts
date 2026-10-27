import type { GameEvent, GameState, InvId } from "../../engine/types";
import { deckPick } from "./optionHome";
import type { Spotlight } from "../state/view";

/** animated events that spotlight what they are about (the chaos draw and test results don't) */
const SPOT = new Set([
  "enemyMove",
  "attack",
  "spawn",
  "enemyDamage",
  "enemyDefeated",
  "defeated",
  "damage",
  "clues",
  "doom",
  "encounter",
  "weakness",
  "agendaAdvance",
  "actAdvance",
]);
const ON_MAP = new Set(["location", "enemy"]);

/** the map cards and investigator portraits an event is about, or null when none of them is on the map */
export function spotlightOf(e: GameEvent | null, game: GameState): Spotlight | null {
  if (!e || !SPOT.has(e.type)) return null;
  const ids = [e.card, e.data?.source as string | null | undefined].filter(
    (id): id is string => !!id,
  );
  const cards = [...new Set(ids)].filter((id) => ON_MAP.has(game.cards[id]?.zone));
  const invs = e.inv && game.invs[e.inv]?.location ? [e.inv] : [];
  return cards.length || invs.length ? { cards, invs } : null;
}

/** choices about no particular thing: the turn's actions, the mulligan, the phase pause */
const NO_SPOT = new Set(["turn", "mulligan", "phase"]);

/**
 * What a pending choice is about: its option cards (map, strip and hand) and investigators, plus a skill test's target
 * and tester while cards are committed to it. Null for choices about nothing in particular and for deck picks (the
 * showcase has them).
 */
export function spotlightOfChoice(game: GameState, viewer: InvId | null): Spotlight | null {
  const p = game.pending;
  // a draw waiting for a tap on a deck: the piles are what to tap, everything else dims (the piles lift their own dim)
  if (p?.kind === "draw") return { cards: [], invs: [], choice: true };
  if (!p || NO_SPOT.has(p.kind) || deckPick(game, viewer).length) return null;
  const ids = p.options.map((o) => o.card).filter((id): id is string => !!id && !!game.cards[id]);
  const test = p.kind === "commit" ? game.skillTest : null;
  if (test?.target) ids.push(test.target);
  const invs = new Set<InvId>(test ? [test.inv] : []);
  const cards = new Set<string>();
  for (const id of ids) {
    const inv = game.order.find((i) => game.invs[i].cardId === id);
    if (inv) invs.add(inv);
    else cards.add(id);
  }
  return cards.size || invs.size ? { cards: [...cards], invs: [...invs], choice: true } : null;
}

/**
 * The spotlight on screen: the playing event's (it wins, even when it lights nothing); once nothing plays, waits to play
 * or holds the middle of the screen, the pending choice's.
 */
export function spotlightNow(
  game: GameState,
  viewer: InvId | null,
  playing: GameEvent | null,
  idle: boolean,
): Spotlight | null {
  if (playing) return spotlightOf(playing, game);
  return idle ? spotlightOfChoice(game, viewer) : null;
}

/**
 * The game as the table should show it while events wait to play: an enemy whose move is still queued stays where it
 * came from, unengaged, until its move plays (then it travels with the event). The state itself is never changed.
 */
export function heldGame(game: GameState, queue: GameEvent[]): GameState {
  const held = new Map<string, string>();
  for (const e of queue) {
    const from = e.data?.from;
    if (e.type === "enemyMove" && e.card && typeof from === "string" && !held.has(e.card))
      held.set(e.card, from);
  }
  if (!held.size) return game;
  const cards = { ...game.cards };
  for (const [id, from] of held)
    if (cards[id]) cards[id] = { ...cards[id], location: from, engagedWith: null };
  return { ...game, cards };
}
