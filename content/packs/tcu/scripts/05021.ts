// Delay the Inevitable — attached to an investigator at your location; cancels the damage and horror just dealt to them, and costs 2 resources each mythos phase
import {
  ask,
  card,
  discard,
  emit,
  inv,
  invName,
  invsAt,
  moveCard,
  type CardScript,
  type EffCtx,
  type G,
  type InvId,
  type Step,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "onPlay", run: "attach" },
    {
      kind: "reaction",
      trigger: "damageDealt",
      label: "Delay the Inevitable: cancel the damage and horror",
      condition: { eventInvestigatorIsYou: true },
      run: "cancel",
    },
    {
      kind: "forced",
      trigger: "mythosEnds",
      effects: [
        {
          op: "chooseOne",
          options: [
            {
              label: "Spend 2 resources to keep Delay the Inevitable",
              condition: { resources: { min: 2 } },
              effects: [{ op: "payCost", cost: { resources: 2 } }],
            },
            { label: "Discard Delay the Inevitable", effects: [{ op: "discardSelf" }] },
          ],
        },
      ],
    },
  ],
  fns: {
    attach(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const who = ask<InvId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Delay the Inevitable: choose an investigator",
        invsAt(g, inv(g, ctx.you!).location).map((i) => ({
          id: i,
          label: invName(g, i),
          card: inv(g, i).cardId,
          value: i,
        })),
        { auto: true, key: "cardChooseInvestigator", vars: { card: ctx.source ?? null } },
      );
      if (who === undefined) return;
      moveCard(g, ctx.source!, "play");
      card(g, ctx.source!).controller = who;
      emit(g, "play", `Delay the Inevitable is attached to ${invName(g, who)}`, {
        inv: who,
        card: ctx.source!,
      });
    },
    cancel(g: G, ctx: EffCtx) {
      if (!ctx.key || !ctx.dealt) return;
      g.s.flags[`prevented:${ctx.key}`] = [...ctx.dealt];
      discard(g, ctx.source!);
      emit(
        g,
        "cancelled",
        `Delay the Inevitable cancels the damage and horror dealt to ${invName(g, ctx.you!)}`,
        {
          inv: ctx.you!,
          card: ctx.source!,
        },
      );
    },
  },
} satisfies CardScript;
