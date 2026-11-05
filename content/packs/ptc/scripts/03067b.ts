// Ishimaru Haruko (The Last King, Possessed) — hunter; after you deal damage to her by an effect other than an attack:
// draw the top card of the encounter deck.
import {
  type CardScript,
  currentTest,
  type EffCtx,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "enemyDamaged",
      condition: { script: "notAnAttack" },
      effects: [{ op: "drawEncounterCard" }],
    },
  ],
  conditions: {
    notAnAttack: (game: GameContext, ctx: EffCtx) => {
      const t = currentTest(game);
      return !(t && t.kind === "fight" && t.target === ctx.enemy);
    },
  },
} satisfies CardScript;
