// The Shadow Behind You (The Pallid Mask) — into your threat area (limit 1 per investigator: a second one is
// discarded). [action]: you look behind you. Forced: at the end of your turn, if you did not, discard all your
// resources or all the cards in your hand, then discard it.
import {
  card,
  cardsIn,
  type CardScript,
  currentRound,
  type EffCtx,
  flags,
  type GameContext,
  type ScriptRun,
  ZONE,
  discard,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

const looked = (game: GameContext, id: string) =>
  !!flags.rememberedFact.get(game, `tpmLooked:${id}:${currentRound(game)}`);

export default {
  abilities: [
    { kind: "revelation", run: "behind" },
    { kind: "action", label: "The Shadow Behind You: look behind you", run: "look" },
    {
      kind: "forced",
      trigger: "turnEnds",
      condition: { script: "didNotLook" },
      effects: [
        {
          op: "chooseOne",
          options: [
            {
              label: "Discard all your resources",
              effects: [{ op: "loseResources", amount: "all" }],
            },
            {
              label: "Discard all the cards in your hand",
              effects: [{ op: "discardFromHand", amount: "all" }],
            },
          ],
        },
        { op: "discardSelf" },
      ],
    },
  ],
  conditions: {
    didNotLook: (game: GameContext, ctx: EffCtx) =>
      !!ctx.source &&
      !!ctx.inv &&
      card(game, ctx.source).controller === ctx.inv &&
      !looked(game, ctx.source),
  },
  fns: {
    behind(game: GameContext, run: ScriptRun) {
      const mine = cardsIn(game, ZONE.Threat).some(
        (c) => c.code === "03261" && c.controller === run.you && c.id !== run.source,
      );
      if (mine) return discard(game, run.source);
      queue(game, resolveEffect({ effect: { op: "putInThreatArea" }, ctx: run.ctx }));
    },
    look(game: GameContext, run: ScriptRun) {
      flags.rememberedFact.set(game, `tpmLooked:${run.source}:${currentRound(game)}`, true);
    },
  },
} satisfies CardScript;
