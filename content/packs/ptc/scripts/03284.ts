// Grand Rue (Black Stars Rise) — Forced: after you succeed at a skill test by 1 or less while investigating it, 1 doom
// on the agenda with the most doom (tied: you choose).
import {
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  inv,
  type ScriptRun,
  queue,
  placeDoom,
} from "../../../../src/engine/api";
import { agendasInPlay } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "successfulInvestigate",
      condition: { script: "byOneHere" },
      run: "rue",
    },
  ],
  conditions: {
    byOneHere: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv &&
      inv(game, ctx.inv).location === ctx.source &&
      ctx.succeedBy !== undefined &&
      ctx.succeedBy <= 1,
  },
  fns: {
    rue(game: GameContext, run: ScriptRun) {
      const all = agendasInPlay(game);
      if (!all.length) return;
      const most = Math.max(...all.map((id) => card(game, id).doom));
      const pick = run.chooseCard(
        all.filter((id) => card(game, id).doom === most),
        { text: "Place 1 doom on which agenda?", key: "bsrDoomOnWhich" },
      );
      queue(game, placeDoom({ card: pick, n: 1 }));
    },
  },
} satisfies CardScript;
