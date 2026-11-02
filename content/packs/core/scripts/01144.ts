// The Ritual Begins (Devourer Below, agenda 2) — back: each investigator tests willpower (6); failures gain a random Madness weakness
import {
  type CardScript,
  createCard,
  def,
  type EffCtx,
  emit,
  type GameContext,
  inv,
  push,
  randomInt,
  resolveWeakness,
  resolvesOnDraw,
  turnOrder,
  EVENT,
  ZONE,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, ctx: EffCtx) {
      for (const i of turnOrder(game)) {
        if (inv(game, i).status !== "playing") continue;
        push(game, {
          t: STEP.Eff,
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: 6,
            onFail: [{ op: "script", fn: "madness" }],
          },
          ctx: { you: i, source: ctx.source },
        });
      }
    },
    madness(game: GameContext, ctx: EffCtx) {
      const pool = Object.values(game.db.cards).filter(
        (c) => c.subtype === "basicweakness" && c.traits.includes("Madness"),
      );
      if (!pool.length) return;
      const pick = pool[randomInt(game, pool.length)];
      const id = createCard(game, pick.code, ZONE.Hand, ctx.you!);
      emit(
        game,
        EVENT.Weakness,
        `${inv(game, ctx.you!).name} adds ${def(game, id).name} to their hand`,
        {
          inv: ctx.you!,
          card: id,
        },
      );
      // a weakness that enters the hand without being drawn resolves as if drawn (Grimoire, Weakness)
      if (resolvesOnDraw(game, id)) resolveWeakness(game, ctx.you!, id);
    },
  },
} satisfies CardScript;
