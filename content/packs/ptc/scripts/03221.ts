// The Organist, Hopeless, I Defied Him (A Phantom of Truth): hunter, can't be damaged. Forced: after he moves by the
// hunter keyword, if unengaged, he hunts once more and can't attack this phase (once per round).
import {
  activeInvs,
  type CardScript,
  type EffCtx,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";
import { huntedUnengaged, huntOnce, noAttackThisPhase } from "./03086";

export default {
  abilities: [
    { kind: "constant", modifiers: [{ flag: "cannotBeDamaged", scope: "self" }] },
    {
      kind: "forced",
      trigger: "enemyEntersLocation",
      condition: { script: "huntedUnengaged" },
      limit: { per: "round", count: 1 },
      run: "huntAgain",
    },
  ],
  conditions: {
    huntedUnengaged: (game: GameContext, ctx: EffCtx) =>
      !!ctx.source && huntedUnengaged(game, ctx, ctx.source),
  },
  fns: {
    huntAgain(game: GameContext, run: ScriptRun) {
      huntOnce(game, run, run.source, activeInvs(game));
      noAttackThisPhase(game, run.source);
    },
  },
} satisfies CardScript;
