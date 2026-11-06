// Key of Ys — +1 to each of your skills per horror on it; when horror would be placed on you, 1 of it goes on Key of Ys
// instead; when it leaves play, the top 10 cards of your deck are discarded (cards.json leavesPlay)
import {
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  type InstId,
} from "../../../../src/engine/api";

const SKILLS = ["willpower", "intellect", "combat", "agility"] as const;

export default {
  modifiers(game: GameContext, cardId: InstId) {
    const c = card(game, cardId);
    const who = c.controller;
    if (c.zone !== "play" || !who || !c.horror) return [];
    return SKILLS.map((stat) => ({ target: who, mod: { stat, value: c.horror } }));
  },
  abilities: [
    {
      kind: "forced",
      trigger: "damageDealt",
      condition: { script: "horrorOnYou" },
      effects: [
        { op: "preventDamage", amount: 1, kind: "horror" },
        { op: "placeTokens", on: "self", horror: 1 },
      ],
    },
  ],
  conditions: {
    horrorOnYou: (game: GameContext, ctx: EffCtx) =>
      ctx.inv === ctx.you && (ctx.dealt?.[1] ?? 0) > 0,
  },
} satisfies CardScript;
