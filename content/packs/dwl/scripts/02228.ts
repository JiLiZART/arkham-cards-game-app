// Expose Weakness — an intellect test against an enemy at your location's fight value; each point it succeeds by lowers
// that fight value by 1 for the next attack against the enemy this phase
import {
  addTempMod,
  type CardScript,
  enemiesAt,
  enemyStat,
  type EffCtx,
  type GameContext,
  inv,
  type ScriptRun,
  startTest,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "onPlay",
      anyWindow: true,
      condition: { enemyAtYourLocation: true },
      run: "expose",
    },
  ],
  fns: {
    expose(game: GameContext, run: ScriptRun) {
      const enemy = run.chooseCard(
        enemiesAt(game, inv(game, run.you).location).map((e) => e.id),
        { text: "Expose Weakness: choose an enemy", key: "chooseEnemy" },
      );
      const ctx: EffCtx = { ...run.ctx, enemy };
      startTest(game, {
        inv: run.you,
        skill: "intellect",
        kind: "plain",
        difficulty: enemyStat(game, enemy, "fight"),
        source: run.ctx.source,
        target: enemy,
        ctx,
        onSuccess: [{ op: "script", fn: "weaken" }],
      });
    },
    weaken(game: GameContext, run: ScriptRun) {
      const by = run.ctx.succeedBy ?? 0;
      const enemy = run.ctx.enemy;
      if (by > 0 && enemy)
        addTempMod(
          game,
          { stat: "fight", value: -by },
          enemy,
          "phase",
          run.ctx.source ?? null,
          true,
        );
    },
  },
} satisfies CardScript;
