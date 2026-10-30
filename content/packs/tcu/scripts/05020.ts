// Interrogate — Parley: test [combat] (3 + a Humanoid enemy's damage) to discover a clue here and one at any other location
import {
  ask,
  card,
  def,
  enemiesAt,
  enemyStat,
  inv,
  locations,
  push,
  startTest,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

const humanoidsHere = (g: G, i: string) =>
  enemiesAt(g, inv(g, i).location).filter((e) => def(g, e.id).traits.includes("Humanoid"));

export default {
  abilities: [
    {
      kind: "onPlay",
      designator: "parley",
      condition: { script: "humanoidHere" },
      run: "interrogate",
    },
  ],
  conditions: {
    humanoidHere: (g: G, ctx: EffCtx) => !!ctx.you && humanoidsHere(g, ctx.you).length > 0,
  },
  fns: {
    interrogate(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const enemy = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Interrogate: choose a Humanoid enemy",
        humanoidsHere(g, ctx.you!).map((e) => ({
          id: e.id,
          label: def(g, e.id).name,
          card: e.id,
          value: e.id,
        })),
        { auto: true, key: "chooseEnemy" },
      );
      if (enemy === undefined) return;
      startTest(g, {
        inv: ctx.you!,
        skill: "combat",
        kind: "plain",
        difficulty: 3 + enemyStat(g, enemy, "damage"),
        source: ctx.source,
        target: enemy,
        ctx,
        onSuccess: [
          { op: "discoverClues", amount: 1 },
          { op: "script", fn: "elsewhere" },
        ],
      });
    },
    /** 1 clue at another location of your choice */
    elsewhere(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = inv(g, ctx.you!).location;
      const cands = locations(g).filter((l) => l.id !== here && l.revealed && l.clues > 0);
      const loc = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Interrogate: discover 1 clue at another location",
        cands.map((l) => ({ id: l.id, label: def(g, l.id).name, card: l.id, value: l.id })),
        { auto: true, key: "cardChooseLocation", vars: { card: ctx.source ?? null } },
      );
      if (loc === undefined || !card(g, loc)) return;
      push(g, { t: "DiscoverClues", inv: ctx.you!, location: loc, n: 1 });
    },
  },
} satisfies CardScript;
