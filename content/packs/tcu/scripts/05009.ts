// Detective's Colt 1911s — up to 2 Tool assets take no hand slot; a defeat by its attack may send an Insight event to Joe's hunch deck
import { inv, type CardScript, type EffCtx, type G, type Step } from "../../../../src/engine/api";
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
    toHunch(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      if (inv(g, ctx.you!)) insightToHunch(g, ctx.you!, step);
    },
  },
} satisfies CardScript;
