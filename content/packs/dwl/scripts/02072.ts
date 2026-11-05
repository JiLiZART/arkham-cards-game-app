// Clover Club Bar — while it is act 1: spend 2 resources to gain 2 clues and draw 2 cards, and you have "had a drink"
// (limit once per game)
import {
  type CardScript,
  flags,
  type GameContext,
  type ScriptRun,
  queue,
  drawCards,
  resolveEffect,
} from "../../../../src/engine/api";
import { actOne } from "./02071";

export default {
  abilities: [
    {
      kind: "action",
      label: "Clover Club Bar: spend 2 resources to gain 2 clues and draw 2 cards",
      cost: { resources: 2 },
      limit: { per: "game", count: 1 },
      condition: { script: "actOne" },
      run: "drink",
    },
  ],
  conditions: { actOne },
  fns: {
    drink(game: GameContext, run: ScriptRun) {
      flags.remembered.set(game, ["hadADrink", run.you], true);
      queue(
        game,
        resolveEffect({
          effect: { op: "gainClues", amount: 2 },
          ctx: { ...run.ctx, you: run.you },
        }),
        drawCards({ inv: run.you, n: 2 }),
      );
    },
  },
} satisfies CardScript;
