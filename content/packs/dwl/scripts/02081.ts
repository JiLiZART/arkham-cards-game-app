// Something in the Drinks — surge; each player who has "had a drink" (the Clover Club Bar) loses 1 action
import {
  type CardScript,
  flags,
  type GameContext,
  inv,
  turnOrder,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "drinks" }],
  fns: {
    drinks(game: GameContext, run: ScriptRun) {
      queue(
        game,
        ...turnOrder(game)
          .filter(
            (i) =>
              inv(game, i).status === "playing" && flags.remembered.get(game, ["hadADrink", i]),
          )
          .map((i) =>
            resolveEffect({
              effect: { op: "loseActions", amount: 1 },
              ctx: { ...run.ctx, you: i },
            }),
          ),
      );
    },
  },
} satisfies CardScript;
