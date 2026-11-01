// Black Chamber Operative — evaded: place 1 of your clues on your location, or it readies, engages you and attacks
import {
  addCounter,
  attackKey,
  cardIf,
  type CardScript,
  def,
  type EffCtx,
  emit,
  type G,
  inv,
  invName,
  push,
  ready,
  setEngaged,
} from "../../../../src/engine/api";

export default {
  fns: {
    evaded(g: G, ctx: EffCtx) {
      const who = ctx.inv!;
      const me = inv(g, who);
      if (me.clues > 0 && me.location) {
        addCounter(g, who, "clues", -1);
        addCounter(g, me.location, "clues", 1);
        emit(g, "clues", `${me.name} places 1 clue on ${def(g, me.location).name}`, {
          inv: who,
          card: me.location,
          data: { n: 1, placed: true },
        });
        return;
      }
      const e = cardIf(g, ctx.source);
      if (e?.zone !== "enemy") return;
      ready(g, e.id);
      setEngaged(g, e.id, who);
      emit(g, "engage", `${def(g, e.id).name} engages ${invName(g, who)}`, {
        inv: who,
        card: e.id,
      });
      push(g, { t: "EnemyAttack", enemy: e.id, inv: who, aoo: false, key: attackKey(g) });
    },
  },
} satisfies CardScript;
