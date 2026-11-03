// Miskatonic University (In Flames) — when the investigation phase ends: 1 direct damage to each player card with health here
import {
  addCounter,
  type CardScript,
  cardsIn,
  currentPhase,
  def,
  type GameContext,
  invsAt,
  push,
  ZONE,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    inFlames(game: GameContext, run: ScriptRun) {
      if (currentPhase(game) !== "investigation") return;
      for (const i of invsAt(game, run.source)) {
        push(game, {
          t: STEP.AssignDamage,
          inv: i,
          damage: 1,
          horror: 0,
          direct: true,
          source: run.source,
        });
        for (const a of cardsIn(game, ZONE.Play))
          if (a.controller === i && (def(game, a.id).health ?? 0) > 0)
            addCounter(game, a.id, "damage", 1);
        push(game, { t: STEP.Script, code: "__engine", fn: "assetDefeatCheck", ctx: { you: i } });
      }
    },
  },
} satisfies CardScript;
