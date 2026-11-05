// Twist of Fate — a random chaos token is revealed: a positive number or the elder sign does nothing, any other number
// deals 1 damage, a symbol or the auto-fail 2 horror (the token goes back in the bag)
import {
  chaosBag,
  type CardScript,
  emit,
  type GameContext,
  invName,
  randomInt,
  EVENT,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "autoFail"];

export default {
  abilities: [{ kind: "revelation", run: "twist" }],
  fns: {
    twist(game: GameContext, run: ScriptRun) {
      const bag = chaosBag(game);
      if (!bag.length) return;
      const token = bag[randomInt(game, bag.length)];
      emit(game, EVENT.Token, `${invName(game, run.you)} reveals ${token}`, {
        inv: run.you,
        data: { token },
      });
      const damage = /^(0|-\d+)$/.test(token) ? 1 : 0;
      const horror = SYMBOLS.includes(token) ? 2 : 0;
      if (damage || horror)
        queue(
          game,
          dealDamage({ inv: run.you, damage, horror, direct: false, source: run.source }),
        );
    },
  },
} satisfies CardScript;
