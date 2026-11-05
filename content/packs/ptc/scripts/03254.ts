// Narrow Shaft (The Pallid Mask) — Forced: when you would move from it to an unrevealed location, test [agility] (3); a
// failure takes 1 damage and cancels the move. Forced: when it is revealed, the topmost Catacombs goes into play above
// or to the right of it.
import {
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";
import { catacombsOneOf } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "wouldMoveOut",
      condition: { script: "toUnrevealed" },
      effects: [
        {
          op: "skillTest",
          skill: "agility",
          difficulty: 3,
          onFail: [{ op: "takeDamage", amount: 1 }, { op: "cancel" }],
        },
      ],
    },
    { kind: "forced", trigger: "revealed", run: "reveal" },
  ],
  conditions: {
    toUnrevealed: (game: GameContext, ctx: EffCtx) => !!ctx.to && !card(game, ctx.to).revealed,
  },
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      catacombsOneOf(game, run, run.source, ["above", "right"]);
    },
  },
} satisfies CardScript;
