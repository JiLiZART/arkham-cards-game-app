// Steps of Y'hagharl (Lost in Time and Space) — its abilities are in cards.json; revelation: into play, then the topmost
// [[Madness]] card of your discard pile drawn (a weakness resolves as drawn)
import {
  type CardScript,
  def,
  type GameContext,
  inv,
  moveCard,
  resolvesOnDraw,
  resolveRevelation,
  queue,
  type ScriptRun,
  spawn,
  ZONE,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  fns: {
    ...SHARED.fns,
    stepsMadness(game: GameContext, run: ScriptRun) {
      // the discard pile's last card is its top
      const top = [...inv(game, run.you).discard]
        .reverse()
        .find((id) => def(game, id).traits.includes("Madness"));
      if (!top) return;
      moveCard(game, top, ZONE.Hand, { inv: run.you });
      if (!resolvesOnDraw(game, top)) return;
      queue(
        game,
        def(game, top).type === "enemy"
          ? spawn({ enemy: top, inv: run.you })
          : resolveRevelation({ inv: run.you, card: top }),
      );
    },
  },
} satisfies CardScript;
