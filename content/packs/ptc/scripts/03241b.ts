// Specter of Death (The Pallid Mask, agenda 1's back): spawns at the starting location; hunter, retaliate. While
// exhausted, each attack against it deals 1 less damage. Forced: after you fail a test to evade it, it attacks you.
import {
  card,
  type CardScript,
  currentTest,
  type EffCtx,
  type GameContext,
} from "../../../../src/engine/api";

const testAgainst = (game: GameContext, ctx: EffCtx, kind: "fight" | "evade") => {
  const t = currentTest(game);
  return !!ctx.source && t?.kind === kind && t.target === ctx.source;
};

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "dealDamage",
      condition: { script: "exhaustedAttacked" },
      effects: [{ op: "addDamage", amount: -1 }],
    },
    {
      kind: "forced",
      trigger: "skillTestFailed",
      condition: { script: "evading" },
      effects: [{ op: "enemyAttack" }],
    },
  ],
  conditions: {
    exhaustedAttacked: (game: GameContext, ctx: EffCtx) =>
      !!ctx.source && card(game, ctx.source).exhausted && testAgainst(game, ctx, "fight"),
    evading: (game: GameContext, ctx: EffCtx) => testAgainst(game, ctx, "evade"),
  },
} satisfies CardScript;
