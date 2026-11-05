// Base of the Hill (Warped and Twisted, Return to Where Doom Awaits) — connected to each Diverging Path (the scenario's
// `connections`); forced after you discover clues from it: spend those clues and put that many random set-aside
// Diverging Paths into play; its resign action is in cards.json
import {
  addCounter,
  argField,
  asStrings,
  type CardScript,
  emit,
  EVENT,
  type GameContext,
  inv,
  type ScriptRun,
} from "../../../../src/engine/api";
import { putPath, SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

/** "Spend those clues and put that many random set-aside … locations into play" (Ascending Path's too) */
export const WARPED = {
  fns: {
    ...SHARED.fns,
    wdaSpendForPaths(game: GameContext, run: ScriptRun) {
      const who = run.ctx.inv ?? run.you;
      const n = Math.min(run.ctx.x ?? 0, inv(game, who).clues);
      if (n <= 0) return;
      addCounter(game, who, "clues", -n);
      emit(game, EVENT.Clues, `${inv(game, who).name} spends ${n} clue(s)`, {
        inv: who,
        data: { n },
      });
      const codes = asStrings(argField(run.args, "codes"));
      for (let k = 0; k < n; k++) putPath(game, codes);
    },
  },
} satisfies CardScript;

export default WARPED satisfies CardScript;
