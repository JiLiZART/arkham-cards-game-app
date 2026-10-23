// Black Chamber Operative — evaded: place 1 of your clues on your location, or it readies, engages you and attacks
import {
  card,
  def,
  emit,
  inv,
  invName,
  push,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  fns: {
    evaded(g: G, ctx: EffCtx) {
      const who = ctx.inv!;
      const me = inv(g, who);
      if (me.clues > 0 && me.location) {
        me.clues--;
        card(g, me.location).clues++;
        emit(g, "clues", `${me.name} places 1 clue on ${def(g, me.location).name}`, {
          inv: who,
          card: me.location,
          data: { n: 1, placed: true },
        });
        return;
      }
      const e = g.s.cards[ctx.source!];
      if (e?.zone !== "enemy") return;
      e.exhausted = false;
      e.engagedWith = who;
      emit(g, "engage", `${def(g, e.id).name} engages ${invName(g, who)}`, {
        inv: who,
        card: e.id,
      });
      push(g, { t: "EnemyAttack", enemy: e.id, inv: who, aoo: false, key: `atk${g.s.seq++}` });
    },
  },
} satisfies CardScript;
