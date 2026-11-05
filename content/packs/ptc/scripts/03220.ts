// Gardens of Luxembourg (A Phantom of Truth) — while a [[Byakhee]] enemy is moving, if an investigator is at the
// Gardens, that enemy's location connects to the Gardens (the scenario's `connections` hook asks this module).
import {
  type CardScript,
  def,
  findByCode,
  type GameContext,
  type InstId,
  invsAt,
  ZONE,
} from "../../../../src/engine/api";

export const GARDENS = "03220";

/** the Gardens, for a Byakhee's move from `loc`, when an investigator is there */
export function gardensFor(game: GameContext, loc: InstId, enemy: boolean | InstId): InstId[] {
  if (typeof enemy !== "string" || !def(game, enemy).traits.includes("Byakhee")) return [];
  const gardens = findByCode(game, GARDENS, [ZONE.Location]);
  return gardens && gardens.id !== loc && invsAt(game, gardens.id).length ? [gardens.id] : [];
}

export default {} satisfies CardScript;
