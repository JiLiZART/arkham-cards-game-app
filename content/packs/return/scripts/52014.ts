// Return to Curtain Call's setup card, attached to Royal Emissary by the scenario's setup — it is never detached (it stays
// on him in the victory display); after he is added to the victory display it gains a resource, as a warning; for each
// warning he gets +1 health per investigator.
import {
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  playerCount,
  ZONE,
} from "../../../../src/engine/api";

export const EMISSARY = "03060";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "enemyDefeated",
      condition: { script: "emissaryInVictory" },
      effects: [{ op: "placeTokens", on: "self", resources: 1 }],
    },
  ],
  conditions: {
    emissaryInVictory: (game: GameContext, ctx: EffCtx) =>
      !!ctx.enemy &&
      ctx.enemy === card(game, ctx.source!).attachedTo &&
      card(game, ctx.enemy).zone === ZONE.Victory,
  },
  modifiers: (game: GameContext, id: string) => {
    const c = card(game, id);
    return c.attachedTo && c.resources
      ? [
          {
            target: c.attachedTo,
            mod: { stat: "enemyHealth", value: c.resources * playerCount(game) },
          },
        ]
      : [];
  },
} satisfies CardScript;
