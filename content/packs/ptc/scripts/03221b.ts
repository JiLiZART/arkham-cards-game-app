// The Organist, Draped in Mystery (A Phantom of Truth): aloof, can't be damaged. Forced: at the end of the enemy phase,
// unengaged he moves 1 location away from the nearest investigator; engaged, he disengages instead.
import {
  card,
  type CardScript,
  emit,
  type GameContext,
  type ScriptRun,
  setEngaged,
  EVENT,
} from "../../../../src/engine/api";
import { organistAway } from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";

export default {
  abilities: [
    { kind: "constant", modifiers: [{ flag: "cannotBeDamaged", scope: "self" }] },
    { kind: "forced", trigger: "enemyPhaseEnds", run: "slipAway" },
  ],
  fns: {
    slipAway(game: GameContext, run: ScriptRun) {
      if (!card(game, run.source).engagedWith) return organistAway(game, run);
      setEngaged(game, run.source, null);
      emit(game, EVENT.Engage, "The Organist disengages", { card: run.source });
    },
  },
} satisfies CardScript;
