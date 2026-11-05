// Pushed into the Beyond — a non-story asset you control is shuffled into your deck, the top 3 cards are discarded, and
// a copy of that asset among them deals 2 horror
import {
  type CardScript,
  controlled,
  def,
  discardTop,
  type GameContext,
  inv,
  shuffleIntoDeck,
  type ScriptRun,
  queue,
  dealDamage,
  openWindow,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "push" }],
  fns: {
    push(game: GameContext, run: ScriptRun) {
      // a story asset is an encounter card: it has no owner
      const assets = controlled(game, run.you)
        .filter((a) => def(game, a.id).type === "asset" && !!a.owner)
        .map((a) => a.id);
      const pick = assets.length
        ? run.chooseCard(assets, {
            text: "Choose an asset to shuffle into your deck",
            key: "pushedIntoTheBeyond",
          })
        : undefined;
      const name = pick ? def(game, pick).name : undefined;
      if (pick) shuffleIntoDeck(game, pick, run.you);
      const had = inv(game, run.you).deck.length;
      const gone = discardTop(game, run.you, 3);
      queue(
        game,
        ...(name && gone.some((id) => def(game, id).name === name)
          ? [dealDamage({ inv: run.you, damage: 0, horror: 2, direct: false, source: run.source })]
          : []),
        ...(had && !inv(game, run.you).deck.length
          ? [openWindow("deckEmptied", { inv: run.you })]
          : []),
      );
    },
  },
} satisfies CardScript;
