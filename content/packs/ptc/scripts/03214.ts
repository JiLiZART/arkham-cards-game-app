// Gare d'Orsay (A Phantom of Truth) — [action] Spend 1 resource: move to any [[Rail]] location.
import {
  type CardScript,
  def,
  type EffCtx,
  type GameContext,
  inv,
  type InvId,
  locations,
  type ScriptRun,
  queue,
  moveInvestigator,
} from "../../../../src/engine/api";

const rails = (game: GameContext, i: InvId) =>
  locations(game).filter(
    (l) => l.id !== inv(game, i).location && def(game, l.id).traits.includes("Rail"),
  );

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Gare d'Orsay: spend 1 resource to move to any Rail location",
      cost: { resources: 1 },
      condition: { script: "anyRail" },
      run: "train",
    },
  ],
  conditions: {
    anyRail: (game: GameContext, ctx: EffCtx) => !!ctx.you && rails(game, ctx.you).length > 0,
  },
  fns: {
    train(game: GameContext, run: ScriptRun) {
      const to = run.chooseCard(
        rails(game, run.you).map((l) => l.id),
        { text: "Move to which Rail location?", key: "apotRail" },
      );
      queue(game, moveInvestigator({ inv: run.you, to }));
    },
  },
} satisfies CardScript;
