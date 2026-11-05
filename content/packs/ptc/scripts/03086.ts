// Swift Byakhee (Byakhee): prey the lowest remaining sanity; hunter, retaliate. Forced: when it would move by the hunter
// keyword, it moves instead, one location at a time, until it enters its prey's location; if it moved more than one
// location it does not attack this phase. (Its first step is the hunter move; this goes on from there.)
import {
  activeInvs,
  asNumber,
  canEnemyEnter,
  card,
  currentPhase,
  currentRound,
  flags,
  type CardScript,
  def,
  distances,
  type EffCtx,
  emit,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  invsAt,
  isAloof,
  remainingSanity,
  type ScriptRun,
  setCardLocation,
  setEngaged,
  stepsToward,
  turnOrder,
  PHASE,
  EVENT,
  queue,
  runScript,
} from "../../../../src/engine/api";

/** "after it moves from the hunter keyword, if it is unengaged" (the enemy phase's moves) */
export const huntedUnengaged = (game: GameContext, ctx: EffCtx, self: InstId) =>
  ctx.enemy === self && currentPhase(game) === PHASE.Enemy && !card(game, self).engagedWith;

/** the enemy can't attack anyone for the rest of this phase (the round's enemy phase) */
export function noAttackThisPhase(game: GameContext, enemy: InstId) {
  for (const i of turnOrder(game)) flags.noAttack.set(game, [enemy, i], currentRound(game));
}

/**
 * one hunter step for an enemy toward the nearest of `toward` (the lead choosing among equal paths), engaging an
 * investigator it finds there unless aloof; false when it can't move
 */
export function huntOnce(game: GameContext, run: ScriptRun, enemy: InstId, toward: InvId[]) {
  const e = card(game, enemy);
  if (!e.location) return false;
  const spots = toward.flatMap((i) => inv(game, i).location ?? []);
  const dist = distances(game, e.location, enemy);
  const near = Math.min(...spots.map((l) => dist.get(l) ?? Infinity));
  if (near === 0 || near === Infinity) return false;
  const options = stepsToward(
    game,
    e.location,
    spots.filter((l) => dist.get(l) === near),
    enemy,
  ).filter((l) => canEnemyEnter(game, enemy, l));
  if (!options.length) return false;
  const to = run.chooseCard(options, {
    text: `Where does ${def(game, enemy).name} move?`,
    key: "enemyMoveWhere",
    vars: { card: enemy },
  });
  setCardLocation(game, enemy, to);
  emit(game, EVENT.EnemyMove, `${def(game, enemy).name} moves to ${def(game, to).name}`, {
    card: enemy,
  });
  const here = invsAt(game, to);
  if (here.length && !isAloof(game, enemy)) {
    setEngaged(game, enemy, here[0]);
    emit(game, EVENT.Engage, `${def(game, enemy).name} engages`, { inv: here[0], card: enemy });
  }
  return true;
}

/** its prey: the investigators with the lowest remaining sanity */
const prey = (game: GameContext) => {
  const all = activeInvs(game);
  const low = Math.min(...all.map((i) => remainingSanity(game, i)));
  return all.filter((i) => remainingSanity(game, i) === low);
};

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "enemyEntersLocation",
      condition: { script: "swooping" },
      run: "swoop",
    },
  ],
  conditions: {
    swooping: (game: GameContext, ctx: EffCtx) =>
      !!ctx.source && huntedUnengaged(game, ctx, ctx.source) && !atPrey(game, ctx.source),
  },
  fns: {
    /** one location at a time: each step its own continuation (a step may ask where) */
    swoop(game: GameContext, run: ScriptRun) {
      const moved = asNumber(run.args) ?? 1;
      if (atPrey(game, run.source) || !huntOnce(game, run, run.source, prey(game))) {
        if (moved > 1) noAttackThisPhase(game, run.source);
        return;
      }
      queue(game, runScript({ code: "03086", fn: "swoop", ctx: run.ctx, args: moved + 1 }));
    },
  },
} satisfies CardScript;

/** at a location with an investigator of its prey */
const atPrey = (game: GameContext, self: InstId) =>
  prey(game).some((i) => inv(game, i).location === card(game, self).location);
