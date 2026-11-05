// Bandolier (level 2) — two more hand slots for [[Weapon]] assets (cards.json); +1 [willpower] while [[Weapon]] assets
// fill 2 or more of your hand slots
import {
  type CardScript,
  controlled,
  def,
  type EffCtx,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  conditions: {
    twoHandsOfWeapons: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you &&
      controlled(game, ctx.you)
        .filter((c) => def(game, c.id).traits.includes("Weapon"))
        .reduce((n, c) => n + def(game, c.id).slots.filter((s) => s === "hand").length, 0) >= 2,
  },
} satisfies CardScript;
