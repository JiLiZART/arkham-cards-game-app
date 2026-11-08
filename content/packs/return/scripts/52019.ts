// Prop Shop (Return to Curtain Call, a Backstage Doorway) — while you investigate it, it gets -1 shroud for each horror
// on you; after you fail a skill test while investigating it, you take 1 horror.
import {
  type CardScript,
  currentTest,
  type EffCtx,
  type GameContext,
  inv,
} from "../../../../src/engine/api";

/** the test under way is an investigation of this location */
const investigating = (game: GameContext, loc: string | null | undefined) => {
  const t = currentTest(game);
  return !!loc && t?.kind === "investigate" && t.target === loc ? t : null;
};

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "skillTestFailed",
      condition: { script: "investigatingHere" },
      effects: [{ op: "takeHorror", amount: 1 }],
    },
  ],
  conditions: {
    investigatingHere: (game: GameContext, ctx: EffCtx) =>
      investigating(game, ctx.source)?.inv === (ctx.inv ?? ctx.you),
  },
  modifiers: (game: GameContext, id: string) => {
    const t = investigating(game, id);
    const horror = t ? inv(game, t.inv).horror : 0;
    return horror ? [{ target: id, mod: { stat: "shroud", value: -horror } }] : [];
  },
} satisfies CardScript;
