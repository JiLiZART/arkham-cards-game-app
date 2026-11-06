// Snare Trap — attached to your location (one per location); after a non-Elite enemy enters it, the enemy is exhausted,
// disengaged and the trap attached to it; when that enemy would ready, the trap is discarded instead
import {
  attachTo,
  card,
  cardIf,
  type CardScript,
  def,
  type EffCtx,
  emit,
  EVENT,
  exhaust,
  type GameContext,
  moveCard,
  type ScriptRun,
  setEngaged,
  ZONE,
} from "../../../../src/engine/api";

const onEnemy = (game: GameContext, ctx: EffCtx) =>
  !!ctx.source && !!card(game, ctx.source).attachedTo;

export default {
  abilities: [
    {
      kind: "onPlay",
      effects: [{ op: "attachToLocation", where: "yours", limitOnePerLocation: true }],
    },
    {
      kind: "forced",
      trigger: "enemyEntersLocation",
      condition: { all: [{ not: { script: "onEnemy" } }, { eventEnemy: { elite: false } }] },
      run: "snare",
    },
    {
      kind: "forced",
      trigger: "enemyWouldReady",
      condition: { script: "onEnemy" },
      effects: [{ op: "skipNextReady" }, { op: "discardSelf" }],
    },
  ],
  conditions: { onEnemy },
  fns: {
    snare(game: GameContext, run: ScriptRun) {
      const enemy = run.ctx.enemy;
      if (!enemy || cardIf(game, enemy)?.zone !== ZONE.Enemy) return;
      exhaust(game, enemy);
      setEngaged(game, enemy, null);
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, enemy);
      emit(game, EVENT.Attach, `Snare Trap is attached to ${def(game, enemy).name}`, {
        card: run.source,
      });
    },
  },
} satisfies CardScript;
