// Montmartre (A Phantom of Truth, version I) — [action]: reveal the top card of each investigator's deck; you may play
// an asset revealed, paying its cost, under your control; each deck is shuffled. (Group limit once per round.)
import {
  type CardScript,
  canPlay,
  def,
  emit,
  type GameContext,
  inv,
  type ScriptRun,
  shuffleDeck,
  turnOrder,
  EVENT,
  queue,
  playCard,
  runScript,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Montmartre: reveal the top card of each deck and play an asset among them",
      limit: { per: "round", count: 1, group: true },
      run: "street",
    },
  ],
  fns: {
    street(game: GameContext, run: ScriptRun) {
      const tops = turnOrder(game).flatMap((i) => inv(game, i).deck.slice(0, 1));
      const assets = tops.filter(
        (id) => def(game, id).type === "asset" && canPlay(game, run.you, id, true),
      );
      const pick = assets.length
        ? run.choose<string | null>(
            [
              ...assets.map((id) => ({
                id,
                label: `Play ${def(game, id).name}`,
                card: id,
                value: id,
              })),
              { id: "none", label: "Play none", value: null, key: "option.playNone" },
            ],
            { text: "Montmartre: play an asset revealed?", key: "apotMontmartre" },
            { auto: false, shown: tops },
          )
        : null;
      emit(game, EVENT.Reveal, "The top card of each deck is revealed", { inv: run.you });
      queue(
        game,
        ...(pick ? [playCard({ inv: run.you, card: pick, viaTrigger: true })] : []),
        runScript({ code: "03209", fn: "shuffleAll", ctx: run.ctx }),
      );
    },
    shuffleAll(game: GameContext) {
      for (const i of turnOrder(game)) shuffleDeck(game, i);
    },
  },
} satisfies CardScript;
