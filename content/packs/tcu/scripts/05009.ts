// Detective's Colt 1911s — up to 2 Tool assets take no hand slot; a defeat by its attack may send an Insight event to Joe's hunch deck
import { inv, type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import { insightToHunch } from "./05002";

export default {
  abilities: [
    { kind: "constant", modifiers: [{ stat: "handSlots", value: 2, filter: { trait: "Tool" } }] },
    {
      kind: "action",
      designator: "fight",
      label: "Detective's Colt 1911s: fight (+1 combat, +1 damage)",
      cost: { uses: 1 },
      condition: { enemyAtYourLocation: true },
      effects: [
        { op: "fight", bonus: 1, damageBonus: 1, onDefeat: [{ op: "script", fn: "toHunch" }] },
      ],
    },
  ],
  fns: {
    toHunch(game: GameContext, run: ScriptRun) {
      if (inv(game, run.you)) insightToHunch(game, run.you, run.step);
    },
  },
} satisfies CardScript;
