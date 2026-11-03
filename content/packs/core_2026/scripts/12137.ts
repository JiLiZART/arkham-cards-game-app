// Mark of Elokoss — when your turn ends: 1 damage, on an asset you control if able
import {
  addCounter,
  type CardScript,
  controlled,
  def,
  emit,
  type GameContext,
  EVENT,
  type ScriptRun,
  queue,
  dealDamage,
  checkAssetDefeat,
} from "../../../../src/engine/api";

export default {
  fns: {
    mark(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const assets = controlled(game, you).filter((c) => (def(game, c.id).health ?? 0) > c.damage);
      if (!assets.length) {
        queue(
          game,
          dealDamage({
            inv: you,
            damage: 1,
            horror: 0,
            direct: false,
            source: run.ctx.source ?? null,
          }),
        );
        return;
      }
      const pick = run.chooseCard(
        assets.map((c) => c.id),
        { text: "Mark of Elokoss: assign 1 damage to an asset", key: "chooseAsset" },
        { who: you },
      );
      addCounter(game, pick, "damage", 1);
      emit(game, EVENT.AssetDamage, `${def(game, pick).name} takes 1 damage`, {
        card: pick,
        inv: you,
        data: { damage: 1, horror: 0, source: run.ctx.source ?? null },
      });
      queue(game, checkAssetDefeat(you));
    },
  },
} satisfies CardScript;
