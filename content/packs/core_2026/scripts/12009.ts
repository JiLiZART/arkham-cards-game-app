// Black Chamber Operative — evaded: place 1 of your clues on your location, or it readies, engages you and attacks
import {
  addCounter,
  attackKey,
  cardIf,
  type CardScript,
  def,
  emit,
  type GameContext,
  inv,
  invName,
  ready,
  setEngaged,
  EVENT,
  type ScriptRun,
  queue,
  enemyAttacks,
} from "../../../../src/engine/api";

export default {
  fns: {
    evaded(game: GameContext, run: ScriptRun) {
      const who = run.ctx.inv!;
      const me = inv(game, who);
      if (me.clues > 0 && me.location) {
        addCounter(game, who, "clues", -1);
        addCounter(game, me.location, "clues", 1);
        emit(game, EVENT.Clues, `${me.name} places 1 clue on ${def(game, me.location).name}`, {
          inv: who,
          card: me.location,
          data: { n: 1, placed: true },
        });
        return;
      }
      const e = cardIf(game, run.ctx.source);
      if (e?.zone !== "enemy") return;
      ready(game, e.id);
      setEngaged(game, e.id, who);
      emit(game, EVENT.Engage, `${def(game, e.id).name} engages ${invName(game, who)}`, {
        inv: who,
        card: e.id,
      });
      queue(game, enemyAttacks({ enemy: e.id, inv: who, aoo: false, key: attackKey(game) }));
    },
  },
} satisfies CardScript;
