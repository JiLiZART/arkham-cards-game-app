import type { GameEvent, GameState } from "../engine/types";
import type { Spotlight } from "./view";

/** animated events that spotlight what they are about (the chaos draw and test results don't) */
const SPOT = new Set(["attack", "spawn", "enemyDamage", "enemyDefeated", "defeated", "damage", "clues", "doom", "encounter", "agendaAdvance", "actAdvance"]);
const ON_MAP = new Set(["location", "enemy"]);

/** the map cards and investigator portraits an event is about, or null when none of them is on the map */
export function spotlightOf(e: GameEvent | null, game: GameState): Spotlight | null {
  if (!e || !SPOT.has(e.type)) return null;
  const ids = [e.card, e.data?.source as string | null | undefined].filter((id): id is string => !!id);
  const cards = [...new Set(ids)].filter((id) => ON_MAP.has(game.cards[id]?.zone));
  const invs = e.inv && game.invs[e.inv]?.location ? [e.inv] : [];
  return cards.length || invs.length ? { cards, invs } : null;
}
