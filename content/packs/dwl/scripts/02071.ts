// Clover Club Lounge — while it is act 1: discard an Ally asset from your hand to gain 2 clues (limit once per game)
import {
  cardIf,
  type CardScript,
  currentAct,
  def,
  discard,
  type EffCtx,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

/** the Clover Club's locations offer their games only while it is act 1 (Beginner's Luck) */
export const actOne = (game: GameContext) => cardIf(game, currentAct(game))?.code === "02066";

const allies = (game: GameContext, i: InvId): InstId[] =>
  inv(game, i).hand.filter(
    (h) => def(game, h).type === "asset" && def(game, h).traits.includes("Ally"),
  );

export default {
  abilities: [
    {
      kind: "action",
      label: "Clover Club Lounge: discard an Ally from your hand to gain 2 clues",
      limit: { per: "game", count: 1 },
      condition: { script: "canUse" },
      run: "lounge",
    },
  ],
  conditions: {
    canUse: (game: GameContext, ctx: EffCtx) =>
      actOne(game) && !!ctx.you && allies(game, ctx.you).length > 0,
  },
  fns: {
    lounge(game: GameContext, run: ScriptRun) {
      const ally = run.chooseCard(allies(game, run.you), {
        text: "Choose an Ally asset to discard",
        key: "loungeAlly",
      });
      discard(game, ally);
      queue(
        game,
        resolveEffect({
          effect: { op: "gainClues", amount: 2 },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
