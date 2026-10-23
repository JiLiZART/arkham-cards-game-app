// Your Friend's Room — an enemy at a connecting location moves here and engages you
import {
  ask,
  connections,
  def,
  emit,
  enemiesAt,
  invName,
  push,
  win,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  conditions: {
    enemyNextDoor: (g: G, ctx: EffCtx) =>
      connections(g, ctx.source!).some((l) => enemiesAt(g, l).length > 0),
  },
  fns: {
    lure(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = ctx.source!;
      const near = connections(g, here).flatMap((l) => enemiesAt(g, l));
      if (!near.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Choose an enemy at a connecting location",
        near.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      const e = g.s.cards[pick];
      e.location = here;
      e.engagedWith = ctx.you!;
      emit(g, "engage", `${def(g, pick).name} moves here and engages ${invName(g, ctx.you!)}`, {
        inv: ctx.you!,
        card: pick,
      });
      push(
        g,
        win("enemyEntersLocation", { enemy: pick, location: here }),
        win("enemyEngages", { inv: ctx.you!, enemy: pick }),
      );
    },
  },
} satisfies CardScript;
