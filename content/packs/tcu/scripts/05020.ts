// Interrogate — Parley: test [combat] (3 + a Humanoid enemy's damage) to discover a clue here and one at any other location
import {
  card,
  def,
  enemiesAt,
  enemyStat,
  inv,
  locations,
  startTest,
  type CardScript,
  type EffCtx,
  type GameContext,
  type ScriptRun,
  queue,
  discoverClues,
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
    interrogate(game: GameContext, run: ScriptRun) {
      const enemy = run.chooseCard(
        humanoidsHere(game, run.you).map((e) => e.id),
        { text: "Interrogate: choose a Humanoid enemy", key: "chooseEnemy" },
      );
      startTest(game, {
        inv: run.you,
        skill: "combat",
        kind: "plain",
        difficulty: 3 + enemyStat(game, enemy, "damage"),
        source: run.ctx.source,
        target: enemy,
        ctx: run.ctx,
        onSuccess: [
          { op: "discoverClues", amount: 1 },
          { op: "script", fn: "elsewhere" },
        ],
      });
    },
    /** 1 clue at another location of your choice */
    elsewhere(game: GameContext, run: ScriptRun) {
      const here = inv(game, run.you).location;
      const cands = locations(game).filter((l) => l.id !== here && l.revealed && l.clues > 0);
      if (!cands.length) return;
      const loc = run.chooseCard(
        cands.map((l) => l.id),
        {
          text: "Interrogate: discover 1 clue at another location",
          key: "cardChooseLocation",
          vars: { card: run.ctx.source ?? null },
        },
      );
      if (!card(game, loc)) return;
      queue(game, discoverClues({ inv: run.you, location: loc, n: 1 }));
    },
  },
} satisfies CardScript;
