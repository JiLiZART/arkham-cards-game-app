// Spirit-Speaker — exhausted: an asset you control with "uses (charges)" goes back to your hand, or its charges become
// resources and it is discarded
import {
  addCounter,
  asString,
  card,
  type CardScript,
  controlled,
  def,
  discard,
  type EffCtx,
  type GameContext,
  moveCard,
  queue,
  runScript,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const chargeAssets = (game: GameContext, you: string) =>
  controlled(game, you).filter((c) => def(game, c.id).uses?.type === "charges");

export default {
  abilities: [
    {
      kind: "fast",
      label: "Spirit-Speaker: return a charge asset to your hand, or cash in its charges",
      cost: { exhaust: true },
      condition: { script: "hasChargeAsset" },
      run: "speak",
    },
  ],
  conditions: {
    hasChargeAsset: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && chargeAssets(game, ctx.you).length > 0,
  },
  fns: {
    speak(game: GameContext, run: ScriptRun) {
      const ids = chargeAssets(game, run.you).map((c) => c.id);
      if (!ids.length) return;
      const pick = run.choose<string>(
        ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { text: "Choose an asset with charges", key: "chooseAsset" },
      );
      queue(game, runScript({ code: "03014", fn: "how", ctx: run.ctx, args: pick }));
    },
    how(game: GameContext, run: ScriptRun) {
      const id = asString(run.args);
      if (!id || card(game, id).zone !== ZONE.Play) return;
      const back = run.choose<boolean>(
        [
          { id: "hand", label: "Return it to your hand", value: true, key: "option.returnToHand" },
          {
            id: "cash",
            label: "Move its charges to your resource pool and discard it",
            value: false,
            key: "option.chargesToResources",
            vars: { n: card(game, id).uses },
          },
        ],
        { text: "Spirit-Speaker", key: "spiritSpeaker" },
        { auto: false },
      );
      if (back) {
        moveCard(game, id, ZONE.Hand);
        return;
      }
      addCounter(game, run.you, "resources", card(game, id).uses);
      discard(game, id);
    },
  },
} satisfies CardScript;
