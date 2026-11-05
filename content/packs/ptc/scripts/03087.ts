// Hunted by Byakhee (Byakhee) — test [agility] (6); a failure reveals the top X encounter cards, X the amount failed by:
// you choose and draw a [[Byakhee]] enemy among them, an [[Omen]] treachery among them takes 1 horror, then the
// encounter deck is shuffled.
import {
  type CardScript,
  def,
  emit,
  type GameContext,
  moveCard,
  pile,
  type ScriptRun,
  shuffleDeck,
  EVENT,
  ZONE,
  queue,
  dealDamage,
  spawn,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [
        {
          op: "skillTest",
          skill: "agility",
          difficulty: 6,
          onFail: [{ op: "script", fn: "hunted" }],
        },
      ],
    },
  ],
  fns: {
    hunted(game: GameContext, run: ScriptRun) {
      const top = pile(game, "encounterDeck").slice(0, run.ctx.failBy ?? 0);
      const byakhee = top.filter(
        (id) => def(game, id).type === "enemy" && def(game, id).traits.includes("Byakhee"),
      );
      const pick = byakhee.length
        ? run.chooseCard(
            byakhee,
            { text: "Draw which Byakhee?", key: "huntedByByakhee" },
            { shown: top },
          )
        : null;
      emit(game, EVENT.Reveal, `${top.length} encounter cards are revealed`, { inv: run.you });
      const omen = top.some(
        (id) => def(game, id).type === "treachery" && def(game, id).traits.includes("Omen"),
      );
      if (pick) moveCard(game, pick, ZONE.Limbo);
      shuffleDeck(game, "encounter");
      queue(
        game,
        ...(omen
          ? [dealDamage({ inv: run.you, damage: 0, horror: 1, direct: false, source: run.source })]
          : []),
        ...(pick ? [spawn({ enemy: pick, inv: run.you })] : []),
      );
    },
  },
} satisfies CardScript;
