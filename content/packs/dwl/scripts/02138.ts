// Harold Walsted — you get +2 [intellect] while investigating [[Miskatonic]] locations. When he leaves play he is removed
// from the game and a [tablet] goes into the chaos bag for the campaign (`leavesPlay` in cards.json)
import {
  card,
  type CardScript,
  def,
  type GameContext,
  type InstId,
  inv,
} from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, harold: InstId) {
    const you = card(game, harold).controller;
    const at = you ? inv(game, you).location : null;
    return you && at && def(game, at).traits.includes("Miskatonic")
      ? [
          {
            target: you,
            mod: { stat: "intellect" as const, value: 2, when: "investigating" as const },
          },
        ]
      : [];
  },
} satisfies CardScript;
