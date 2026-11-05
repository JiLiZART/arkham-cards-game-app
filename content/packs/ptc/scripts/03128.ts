// Historical Society (Meeting Room) — [action] Exhaust an [[Ally]] asset: discover a clue at this location. (Limit
// once per round.)
import {
  type CardScript,
  controlled,
  def,
  type EffCtx,
  exhaust,
  type GameContext,
  type InvId,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

const readyAllies = (game: GameContext, i: InvId) =>
  controlled(game, i).filter((c) => !c.exhausted && def(game, c.id).traits.includes("Ally"));

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Meeting Room: exhaust an Ally asset to discover a clue",
      condition: { script: "hasReadyAlly" },
      limit: { per: "round", count: 1 },
      run: "meet",
    },
  ],
  conditions: {
    hasReadyAlly: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && readyAllies(game, ctx.you).length > 0,
  },
  fns: {
    meet(game: GameContext, run: ScriptRun) {
      const ally = run.chooseCard(
        readyAllies(game, run.you).map((c) => c.id),
        { text: "Exhaust an Ally asset", key: "eotpExhaustAlly" },
      );
      exhaust(game, ally);
      queue(
        game,
        resolveEffect({
          effect: { op: "discoverClues", amount: 1 },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
