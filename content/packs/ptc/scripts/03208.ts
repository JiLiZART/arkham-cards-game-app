// Montparnasse (A Phantom of Truth) — [fast] Discard a card from your hand: gain resources equal to its [willpower]
// icons. (Limit once per round.)
import {
  addCounter,
  type CardScript,
  def,
  discard,
  emit,
  type GameContext,
  inv,
  invName,
  type ScriptRun,
  EVENT,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "fast",
      usableBy: "atLocation",
      label: "Montparnasse: discard a card to gain resources per [willpower] icon",
      condition: { cardsInHand: { min: 1 } },
      limit: { per: "round", count: 1 },
      run: "cafe",
    },
  ],
  fns: {
    cafe(game: GameContext, run: ScriptRun) {
      const pick = run.chooseCard(
        [...inv(game, run.you).hand],
        { text: "Discard which card?", key: "apotMontparnasse" },
        { auto: false },
      );
      const n = def(game, pick).icons?.willpower ?? 0;
      discard(game, pick);
      if (!n) return;
      addCounter(game, run.you, "resources", n);
      emit(game, EVENT.Resource, `${invName(game, run.you)} gains ${n} resources`, {
        inv: run.you,
        data: { n },
      });
    },
  },
} satisfies CardScript;
