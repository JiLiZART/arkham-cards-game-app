// Carolyn Fern — after one of your card effects heals horror, the healed card's controller gains 1 resource; elder sign: you may heal 1 horror here
import {
  card,
  push,
  threatArea,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "horrorHealed",
      label: "Carolyn Fern: the healed card's controller gains 1 resource",
      condition: {
        all: [{ eventInvestigatorIsYou: true }, { not: { script: "rationalThought" } }],
      },
      run: "gain",
    },
    { kind: "elderSign", tokenValue: 1, run: "elder" },
  ],
  conditions: {
    /** Rational Thought: "You cannot gain resources from Carolyn Fern's [reaction] ability" */
    rationalThought: (g: G, ctx: EffCtx) =>
      !!ctx.you && threatArea(g, ctx.you).some((c) => c.code === "05008"),
  },
  fns: {
    gain(g: G, ctx: EffCtx) {
      const healed = card(g, ctx.card!);
      const who = healed.controller ?? healed.owner;
      if (!who) return;
      push(g, {
        t: "Effects",
        effects: [{ op: "gainResources", amount: 1, target: "eventInvestigator" }],
        ctx: { ...ctx, inv: who },
      });
    },
    elder(g: G, ctx: EffCtx) {
      push(g, {
        t: "Effects",
        effects: [
          {
            op: "chooseOne",
            options: [
              {
                label: "Heal 1 horror from an investigator or Ally asset at your location",
                effects: [
                  { op: "heal", horror: 1, target: "chooseAtLocation", targetAlly: "atLocation" },
                ],
              },
              { label: "Don't heal", effects: [] },
            ],
          },
        ],
        ctx: { you: ctx.you, source: ctx.source },
      });
    },
  },
} satisfies CardScript;
