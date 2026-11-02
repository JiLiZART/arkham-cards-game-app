// Screeching Byakhee — +1 fight and +1 evade while engaged with an investigator with 4 or less remaining sanity
import {
  card,
  def,
  inv,
  type CardScript,
  type GameContext,
  type InstId,
} from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, id: InstId) {
    const c = card(game, id);
    if (c.zone !== "enemy" || !c.engagedWith) return [];
    const i = inv(game, c.engagedWith);
    // printed sanity: modified sanity would recurse into modifier collection
    if ((def(game, i.cardId).sanity ?? 0) - i.horror > 4) return [];
    return [
      { target: id, mod: { stat: "fight" as const, value: 1 } },
      { target: id, mod: { stat: "evade" as const, value: 1 } },
    ];
  },
} satisfies CardScript;
