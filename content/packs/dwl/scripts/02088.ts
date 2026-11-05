// Unhallowed Country — the text box of each Ally asset its bearer controls is blank (the rest is in cards.json)
import {
  card,
  type CardScript,
  controlled,
  def,
  type GameContext,
  type InstId,
  ZONE,
} from "../../../../src/engine/api";

export default {
  blanks(game: GameContext, id: InstId) {
    const c = card(game, id);
    if (c.zone !== ZONE.Threat || !c.controller) return [];
    return controlled(game, c.controller)
      .filter((a) => def(game, a.id).type === "asset" && def(game, a.id).traits.includes("Ally"))
      .map((a) => a.id);
  },
} satisfies CardScript;
