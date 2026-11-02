// Underground Cistern — when the investigation phase ends: each ready non-Elite Cultist here is discarded, 1 doom on the agenda for each
import {
  type CardScript,
  cardsIn,
  currentAgenda,
  currentPhase,
  def,
  discard,
  type EffCtx,
  type GameContext,
  isElite,
  push,
  ZONE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    consume(game: GameContext, ctx: EffCtx) {
      if (currentPhase(game) !== "investigation" || !currentAgenda(game)) return;
      const here = cardsIn(game, ZONE.Enemy).filter(
        (e) =>
          e.location === ctx.source &&
          !e.exhausted &&
          !isElite(game, e.id) &&
          def(game, e.id).traits.includes("Cultist"),
      );
      for (const e of here) discard(game, e.id);
      if (here.length)
        push(
          game,
          { t: STEP.PlaceDoom, card: currentAgenda(game)!, n: here.length },
          { t: STEP.CheckDoom },
        );
    },
  },
} satisfies CardScript;
