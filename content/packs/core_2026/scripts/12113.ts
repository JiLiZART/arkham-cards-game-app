// Your Friend's Room — an enemy at a connecting location moves here and engages you
import {
  ask,
  card,
  type CardScript,
  connections,
  def,
  type EffCtx,
  emit,
  enemiesAt,
  type GameContext,
  type InstId,
  invName,
  push,
  setCardLocation,
  setEngaged,
  type Step,
  win,
  EVENT,
  CHOICE,
} from "../../../../src/engine/api";

export default {
  conditions: {
    enemyNextDoor: (game: GameContext, ctx: EffCtx) =>
      connections(game, ctx.source!).some((l) => enemiesAt(game, l).length > 0),
  },
  fns: {
    lure(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = ctx.source!;
      const near = connections(game, here).flatMap((l) => enemiesAt(game, l));
      if (!near.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Choose an enemy at a connecting location",
        near.map((e) => ({ id: e.id, label: def(game, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      const e = card(game, pick);
      setCardLocation(game, e.id, here);
      setEngaged(game, e.id, ctx.you!);
      emit(
        game,
        EVENT.Engage,
        `${def(game, pick).name} moves here and engages ${invName(game, ctx.you!)}`,
        {
          inv: ctx.you!,
          card: pick,
        },
      );
      push(
        game,
        win("enemyEntersLocation", { enemy: pick, location: here }),
        win("enemyEngages", { inv: ctx.you!, enemy: pick }),
      );
    },
  },
} satisfies CardScript;
