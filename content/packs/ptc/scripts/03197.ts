// Recharge — choose a [[Spell]] or [[Relic]] asset controlled by an investigator at your location and reveal a random
// chaos token: on a symbol or the auto-fail the asset is discarded, otherwise it gets 3 charges
import {
  addCounter,
  type CardScript,
  cardsIn,
  chaosBag,
  def,
  discard,
  type EffCtx,
  emit,
  EVENT,
  type GameContext,
  inv,
  invName,
  invsAt,
  randomInt,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const BACKLASH: readonly string[] = ["skull", "cultist", "tablet", "elderThing", "autoFail"];

const targets = (game: GameContext, you: string) => {
  const here = invsAt(game, inv(game, you).location);
  return cardsIn(game, ZONE.Play)
    .filter(
      (c) =>
        !!c.controller &&
        here.includes(c.controller) &&
        def(game, c.id).type === "asset" &&
        def(game, c.id).traits.some((t) => t === "Spell" || t === "Relic"),
    )
    .map((c) => c.id);
};

export default {
  abilities: [{ kind: "onPlay", condition: { script: "hasTarget" }, run: "recharge" }],
  conditions: {
    hasTarget: (game: GameContext, ctx: EffCtx) => !!ctx.you && targets(game, ctx.you).length > 0,
  },
  fns: {
    recharge(game: GameContext, run: ScriptRun) {
      const ids = targets(game, run.you);
      if (!ids.length) return;
      const pick = run.chooseCard(ids, {
        text: "Choose a Spell or Relic asset to recharge",
        key: "rechargeAsset",
      });
      const bag = chaosBag(game);
      if (!bag.length) return;
      const token = bag[randomInt(game, bag.length)];
      emit(game, EVENT.Token, `${invName(game, run.you)} reveals ${token}`, {
        inv: run.you,
        data: { token },
      });
      if (BACKLASH.includes(token)) discard(game, pick);
      else addCounter(game, pick, "uses", 3);
    },
  },
} satisfies CardScript;
