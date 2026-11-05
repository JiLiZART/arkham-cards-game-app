// Chicago Typewriter — [action] spend 1 ammo: Fight, spending any number of additional actions on it; +2 [combat] for
// each action spent (this ability's own included), +2 damage
import {
  type CardScript,
  type GameContext,
  inv,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "action",
      designator: "fight",
      label: "Chicago Typewriter: fight (+2 combat per action spent, +2 damage)",
      cost: { uses: 1 },
      condition: { enemyAtYourLocation: true },
      run: "fire",
    },
  ],
  fns: {
    fire(game: GameContext, run: ScriptRun) {
      const left = inv(game, run.you).actionsLeft;
      const more = run.choose<number>(
        Array.from({ length: left + 1 }, (_, n) => ({
          id: String(n),
          label: `Spend ${n} more action(s): +${2 * (n + 1)} combat`,
          value: n,
          key: "option.spendMoreActions",
          vars: { n, bonus: 2 * (n + 1) },
        })),
        { text: "Chicago Typewriter: spend more actions?", key: "spendMoreActions" },
      );
      queue(
        game,
        ...(more
          ? [resolveEffect({ effect: { op: "loseActions", amount: more }, ctx: run.ctx })]
          : []),
        resolveEffect({
          effect: { op: "fight", bonus: 2 * (more + 1), damageBonus: 2 },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
