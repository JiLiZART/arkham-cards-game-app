// Rice's Whereabouts (Extracurricular Activity, act 2) — spend 1 clue: discard the top 5 encounter cards (10 alone), and
// "Jazz" Mulligan comes into play if he is among them; back: the Alchemy Labs, The Experiment, the Alchemical Concoction
import {
  card,
  type CardScript,
  currentAgenda,
  def,
  discardTop,
  emit,
  findByCode,
  type GameContext,
  moveCard,
  playerCount,
  putBeneath,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  spawn,
} from "../../../../src/engine/api";
import { thawCompleted } from "./02042";
import { putLocationIntoPlay } from "./02043";
import { jazzArrives } from "./02060";

export default {
  abilities: [
    {
      kind: "action",
      label: "Rice's Whereabouts: spend 1 clue to discard the top encounter cards",
      usableBy: "anyone",
      cost: { clues: 1 },
      run: "search",
    },
    { kind: "revelation", run: "back" },
  ],
  fns: {
    search(game: GameContext, run: ScriptRun) {
      const gone = discardTop(game, "encounter", playerCount(game) === 1 ? 10 : 5);
      // "if you discard "Jazz" Mulligan for any reason, resolve his revelation effect"
      const jazz = gone.find((id) => card(game, id).code === "02060");
      if (jazz) jazzArrives(game, jazz, run.you);
    },
    back(game: GameContext) {
      putLocationIntoPlay(game, "02057");
      const labs = findByCode(game, "02057", [ZONE.Location]);
      const stage = currentAgenda(game) ? (def(game, currentAgenda(game)!).stage ?? 0) : 0;
      const experiment = findByCode(game, "02058", [ZONE.SetAside]);
      if (labs && experiment && stage <= 2)
        queue(game, spawn({ enemy: experiment.id, inv: null, at: labs.id }));
      const concoction = findByCode(game, "02059", [ZONE.SetAside]);
      if (!concoction) return;
      if (thawCompleted(game) && labs) {
        putBeneath(game, concoction.id, labs.id);
        emit(game, EVENT.Place, "The Alchemical Concoction is beneath the Alchemy Labs", {
          card: concoction.id,
        });
      } else moveCard(game, concoction.id, ZONE.Removed);
    },
  },
} satisfies CardScript;
