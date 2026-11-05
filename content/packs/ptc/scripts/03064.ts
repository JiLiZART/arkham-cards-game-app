// Discovering the Truth (The Last King, act 1) — when an investigator is eliminated, their clues are placed on this act
// instead of at their location. Its objective, find clues and get out, has no advance: there is no reason to flip it.
import {
  addCounter,
  type CardScript,
  def,
  emit,
  type GameContext,
  type HookRun,
  invName,
  type InvId,
  EVENT,
} from "../../../../src/engine/api";

export default {
  hooks: {
    eliminated(game: GameContext, run: HookRun, i: InvId, clues: number) {
      addCounter(game, run.source, "clues", clues);
      emit(
        game,
        EVENT.Clues,
        `${invName(game, i)}'s ${clues} clue(s) go on ${def(game, run.source).name}`,
        {
          card: run.source,
          data: { n: clues, placed: true },
        },
      );
      return true;
    },
  },
} satisfies CardScript;
