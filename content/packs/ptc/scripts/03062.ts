// Fashionably Late (The Last King, agenda 1) — back: the set-aside Dianne Devine spawns at the location of the
// Bystander with the fewest clues (the lead chooses among equals); the encounter discard pile is shuffled in.
import {
  type CardScript,
  emit,
  findByCode,
  type GameContext,
  reshuffleDiscard,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  spawn,
} from "../../../../src/engine/api";
import { bystanders } from "../../../campaigns/the-path-to-carcosa/scripts/the-last-king";

export const DIANNE = "03081";

/** the Bystanders with the fewest clues on them */
export function fewestClues(game: GameContext) {
  const all = bystanders(game);
  const least = Math.min(...all.map((b) => b.clues));
  return all.filter((b) => b.clues === least);
}

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      const dianne = findByCode(game, DIANNE, [ZONE.SetAside]);
      const pool = fewestClues(game);
      if (dianne && pool.length) {
        const b = run.chooseCard(
          pool.map((x) => x.id),
          { text: "Dianne Devine spawns at which Bystander's location?", key: "dianneSpawn" },
          { who: run.you },
        );
        const at = pool.find((x) => x.id === b)?.location ?? null;
        if (at) queue(game, spawn({ enemy: dianne.id, inv: null, at }));
      }
      reshuffleDiscard(game, "encounter");
      emit(game, EVENT.Reshuffle, "The encounter discard pile is shuffled into the encounter deck");
    },
  },
} satisfies CardScript;
