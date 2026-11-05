// Tough Crowd — next to the agenda deck until the end of the round: each investigator spends 1 additional action to
// parley.
import {
  type CardScript,
  def,
  emit,
  type GameContext,
  type InstId,
  moveCard,
  setController,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";

/** an encounter card in play beside the act or agenda deck, controlled by no one */
export function besideTheDecks(game: GameContext, id: InstId) {
  moveCard(game, id, ZONE.Play);
  setController(game, id, null);
  emit(game, EVENT.Place, `${def(game, id).name} is put into play`, { card: id });
}

export default {
  abilities: [
    { kind: "revelation", run: "place" },
    { kind: "forced", trigger: "roundEnds", effects: [{ op: "discardSelf" }] },
  ],
  extraActionCost: (_game: GameContext, _card: InstId, _inv: string, designator: string) =>
    designator === "parley" ? 1 : 0,
  fns: {
    place(game: GameContext, run: ScriptRun) {
      besideTheDecks(game, run.source);
    },
  },
} satisfies CardScript;
