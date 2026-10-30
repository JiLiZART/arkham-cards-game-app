// Hypnotic Therapy — test [intellect] (2) to heal 1 horror from an investigator here, who may draw 1; or add 1 horror to another of your heals
import {
  ask,
  card,
  emit,
  inv,
  invName,
  invsAt,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InvId,
  type Step,
} from "../../../../src/engine/api";

/** the investigator whose card was healed, if it was an investigator */
const healedInv = (g: G, ctx: EffCtx): InvId | undefined =>
  Object.values(g.s.invs).find((i) => i.cardId === ctx.card)?.id;

export default {
  abilities: [
    {
      kind: "action",
      label: "Hypnotic Therapy: test intellect (2) to heal 1 horror",
      cost: { exhaust: true },
      effects: [
        {
          op: "skillTest",
          skill: "intellect",
          difficulty: 2,
          onSuccess: [{ op: "script", fn: "treat" }],
        },
      ],
    },
    {
      kind: "reaction",
      trigger: "horrorHealed",
      label: "Hypnotic Therapy: heal 1 additional horror",
      cost: { exhaust: true },
      condition: { all: [{ eventInvestigatorIsYou: true }, { script: "otherHealOnInvestigator" }] },
      run: "more",
    },
  ],
  conditions: {
    otherHealOnInvestigator: (g: G, ctx: EffCtx) => {
      const i = healedInv(g, ctx);
      return ctx.by !== ctx.source && !!i && inv(g, i).horror > 0;
    },
  },
  fns: {
    treat(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const who = ask<InvId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Hypnotic Therapy: choose an investigator",
        invsAt(g, inv(g, ctx.you!).location).map((i) => ({
          id: i,
          label: invName(g, i),
          card: inv(g, i).cardId,
          value: i,
        })),
        { auto: true, key: "cardChooseInvestigator", vars: { card: ctx.source ?? null } },
      );
      if (who === undefined) return;
      push(g, {
        t: "Effects",
        effects: [
          { op: "heal", horror: 1, target: "eventInvestigator" },
          {
            op: "chooseOne",
            options: [
              {
                label: "Draw 1 card",
                effects: [{ op: "drawCards", amount: 1, target: "eventInvestigator" }],
              },
              { label: "Don't draw", effects: [] },
            ],
          },
        ],
        ctx: { ...ctx, inv: who },
      });
    },
    /** part of the heal that triggered it: no new "after horror is healed" window */
    more(g: G, ctx: EffCtx) {
      const i = healedInv(g, ctx);
      if (!i || inv(g, i).horror < 1) return;
      inv(g, i).horror--;
      emit(g, "heal", `${invName(g, i)} heals 1 more horror (Hypnotic Therapy)`, {
        inv: i,
        card: card(g, ctx.source!).id,
        data: { damage: 0, horror: 1 },
      });
    },
  },
} satisfies CardScript;
