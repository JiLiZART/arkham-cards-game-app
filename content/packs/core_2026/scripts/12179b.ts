// Elokoss (Mother of Flame) — after you evade her: she readies and cannot attack you this round
import {
  cardIf,
  type CardScript,
  currentRound,
  flags,
  type GameContext,
  ready,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    unbowed(game: GameContext, run: ScriptRun) {
      const e = cardIf(game, run.source);
      if (e?.zone !== "enemy" || run.ctx.enemy !== e.id || !run.ctx.inv) return;
      ready(game, e.id);
      flags.noAttack.set(game, [e.id, run.ctx.inv], currentRound(game));
    },
  },
} satisfies CardScript;
