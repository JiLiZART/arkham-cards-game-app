// Montmartre (A Phantom of Truth, version II) — [action] Spend 1 resource: add 1 supply or ammo token to a card you
// control. (Limit once per round.)
import {
  addCounter,
  cardsIn,
  type CardScript,
  def,
  emit,
  type EffCtx,
  type GameContext,
  type InvId,
  type ScriptRun,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";

const yours = (game: GameContext, i: InvId) =>
  cardsIn(game, ZONE.Play).filter(
    (c) => c.controller === i && ["supplies", "ammo"].includes(def(game, c.id).uses?.type ?? ""),
  );

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Montmartre: spend 1 resource to add 1 supply or ammo",
      cost: { resources: 1 },
      condition: { script: "hasUses" },
      limit: { per: "round", count: 1 },
      run: "restock",
    },
  ],
  conditions: {
    hasUses: (game: GameContext, ctx: EffCtx) => !!ctx.you && yours(game, ctx.you).length > 0,
  },
  fns: {
    restock(game: GameContext, run: ScriptRun) {
      const pick = run.chooseCard(
        yours(game, run.you).map((c) => c.id),
        { text: "Add 1 supply or ammo to which card?", key: "chooseAsset" },
      );
      addCounter(game, pick, "uses", 1);
      emit(game, EVENT.Place, `1 use is added to ${def(game, pick).name}`, { card: pick });
    },
  },
} satisfies CardScript;
