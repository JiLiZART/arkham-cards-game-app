// The Ritual Begins (Devourer Below, agenda 2) — back: each investigator tests willpower (6); failures gain a random Madness weakness
import {
  type CardScript,
  createCard,
  def,
  emit,
  type GameContext,
  inv,
  randomInt,
  resolveWeakness,
  resolvesOnDraw,
  turnOrder,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      for (const i of turnOrder(game)) {
        if (inv(game, i).status !== "playing") continue;
        queue(
          game,
          resolveEffect({
            effect: {
              op: "skillTest",
              skill: "willpower",
              difficulty: 6,
              onFail: [{ op: "script", fn: "madness" }],
            },
            ctx: { you: i, source: run.ctx.source },
          }),
        );
      }
    },
    madness(game: GameContext, run: ScriptRun) {
      const pool = Object.values(game.db.cards).filter(
        (c) => c.subtype === "basicweakness" && c.traits.includes("Madness"),
      );
      if (!pool.length) return;
      const pick = pool[randomInt(game, pool.length)];
      const id = createCard(game, pick.code, ZONE.Hand, run.you);
      emit(
        game,
        EVENT.Weakness,
        `${inv(game, run.you).name} adds ${def(game, id).name} to their hand`,
        {
          inv: run.you,
          card: id,
        },
      );
      // a weakness that enters the hand without being drawn resolves as if drawn (Grimoire, Weakness)
      if (resolvesOnDraw(game, id)) resolveWeakness(game, run.you, id);
    },
  },
} satisfies CardScript;
