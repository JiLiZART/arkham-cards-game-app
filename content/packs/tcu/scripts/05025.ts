// Connect the Dots — after you discover the last clue at your location: discover 2 clues at a location with a lower printed shroud
import {
  ask,
  def,
  inv,
  locations,
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  type InstId,
  type Step,
  CHOICE,
  STEP,
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
    connect(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const loc = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Connect the Dots: discover 2 clues at a location with a lower shroud",
        lower(game, ctx.you!).map((l) => ({
          id: l.id,
          label: def(game, l.id).name,
          card: l.id,
          value: l.id,
        })),
        { auto: true, key: "cardChooseLocation", vars: { card: ctx.source ?? null } },
      );
      if (loc === undefined) return;
      push(game, { t: STEP.DiscoverClues, inv: ctx.you!, location: loc, n: 2 });
    },
  },
} satisfies CardScript;
