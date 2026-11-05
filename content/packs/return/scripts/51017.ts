// Clover Club Stage (Return to The House Always Wins) — connected to the Clover Club Bar (the scenario's connections);
// while it is act 1: spend 1 resource to place it on the Stage, and once there are 1 per investigator, gain 1 clue per
// investigator from the token pool (group limit once per game)
import {
  addCounter,
  card,
  type CardScript,
  def,
  type EffCtx,
  emit,
  EVENT,
  type GameContext,
  playerCount,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";
import { actOne } from "../../dwl/scripts/02071";

export default {
  abilities: [
    {
      kind: "action",
      label: "Clover Club Stage: spend 1 resource to place it on the Stage",
      cost: { resources: 1 },
      condition: { script: "actOne" },
      run: "stake",
    },
    {
      kind: "fast",
      label: "Clover Club Stage: gain 1 clue per investigator",
      usableBy: "atLocation",
      limit: { per: "game", count: 1, group: true },
      condition: { script: "potFull" },
      run: "collect",
    },
  ],
  conditions: {
    actOne,
    potFull: (game: GameContext, ctx: EffCtx) =>
      actOne(game) && !!ctx.source && card(game, ctx.source).resources >= playerCount(game),
  },
  fns: {
    stake(game: GameContext, run: ScriptRun) {
      addCounter(game, run.source, "resources", 1);
      emit(game, EVENT.Place, `1 resource is placed on ${def(game, run.source).name}`, {
        card: run.source,
      });
    },
    collect(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: { op: "gainClues", amount: { perInvestigator: 1 } },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
