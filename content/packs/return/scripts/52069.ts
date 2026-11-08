// Preying Byakhee — Prey: lowest remaining sanity only; Hunter (data). While engaged with an investigator with
// remaining sanity 4 or fewer, its fight and evade values are swapped.
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
    // ponytail: swaps the printed values; a swap of modified values needs the totals without this modifier
    const { fight, evade } = def(game, id).enemy!;
    const d = (evade ?? 0) - (fight ?? 0);
    return [
      { target: id, mod: { stat: "fight" as const, value: d } },
      { target: id, mod: { stat: "evade" as const, value: -d } },
    ];
  },
} satisfies CardScript;
