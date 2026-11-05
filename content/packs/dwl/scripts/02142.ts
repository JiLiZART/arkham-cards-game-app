// Shadow-spawned — Hunting Horror gets +1 fight, +1 health and +1 evade for each resource on it, and Massive with 3. It
// stays attached when the Horror enters the void (movement keeps a void-bound card's attachments)
import { card, type CardScript, type GameContext, type InstId } from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, shadow: InstId) {
    const c = card(game, shadow);
    const horror = c.attachedTo;
    if (!horror) return [];
    const n = c.resources;
    return [
      ...(n
        ? (["fight", "enemyHealth", "evade"] as const).map((stat) => ({
            target: horror,
            mod: { stat, value: n },
          }))
        : []),
      ...(n >= 3 ? [{ target: horror, mod: { keyword: "massive" as const } }] : []),
    ];
  },
} satisfies CardScript;
