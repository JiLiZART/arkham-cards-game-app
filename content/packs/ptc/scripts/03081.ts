// Dianne Devine (The Last King) — aloof; each investigator at her location cannot discover or take control of clues; as
// the enemy phase begins she moves to the location of the Bystander with the fewest clues (the lead chooses among
// equals).
import {
  type CardScript,
  def,
  emit,
  type GameContext,
  setCardLocation,
  EVENT,
  type ScriptRun,
  cardIf,
} from "../../../../src/engine/api";
import { fewestClues } from "./03062";

export default {
  abilities: [
    {
      kind: "constant",
      modifiers: [
        { flag: "cannotDiscoverClues", scope: "investigatorsAtLocation" },
        { flag: "cannotTakeControlOfClues", scope: "investigatorsAtLocation" },
      ],
    },
    { kind: "forced", trigger: "phaseBegins", condition: { phase: "enemy" }, run: "mingle" },
  ],
  fns: {
    mingle(game: GameContext, run: ScriptRun) {
      const pool = fewestClues(game);
      if (!pool.length) return;
      const b = run.chooseCard(
        pool.map((x) => x.id),
        { text: "Dianne Devine moves to which Bystander's location?", key: "dianneMove" },
        { who: run.you },
      );
      const to = pool.find((x) => x.id === b)?.location;
      const her = cardIf(game, run.source);
      if (!to || !her || her.location === to) return;
      setCardLocation(game, run.source, to);
      emit(game, EVENT.EnemyMove, `${def(game, run.source).name} moves to ${def(game, to).name}`, {
        card: run.source,
        data: { to },
      });
    },
  },
} satisfies CardScript;
