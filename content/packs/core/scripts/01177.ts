// Yithian Observer — when it attacks you, discard a random card; if you cannot, +1 damage and +1 horror
import {
  type CardScript,
  discard,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  inv,
  randomInt,
  EVENT,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enemyAttacks", run: "attack" }],
  fns: {
    attack(game: GameContext, ctx: EffCtx) {
      const me = inv(game, ctx.inv!);
      if (me.hand.length) discard(game, me.hand[randomInt(game, me.hand.length)]);
      else {
        flags.attackBonus.set(game, String(ctx.key), 1);
        emit(
          game,
          EVENT.Yithian,
          `${me.name} has no cards: the Yithian Observer deals +1 damage and +1 horror`,
          { inv: ctx.inv },
        );
      }
    },
  },
} satisfies CardScript;
