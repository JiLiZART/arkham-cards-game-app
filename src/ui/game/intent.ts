import { content } from "../../content";
import { cardOf, def, invOfIf } from "../../engine/context";
import { enemyStat, invsAt } from "../../engine/queries";
import type { GameState, InstId } from "../../engine/world/types";
import { EVENT } from "../../engine/events/event";

export type Intent =
  | { kind: "attack"; damage: number; horror: number }
  | { kind: "hunt" }
  | { kind: "rest" }
  | { kind: "wait" };

/** what an enemy will do in the coming enemy phase, by the base rules (enemies.ts: hunter moves, then attacks) */
export function intentOf(game: GameState, id: InstId): Intent {
  const g = { s: game, db: content, events: [] };
  const e = cardOf(game, id);
  if (e.exhausted) return { kind: "rest" };
  if (e.engagedWith && invOfIf(game, e.engagedWith)?.status === "playing")
    return {
      kind: EVENT.Attack,
      damage: enemyStat(g, id, "damage"),
      horror: enemyStat(g, id, "horror"),
    };
  if (def(g, id).keywords.includes("hunter") && invsAt(g, e.location).length === 0)
    return { kind: "hunt" };
  return { kind: "wait" };
}
