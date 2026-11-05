// Lucky Dice — when you reveal a token other than the auto-fail, spend 2 resources: it is ignored and another is
// revealed in its place; an auto-fail revealed that way removes the dice from the game
import {
  type CardScript,
  currentTest,
  type EffCtx,
  flags,
  type GameContext,
  ignoreToken,
  moveCard,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

/** the token the dice made the test reveal: the one at the place of the token they ignored */
const rollKey = (game: GameContext, dice: string) => {
  const t = currentTest(game);
  return t ? `luckyDice:${dice}:${t.id}:${t.tokens.length}` : null;
};

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "tokenRevealed",
      label: "Lucky Dice: spend 2 resources to ignore the token and reveal another",
      cost: { resources: 2 },
      condition: { all: [{ yourSkillTest: true }, { not: { tokenIs: ["autoFail"] } }] },
      effects: [{ op: "script", fn: "roll" }],
    },
    {
      kind: "forced",
      trigger: "tokenRevealed",
      condition: { all: [{ tokenIs: ["autoFail"] }, { script: "rolled" }] },
      effects: [{ op: "script", fn: "lost" }],
    },
  ],
  conditions: {
    rolled: (game: GameContext, ctx: EffCtx) => {
      const key = ctx.source ? rollKey(game, ctx.source) : null;
      return !!key && !!flags.named(game, key);
    },
  },
  fns: {
    roll(game: GameContext, run: ScriptRun) {
      const key = rollKey(game, run.source);
      if (key) flags.setNamed(game, key, true);
      ignoreToken(game);
    },
    lost(game: GameContext, run: ScriptRun) {
      moveCard(game, run.source, ZONE.Removed);
    },
  },
} satisfies CardScript;
