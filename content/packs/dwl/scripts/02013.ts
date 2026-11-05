// Final Rhapsody — 5 chaos tokens revealed (and returned): 1 damage and 1 horror for each skull and auto-fail
import {
  type CardScript,
  chaosBag,
  dealDamage,
  emit,
  EVENT,
  type GameContext,
  queue,
  randomInt,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "rhapsody" }],
  fns: {
    rhapsody(game: GameContext, run: ScriptRun) {
      const bag = [...chaosBag(game)];
      const shown = [];
      for (let k = 0; k < 5 && bag.length; k++)
        shown.push(...bag.splice(randomInt(game, bag.length), 1));
      emit(game, EVENT.Token, `Final Rhapsody reveals ${shown.join(", ")}`, {
        inv: run.you,
        data: { tokens: shown },
      });
      const n = shown.filter((t) => t === "skull" || t === "autoFail").length;
      if (n)
        queue(
          game,
          dealDamage({ inv: run.you, damage: n, horror: n, direct: false, source: run.source }),
        );
    },
  },
} satisfies CardScript;
