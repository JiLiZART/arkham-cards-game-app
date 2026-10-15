// Medical Texts — test intellect (2) for an investigator at your location: heal 1 damage, or deal 1 on failure
import { ask, inv, invName, invsAt, startTest, type CardScript, type EffCtx, type G, type InvId, type Step } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "action", label: "Medical Texts: treat an investigator", run: "treat" }],
  fns: {
    treat(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = invsAt(g, inv(g, ctx.you!).location);
      const who = ask<InvId>(g, step!, ctx.you!, "target", "Medical Texts: choose an investigator",
        here.map((i) => ({ id: i, label: invName(g, i), card: inv(g, i).cardId, value: i })), { auto: true, key: "cardChooseInvestigator", vars: { card: ctx.source ?? null } });
      if (who === undefined) return;
      startTest(g, {
        inv: ctx.you!, skill: "intellect", kind: "plain", difficulty: 2, source: ctx.source, ctx: { ...ctx, inv: who },
        onSuccess: [{ op: "heal", damage: 1, target: "eventInvestigator" }],
        onFail: [{ op: "takeDamage", amount: 1, target: "eventInvestigator" }],
      });
    },
  },
} satisfies CardScript;
