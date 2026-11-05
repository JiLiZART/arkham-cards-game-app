// Balcony (Curtain Call) — after you move from the Balcony to the Theatre (its one-way drop): take 2 damage.
import {
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  inv,
} from "../../../../src/engine/api";
import { THEATRE } from "../../../campaigns/the-path-to-carcosa/scripts/curtain-call";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "leftLocation",
      condition: { script: "toTheatre" },
      effects: [{ op: "takeDamage", amount: 2 }],
    },
  ],
  conditions: {
    toTheatre: (game: GameContext, ctx: EffCtx) => {
      const at = ctx.inv ? inv(game, ctx.inv).location : null;
      return !!at && card(game, at).code === THEATRE;
    },
  },
} satisfies CardScript;
