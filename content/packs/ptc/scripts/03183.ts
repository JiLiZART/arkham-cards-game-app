// Asylum Gorger — Spawn: Basement Hall (its data). Hunter. It cannot make attacks of opportunity, and cannot attack
// during the same phase it moved through its hunter keyword (the enemy phase: no attack against anyone this round).
import {
  type CardScript,
  currentRound,
  type EffCtx,
  flags,
  type GameContext,
  type InstId,
  turnOrder,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "enemyEntersLocation",
      condition: { all: [{ phase: "enemy" }, { script: "itMoved" }] },
      run: "sated",
    },
  ],
  conditions: {
    itMoved: (_game: GameContext, ctx: EffCtx) => !!ctx.enemy && ctx.enemy === ctx.source,
  },
  modifiers(_game: GameContext, cardId: InstId) {
    return [{ target: cardId, mod: { flag: "noAttacksOfOpportunity" as const } }];
  },
  fns: {
    sated(game: GameContext, run: ScriptRun) {
      for (const i of turnOrder(game))
        flags.noAttack.set(game, [run.source, i], currentRound(game));
    },
  },
} satisfies CardScript;
