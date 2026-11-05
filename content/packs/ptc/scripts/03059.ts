// The Man in the Pallid Mask — aloof; an investigator at his location may investigate with +2 shroud and defeat him
// instead of discovering clues. Each time he is defeated, a tally under "Chasing the Stranger" (the campaign's running
// tally, recorded as the scenario ends). At The Pallid Mask's Tomb of Shadows his [action] can't defeat him.
import {
  type CardScript,
  flags,
  type GameContext,
  type ScriptRun,
  queue,
  defeatEnemy,
  resolveEffect,
} from "../../../../src/engine/api";
import { strangerShielded } from "./03257";

export const MITPM = "03059";
const TALLY = ["chasingTheStranger", "chasingTheStranger"] as const;

/** one more tally under "Chasing the Stranger" */
export function strangerDefeated(game: GameContext) {
  flags.countEntry.set(game, TALLY, (flags.countEntry.get(game, TALLY) ?? 0) + 1);
}

export default {
  abilities: [
    {
      kind: "action",
      designator: "investigate",
      usableBy: "atLocation",
      label: "The Man in the Pallid Mask: investigate (+2 shroud) to defeat him",
      run: "unmask",
    },
    { kind: "forced", trigger: "enemyDefeatedSelf", run: "tally" },
  ],
  fns: {
    unmask(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: {
            op: "investigate",
            shroud: 2,
            insteadOfClues: [{ op: "script", fn: "defeatHim" }],
          },
          ctx: { ...run.ctx, you: run.you, source: run.source },
        }),
      );
    },
    defeatHim(game: GameContext, run: ScriptRun) {
      // the Tomb of Shadows: "cannot be defeated by his [action] ability"
      if (strangerShielded(game, run.source)) return;
      queue(game, defeatEnemy({ enemy: run.source, by: run.you }));
    },
    tally(game: GameContext) {
      strangerDefeated(game);
    },
  },
} satisfies CardScript;
