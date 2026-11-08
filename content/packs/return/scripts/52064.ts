// High Priest of Hastur (Return to Dim Carcosa): Spawn - Palace of the King; Prey - most cards in hand; Hunter (data).
// Forced - when he attacks you while you hold a Possession: it is revealed, and you are eliminated and driven insane.
import {
  card,
  type CardScript,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  inv,
  invName,
  type ScriptRun,
  EVENT,
  queue,
  defeatInvestigator,
} from "../../../../src/engine/api";
import { POSSESSION } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

const possession = (game: GameContext, i: string) =>
  inv(game, i).hand.find((h) => POSSESSION.includes(card(game, h).code));

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "enemyAttacks",
      condition: { script: "holdsPossession" },
      run: "welcome",
    },
  ],
  conditions: {
    holdsPossession: (game: GameContext, ctx: EffCtx) =>
      ctx.enemy === ctx.source && !!ctx.inv && !!possession(game, ctx.inv),
  },
  fns: {
    welcome(game: GameContext, run: ScriptRun) {
      const i = run.ctx.inv;
      const p = i && possession(game, i);
      if (!i || !p || inv(game, i).status !== "playing") return;
      emit(
        game,
        EVENT.Reveal,
        `${invName(game, i)} reveals Possession: welcomed into the company of the King`,
        {
          inv: i,
          card: p,
        },
      );
      flags.insane.set(game, i, true);
      queue(game, defeatInvestigator({ inv: i, by: "effect" }));
    },
  },
} satisfies CardScript;
