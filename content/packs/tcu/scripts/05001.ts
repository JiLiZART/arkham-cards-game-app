// Carolyn Fern — after one of your card effects heals horror, the healed card's controller gains 1 resource; elder sign: you may heal 1 horror here
import {
  card,
  threatArea,
  type CardScript,
  type EffCtx,
  type GameContext,
  EVENT,
  type ScriptRun,
  queue,
  resolveEffects,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "horrorHealed",
      label: "Carolyn Fern: the healed card's controller gains 1 resource",
      condition: {
        all: [{ eventInvestigatorIsYou: true }, { not: { script: "rationalThought" } }],
      },
      run: "gain",
    },
    { kind: "elderSign", tokenValue: 1, run: "elder" },
  ],
  conditions: {
    /** Rational Thought: "You cannot gain resources from Carolyn Fern's [reaction] ability" */
    rationalThought: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && threatArea(game, ctx.you).some((c) => c.code === "05008"),
  },
  fns: {
    gain(game: GameContext, run: ScriptRun) {
      const healed = card(game, run.ctx.card!);
      const who = healed.controller ?? healed.owner;
      if (!who) return;
      queue(
        game,
        resolveEffects({
          effects: [{ op: "gainResources", amount: 1, target: "eventInvestigator" }],
          ctx: { ...run.ctx, inv: who },
        }),
      );
    },
    elder(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffects({
          effects: [
            {
              op: "chooseOne",
              options: [
                {
                  label: "Heal 1 horror from an investigator or Ally asset at your location",
                  effects: [
                    {
                      op: EVENT.Heal,
                      horror: 1,
                      target: "chooseAtLocation",
                      targetAlly: "atLocation",
                    },
                  ],
                },
                { label: "Don't heal", effects: [] },
              ],
            },
          ],
          ctx: { you: run.ctx.you, source: run.ctx.source },
        }),
      );
    },
  },
} satisfies CardScript;
