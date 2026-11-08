// Dianne Devine, Knows What You're Up To (Return to The Last King; her Sickening Reality's enemy side) — Prey: most clues
// (her data); Hunter; +3 health per investigator; after any investigator performs a parley action she moves once toward
// that investigator (an engaged Dianne stays), engaging them if she reaches them.
import {
  canEnemyEnter,
  card,
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  inv,
  invsAt,
  playerCount,
  type ScriptRun,
  setCardLocation,
  setEngaged,
  stepsToward,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "parleyed", run: "approach" }],
  modifiers: (game: GameContext, id: string) => [
    { target: id, mod: { stat: "enemyHealth", value: 3 * playerCount(game) } },
  ],
  fns: {
    approach(game: GameContext, run: ScriptRun) {
      const her = card(game, run.source);
      const who = run.ctx.inv;
      const to = who ? inv(game, who).location : null;
      if (!who || !to || her.engagedWith || !her.location || her.location === to) return;
      const next = stepsToward(game, her.location, [to]).filter((l) =>
        canEnemyEnter(game, her.id, l),
      )[0];
      if (!next) return;
      setCardLocation(game, her.id, next);
      emit(game, EVENT.EnemyMove, `${def(game, her.id).name} moves to ${def(game, next).name}`, {
        card: her.id,
        data: { to: next },
      });
      if (!invsAt(game, next).includes(who)) return;
      setEngaged(game, her.id, who);
      emit(game, EVENT.Engage, `${def(game, her.id).name} engages ${inv(game, who).name}`, {
        card: her.id,
        inv: who,
      });
    },
  },
} satisfies CardScript;
