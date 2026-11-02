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
  type GameContext,
  type InstId,
  type Step,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

const humanoidsHere = (game: GameContext, i: string) =>
  enemiesAt(game, inv(game, i).location).filter((e) => def(game, e.id).traits.includes("Humanoid"));

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
    humanoidHere: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && humanoidsHere(game, ctx.you).length > 0,
  },
  fns: {
    interrogate(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const enemy = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Interrogate: choose a Humanoid enemy",
        humanoidsHere(game, ctx.you!).map((e) => ({
          id: e.id,
          label: def(game, e.id).name,
          card: e.id,
          value: e.id,
        })),
        { auto: true, key: "chooseEnemy" },
      );
      if (enemy === undefined) return;
      startTest(game, {
        inv: ctx.you!,
        skill: "combat",
        kind: "plain",
        difficulty: 3 + enemyStat(game, enemy, "damage"),
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
    elsewhere(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = inv(game, ctx.you!).location;
      const cands = locations(game).filter((l) => l.id !== here && l.revealed && l.clues > 0);
      if (!cands.length) return;
      const loc = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Interrogate: discover 1 clue at another location",
        cands.map((l) => ({ id: l.id, label: def(game, l.id).name, card: l.id, value: l.id })),
        { auto: true, key: "cardChooseLocation", vars: { card: ctx.source ?? null } },
      );
      if (loc === undefined || !card(game, loc)) return;
      push(game, { t: STEP.DiscoverClues, inv: ctx.you!, location: loc, n: 1 });
    },
  },
} satisfies CardScript;
