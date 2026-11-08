// Dianne Devine, Hiding an Oath Unspoken (Return to The Last King, an asset at a location in place of the base enemy) —
// each investigator at her location cannot discover or take control of clues; as the enemy phase begins she moves to
// the location of the Bystander with the fewest clues among those with any (the lead chooses among equals), if able.
import {
  card,
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  type ScriptRun,
  setCardLocation,
} from "../../../../src/engine/api";
import { fewestCluesOfAny } from "./52022";

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
      const pool = fewestCluesOfAny(game);
      if (!pool.length) return;
      const b = run.chooseCard(
        pool.map((x) => x.id),
        { text: "Dianne Devine moves to which Bystander's location?", key: "dianneMove" },
        { who: run.you },
      );
      const to = pool.find((x) => x.id === b)?.location;
      if (!to || card(game, run.source).location === to) return;
      setCardLocation(game, run.source, to);
      emit(game, EVENT.Place, `${def(game, run.source).name} moves to ${def(game, to).name}`, {
        card: run.source,
        data: { to },
      });
    },
  },
} satisfies CardScript;
