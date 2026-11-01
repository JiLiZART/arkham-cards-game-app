// Underground Cistern — when the investigation phase ends: each ready non-Elite Cultist here is discarded, 1 doom on the agenda for each
import {
  type CardScript,
  cardsIn,
  currentAgenda,
  currentPhase,
  def,
  discard,
  type EffCtx,
  type G,
  isElite,
  push,
} from "../../../../src/engine/api";

export default {
  fns: {
    consume(g: G, ctx: EffCtx) {
      if (currentPhase(g) !== "investigation" || !currentAgenda(g)) return;
      const here = cardsIn(g, "enemy").filter(
        (e) =>
          e.location === ctx.source &&
          !e.exhausted &&
          !isElite(g, e.id) &&
          def(g, e.id).traits.includes("Cultist"),
      );
      for (const e of here) discard(g, e.id);
      if (here.length)
        push(g, { t: "PlaceDoom", card: currentAgenda(g)!, n: here.length }, { t: "CheckDoom" });
    },
  },
} satisfies CardScript;
