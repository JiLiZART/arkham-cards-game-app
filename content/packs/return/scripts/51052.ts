// Naomi O'Bannion (Ruthless Tactician, Return to Where Doom Awaits) — +1 intellect and +1 combat, and her reaction
// (cancel a non-auto-fail token revealed at your location in an intellect or combat test), are in cards.json; for the
// rest of that test, another copy of the cancelled token is cancelled too and a new one revealed
import {
  type CardScript,
  type EffCtx,
  flags,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";

const key = (ctx: EffCtx) => `naomi:${ctx.testId}:${ctx.token}`;

export default {
  fns: {
    naomiMark(game: GameContext, run: ScriptRun) {
      if (run.ctx.testId !== undefined && run.ctx.token) flags.setNamed(game, key(run.ctx), true);
    },
  },
  conditions: {
    naomiAgain: (game: GameContext, ctx: EffCtx) =>
      ctx.testId !== undefined && !!ctx.token && !!flags.named(game, key(ctx)),
  },
} satisfies CardScript;
