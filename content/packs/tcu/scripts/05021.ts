// Delay the Inevitable — attached to an investigator at your location; cancels the damage and horror just dealt to them, and costs 2 resources each mythos phase
import {
  ask,
  type CardScript,
  discard,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  inv,
  type InvId,
  invName,
  invsAt,
  moveCard,
  setController,
  type Step,
  EVENT,
  ZONE,
  CHOICE,
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
    attach(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const who = ask<InvId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Delay the Inevitable: choose an investigator",
        invsAt(game, inv(game, ctx.you!).location).map((i) => ({
          id: i,
          label: invName(game, i),
          card: inv(game, i).cardId,
          value: i,
        })),
        { auto: true, key: "cardChooseInvestigator", vars: { card: ctx.source ?? null } },
      );
      if (who === undefined) return;
      moveCard(game, ctx.source!, ZONE.Play);
      setController(game, ctx.source!, who);
      emit(game, EVENT.Play, `Delay the Inevitable is attached to ${invName(game, who)}`, {
        inv: who,
        card: ctx.source!,
      });
    },
    cancel(game: GameContext, ctx: EffCtx) {
      if (!ctx.key || !ctx.dealt) return;
      flags.prevented.set(game, ctx.key, [...ctx.dealt]);
      discard(game, ctx.source!);
      emit(
        game,
        EVENT.Cancelled,
        `Delay the Inevitable cancels the damage and horror dealt to ${invName(game, ctx.you!)}`,
        {
          inv: ctx.you!,
          card: ctx.source!,
        },
      );
    },
  },
} satisfies CardScript;
