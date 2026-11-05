// Joey "The Rat" Vigil — [fast] spend 1 resource: play an [[Item]] asset from your hand, paying its cost; the ability is
// in cards.json, the choice here
import {
  type CardScript,
  canPlay,
  def,
  type EffCtx,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  playCard,
  playCost,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";

/** the Item assets in hand that can be played now, its timing aside, with `spare` resources left over */
const items = (game: GameContext, you: InvId, spare: number): InstId[] =>
  inv(game, you).hand.filter((h) => {
    const d = def(game, h);
    return (
      d.type === "asset" &&
      d.traits.includes("Item") &&
      canPlay(game, you, h, d.keywords.includes("fast")) &&
      inv(game, you).resources >= playCost(game, you, h) + spare
    );
  });

export default {
  conditions: {
    // the resource the ability costs comes first
    itemToPlay: (game: GameContext, ctx: EffCtx) => !!ctx.you && items(game, ctx.you, 1).length > 0,
  },
  fns: {
    play(game: GameContext, run: ScriptRun) {
      const pick = run.chooseCard(items(game, run.you, 0), {
        text: 'Joey "The Rat" Vigil: choose an Item asset to play',
        key: "chooseItemToPlay",
      });
      queue(game, playCard({ inv: run.you, card: pick }));
    },
  },
} satisfies CardScript;
