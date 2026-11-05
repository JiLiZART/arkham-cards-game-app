// A Chance Encounter — an [[Ally]] asset from any player's discard pile into play under your control; at the end of the
// round, if it is still in play, it is discarded
import {
  activeInvs,
  type CardScript,
  checkSlots,
  def,
  enterPlay,
  flags,
  type GameContext,
  type InstId,
  inv,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";

const allies = (game: GameContext): InstId[] =>
  activeInvs(game).flatMap((i) =>
    inv(game, i).discard.filter(
      (c) => def(game, c).type === "asset" && def(game, c).traits.includes("Ally"),
    ),
  );

export default {
  abilities: [{ kind: "onPlay", condition: { script: "allyInDiscard" }, run: "encounter" }],
  conditions: {
    allyInDiscard: (game: GameContext) => allies(game).length > 0,
  },
  fns: {
    encounter(game: GameContext, run: ScriptRun) {
      const pick = run.chooseCard(allies(game), {
        text: "A Chance Encounter: choose an Ally asset to put into play",
        key: "chooseAllyFromDiscard",
      });
      flags.discardAtRoundEnd.set(game, [...(flags.discardAtRoundEnd.get(game) ?? []), pick]);
      queue(
        game,
        checkSlots({ inv: run.you, card: pick }),
        enterPlay({ inv: run.you, card: pick }),
      );
    },
  },
} satisfies CardScript;
