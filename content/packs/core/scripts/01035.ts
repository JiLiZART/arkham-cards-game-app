// Medical Texts — test intellect (2) for an investigator at your location: heal 1 damage, or deal 1 on failure
import {
  inv,
  invsAt,
  startTest,
  type CardScript,
  type GameContext,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "action", label: "Medical Texts: treat an investigator", run: "treat" }],
  fns: {
    treat(game: GameContext, run: ScriptRun) {
      const here = invsAt(game, inv(game, run.you).location);
      const who = run.chooseInvestigator(here, {
        text: "Medical Texts: choose an investigator",
        key: "cardChooseInvestigator",
        vars: { card: run.ctx.source ?? null },
      });
      startTest(game, {
        inv: run.you,
        skill: "intellect",
        kind: "plain",
        difficulty: 2,
        source: run.ctx.source,
        ctx: { ...run.ctx, inv: who },
        onSuccess: [{ op: EVENT.Heal, damage: 1, target: "eventInvestigator" }],
        onFail: [{ op: "takeDamage", amount: 1, target: "eventInvestigator" }],
      });
    },
  },
} satisfies CardScript;
