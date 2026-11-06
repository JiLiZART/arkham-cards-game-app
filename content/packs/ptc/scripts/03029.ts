// Sleight of Hand — an [[Item]] asset from your hand is put into play; at the end of your turn, if it is still in play,
// it returns to your hand
import {
  asString,
  card,
  type CardScript,
  checkSlots,
  def,
  type EffCtx,
  enterPlay,
  type GameContext,
  inv,
  moveCard,
  queue,
  resolveEffect,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const items = (game: GameContext, you: string) =>
  inv(game, you).hand.filter(
    (h) => def(game, h).type === "asset" && def(game, h).traits.includes("Item"),
  );

export default {
  abilities: [
    {
      kind: "onPlay",
      condition: { all: [{ yourTurn: true }, { script: "hasItem" }] },
      run: "sleight",
    },
  ],
  conditions: {
    hasItem: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && items(game, ctx.you).filter((h) => h !== ctx.source).length > 0,
  },
  fns: {
    sleight(game: GameContext, run: ScriptRun) {
      const ids = items(game, run.you);
      if (!ids.length) return;
      const pick = run.choose<string>(
        ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { text: "Choose an Item asset to put into play", key: "chooseAsset" },
      );
      queue(
        game,
        checkSlots({ inv: run.you, card: pick }),
        enterPlay({ inv: run.you, card: pick }),
        resolveEffect({
          effect: { op: "atTurnEnd", effects: [{ op: "script", fn: "back", args: pick }] },
          ctx: run.ctx,
        }),
      );
    },
    back(game: GameContext, run: ScriptRun) {
      const id = asString(run.args);
      if (id && card(game, id).zone === ZONE.Play) moveCard(game, id, ZONE.Hand);
    },
  },
} satisfies CardScript;
