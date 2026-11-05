// The Tattered Cloak — you get -1 sanity; +1 [willpower], +1 [combat] and +1 [agility] while you have 3 or fewer
// remaining sanity. (A scripted modifier: as data, its own sanity modifier would be read to decide whether it applies.)
import {
  card,
  type CardScript,
  def,
  type GameContext,
  type InstId,
  inv,
} from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, cardId: InstId) {
    const who = card(game, cardId).controller;
    if (!who) return [];
    const me = inv(game, who);
    // other cards' sanity modifiers are not counted (none in this cycle changes sanity while it is worn)
    const remaining = (def(game, me.cardId).sanity ?? 0) - 1 - me.horror;
    return [
      { target: who, mod: { stat: "sanity" as const, value: -1 } },
      ...(remaining <= 3
        ? (["willpower", "combat", "agility"] as const).map((stat) => ({
            target: who,
            mod: { stat, value: 1 },
          }))
        : []),
    ];
  },
} satisfies CardScript;
