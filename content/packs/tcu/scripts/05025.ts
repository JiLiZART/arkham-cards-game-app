// Connect the Dots — after you discover the last clue at your location: discover 2 clues at a location with a lower printed shroud
import {
  ask,
  def,
  inv,
  locations,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

/** revealed locations with clues whose printed shroud is lower than that of your location */
function lower(g: G, you: string) {
  const here = inv(g, you).location;
  const mine = here ? (def(g, here).shroud ?? null) : null;
  if (mine === null) return [];
  return locations(g).filter(
    (l) => l.revealed && l.clues > 0 && (def(g, l.id).shroud ?? Infinity) < mine,
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
    lowerShroud: (g: G, ctx: EffCtx) => !!ctx.you && lower(g, ctx.you).length > 0,
  },
  fns: {
    connect(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const loc = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Connect the Dots: discover 2 clues at a location with a lower shroud",
        lower(g, ctx.you!).map((l) => ({
          id: l.id,
          label: def(g, l.id).name,
          card: l.id,
          value: l.id,
        })),
        { auto: true, key: "cardChooseLocation", vars: { card: ctx.source ?? null } },
      );
      if (loc === undefined) return;
      push(g, { t: "DiscoverClues", inv: ctx.you!, location: loc, n: 2 });
    },
  },
} satisfies CardScript;
