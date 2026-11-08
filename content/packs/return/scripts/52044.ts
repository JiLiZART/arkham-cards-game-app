// Canal Saint-Martin (Return to A Phantom of Truth) — while you are at it you use your [combat] in place of your
// [agility], and vice versa.
import {
  baseSkill,
  card,
  type CardScript,
  type GameContext,
  type InstId,
  invsAt,
  ZONE,
} from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, self: InstId) {
    const c = card(game, self);
    if (c.zone !== ZONE.Location || !c.revealed) return [];
    // ponytail: swaps the base values; the other modifiers stay on their own skill
    return invsAt(game, self).flatMap((i) => {
      const d = baseSkill(game, i, "agility") - baseSkill(game, i, "combat");
      return d
        ? [
            { target: i, mod: { stat: "combat" as const, value: d } },
            { target: i, mod: { stat: "agility" as const, value: -d } },
          ]
        : [];
    });
  },
} satisfies CardScript;
