// Hypnotic Therapy — test [intellect] (2) to heal 1 horror from an investigator here, who may draw 1; or add 1 horror to another of your heals
import {
  addCounter,
  card,
  type CardScript,
  type EffCtx,
  emit,
  type GameContext,
  inv,
  type InvId,
  invName,
  invsAt,
  push,
  turnOrder,
  EVENT,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

/** the investigator whose card was healed, if it was an investigator */
const healedInv = (game: GameContext, ctx: EffCtx): InvId | undefined =>
  turnOrder(game)
    .map((i) => inv(game, i))
    .find((i) => i.cardId === ctx.card)?.id;

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
    otherHealOnInvestigator: (game: GameContext, ctx: EffCtx) => {
      const i = healedInv(game, ctx);
      return ctx.by !== ctx.source && !!i && inv(game, i).horror > 0;
    },
  },
  fns: {
    treat(game: GameContext, run: ScriptRun) {
      const who = run.chooseInvestigator(invsAt(game, inv(game, run.you).location), {
        text: "Hypnotic Therapy: choose an investigator",
        key: "cardChooseInvestigator",
        vars: { card: run.ctx.source ?? null },
      });
      push(game, {
        t: STEP.Effects,
        effects: [
          { op: EVENT.Heal, horror: 1, target: "eventInvestigator" },
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
        ctx: { ...run.ctx, inv: who },
      });
    },
    /** part of the heal that triggered it: no new "after horror is healed" window */
    more(game: GameContext, run: ScriptRun) {
      const i = healedInv(game, run.ctx);
      if (!i || inv(game, i).horror < 1) return;
      addCounter(game, i, "horror", -1);
      emit(game, EVENT.Heal, `${invName(game, i)} heals 1 more horror (Hypnotic Therapy)`, {
        inv: i,
        card: card(game, run.source).id,
        data: { damage: 0, horror: 1 },
      });
    },
  },
} satisfies CardScript;
