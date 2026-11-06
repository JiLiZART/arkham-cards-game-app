// Unspeakable Oath (Cowardice) — as 52011 (Peril, Hidden, 2 fewer experience in hand at the end). [action]: Evade, only
// an exhausted unengaged enemy at your location; on a success, discard it from your hand.
import {
  type CardScript,
  type EffCtx,
  enemiesAt,
  type GameContext,
  inv,
  type ScriptRun,
  startTest,
} from "../../../../src/engine/api";
import { oath } from "./52011";

const targets = (game: GameContext, you: string) =>
  enemiesAt(game, inv(game, you).location)
    .filter((e) => e.exhausted && !e.engagedWith)
    .map((e) => e.id);

export default {
  ...oath,
  abilities: [
    {
      kind: "action",
      designator: "evade",
      label: "Unspeakable Oath (Cowardice): evade an exhausted unengaged enemy to discard it",
      condition: { script: "hasTarget" },
      run: "cowardice",
    },
  ],
  conditions: {
    hasTarget: (game: GameContext, ctx: EffCtx) => !!ctx.you && targets(game, ctx.you).length > 0,
  },
  fns: {
    cowardice(game: GameContext, run: ScriptRun) {
      const ids = targets(game, run.you);
      if (!ids.length) return;
      const enemy = run.chooseCard(ids, { text: "Choose an enemy to evade", key: "evade" });
      startTest(game, {
        inv: run.you,
        skill: "agility",
        kind: "evade",
        source: run.ctx.source,
        target: enemy,
        ctx: { ...run.ctx, enemy },
        onSuccess: [{ op: "discardSelf" }],
      });
    },
  },
} satisfies CardScript;
