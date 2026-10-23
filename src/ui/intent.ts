import { content } from "../content";
import { def, enemyStat, invsAt } from "../engine/core";
import type { GameState, InstId } from "../engine/types";

export type Intent =
  | { kind: "attack"; damage: number; horror: number }
  | { kind: "hunt" }
  | { kind: "rest" }
  | { kind: "wait" };

/** what an enemy will do in the coming enemy phase, by the base rules (enemies.ts: hunter moves, then attacks) */
export function intentOf(game: GameState, id: InstId): Intent {
  const g = { s: game, db: content, events: [] };
  const e = game.cards[id];
  if (e.exhausted) return { kind: "rest" };
  if (e.engagedWith && game.invs[e.engagedWith]?.status === "playing")
    return {
      kind: "attack",
      damage: enemyStat(g, id, "damage"),
      horror: enemyStat(g, id, "horror"),
    };
  if (def(g, id).keywords.includes("hunter") && invsAt(g, e.location).length === 0)
    return { kind: "hunt" };
  return { kind: "wait" };
}
