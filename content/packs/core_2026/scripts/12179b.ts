// Elokoss (Mother of Flame) — after you evade her: she readies and cannot attack you this round
import {
  cardIf,
  type CardScript,
  currentRound,
  type EffCtx,
  flags,
  type GameContext,
  ready,
} from "../../../../src/engine/api";

export default {
  fns: {
    unbowed(game: GameContext, ctx: EffCtx) {
      const e = cardIf(game, ctx.source!);
      if (e?.zone !== "enemy" || ctx.enemy !== e.id || !ctx.inv) return;
      ready(game, e.id);
      flags.noAttack.set(game, [e.id, ctx.inv], currentRound(game));
    },
  },
} satisfies CardScript;
