// Caught Cheating (Return to The House Always Wins) — surge (its keyword); each player who has "cheated" (Beginner's
// Luck, Raise the Stakes) loses 2 resources and takes 1 damage
import {
  activeInvs,
  type CardScript,
  flags,
  type GameContext,
  queue,
  resolveEffects,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "caught" }],
  fns: {
    caught(game: GameContext, run: ScriptRun) {
      const cheats = activeInvs(game).filter((i) => flags.remembered.get(game, ["cheated", i]));
      queue(
        game,
        ...cheats.map((i) =>
          resolveEffects({
            effects: [
              { op: "loseResources", amount: 2 },
              { op: "takeDamage", amount: 1 },
            ],
            ctx: { ...run.ctx, you: i },
          }),
        ),
      );
    },
  },
} satisfies CardScript;
