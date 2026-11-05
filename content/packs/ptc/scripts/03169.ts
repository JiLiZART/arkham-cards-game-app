// Asylum Halls (Western Patient Wing) — each [[Possessed]] enemy at this location gets +1 horror value.
import {
  card,
  type CardScript,
  def,
  enemiesAt,
  type GameContext,
  type InstId,
} from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, cardId: InstId) {
    if (!card(game, cardId).revealed) return [];
    return enemiesAt(game, cardId)
      .filter((e) => def(game, e.id).traits.includes("Possessed"))
      .map((e) => ({ target: e.id, mod: { stat: "enemyHorror" as const, value: 1 } }));
  },
} satisfies CardScript;
