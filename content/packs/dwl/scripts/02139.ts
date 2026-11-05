// Adam Lynch — while you control him, the Security Office's [action][action] ability costs [action]. When he leaves play
// he is removed from the game and a [tablet] goes into the chaos bag for the campaign (`leavesPlay` in cards.json)
import {
  card,
  type CardScript,
  def,
  type GameContext,
  type InstId,
  type InvId,
} from "../../../../src/engine/api";

export default {
  extraActionCost(game: GameContext, adam: InstId, i: InvId, _designator: string, action) {
    return card(game, adam).controller === i &&
      action?.kind === "ability" &&
      def(game, action.card).name === "Security Office"
      ? -1
      : 0;
  },
} satisfies CardScript;
