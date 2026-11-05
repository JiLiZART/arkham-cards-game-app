// Freight Car (Return to The Essex County Express) — unrevealed: it can't be entered while the location to its left has
// clues; revealed, at the end of the round: each investigator in it tests agility (1), and one who fails tests again;
// failing the second, they are pulled into the vortex and defeated
import {
  afterTest,
  type CardScript,
  type EffCtx,
  type GameContext,
  invsAt,
  queue,
  defeatInvestigator,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";
import { lockedBehind } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

/** an agility (1) test, `fn` run on a failure */
const agility = (fn: string, ctx: EffCtx) =>
  resolveEffect({
    effect: { op: "skillTest", skill: "agility", difficulty: 1, onFail: [{ op: "script", fn }] },
    ctx,
  });

export default {
  modifiers: lockedBehind,
  abilities: [{ kind: "forced", trigger: "roundEnds", run: "vortex" }],
  fns: {
    vortex(game: GameContext, run: ScriptRun) {
      queue(game, ...invsAt(game, run.source).map((i) => agility("again", { ...run.ctx, you: i })));
    },
    /** the second test, once the first has ended */
    again(game: GameContext, run: ScriptRun) {
      afterTest(game, agility("pulledIn", { ...run.ctx, you: run.you }));
    },
    pulledIn(game: GameContext, run: ScriptRun) {
      queue(game, defeatInvestigator({ inv: run.you, by: "effect" }));
    },
  },
} satisfies CardScript;
