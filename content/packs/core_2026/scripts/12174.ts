// Underground Cistern — when the investigation phase ends: each ready non-Elite Cultist here is discarded, 1 doom on the agenda for each
import {
  cardsIn,
  def,
  discard,
  isElite,
  push,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  fns: {
    consume(g: G, ctx: EffCtx) {
      if (g.s.phase !== "investigation" || !g.s.agenda) return;
      const here = cardsIn(g, "enemy").filter(
        (e) =>
          e.location === ctx.source &&
          !e.exhausted &&
          !isElite(g, e.id) &&
          def(g, e.id).traits.includes("Cultist"),
      );
      for (const e of here) discard(g, e.id);
      if (here.length)
        push(g, { t: "PlaceDoom", card: g.s.agenda, n: here.length }, { t: "CheckDoom" });
    },
  },
} satisfies CardScript;
