// Connect the Dots — after you discover the last clue at your location: discover 2 clues at a location with a lower printed shroud
import {
  def,
  inv,
  locations,
  type CardScript,
  type EffCtx,
  type GameContext,
  type ScriptRun,
  queue,
  discoverClues,
} from "../../../../src/engine/api";

/** revealed locations with clues whose printed shroud is lower than that of your location */
function lower(game: GameContext, you: string) {
  const here = inv(game, you).location;
  const mine = here ? (def(game, here).shroud ?? null) : null;
  if (mine === null) return [];
  return locations(game).filter(
    (l) => l.revealed && l.clues > 0 && (def(game, l.id).shroud ?? Infinity) < mine,
  );
}

export default {
  abilities: [
    {
      kind: "reaction",
      fromHand: true,
      trigger: "cluesDiscovered",
      condition: {
        all: [
          { eventInvestigatorIsYou: true },
          { eventAtYourLocation: true },
          { cluesOnYourLocation: "none" },
          { script: "lowerShroud" },
        ],
      },
      run: "connect",
    },
  ],
  conditions: {
    lowerShroud: (game: GameContext, ctx: EffCtx) => !!ctx.you && lower(game, ctx.you).length > 0,
  },
  fns: {
    connect(game: GameContext, run: ScriptRun) {
      const loc = run.chooseCard(
        lower(game, run.you).map((l) => l.id),
        {
          text: "Connect the Dots: discover 2 clues at a location with a lower shroud",
          key: "cardChooseLocation",
          vars: { card: run.ctx.source ?? null },
        },
      );
      queue(game, discoverClues({ inv: run.you, location: loc, n: 2 }));
    },
  },
} satisfies CardScript;
