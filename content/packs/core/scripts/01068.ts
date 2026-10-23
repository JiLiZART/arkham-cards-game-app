// Mind Wipe — a non-Elite enemy at your location has a blank text box until the end of the phase
import {
  addTempMod,
  ask,
  def,
  emit,
  enemiesAt,
  inv,
  isElite,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    wipe(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = enemiesAt(g, inv(g, ctx.you!).location).filter((e) => !isElite(g, e.id));
      if (!here.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Mind Wipe: choose an enemy",
        here.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      addTempMod(g, { flag: "blankText" }, pick, "phase", ctx.source ?? null);
      emit(g, "blank", `${def(g, pick).name}'s text box is blank until the end of the phase`, {
        card: pick,
      });
    },
  },
} satisfies CardScript;
