// Vortex of Time (Where Doom Awaits) — revelation: each investigator at a [[Sentinel Hill]] location tests willpower (4);
// each who fails takes 2 damage
import {
  activeInvs,
  type CardScript,
  type GameContext,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";
import { atTrait } from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

export default {
  abilities: [{ kind: "revelation", run: "vortex" }],
  fns: {
    vortex(game: GameContext, run: ScriptRun) {
      const tested = activeInvs(game).filter((i) => atTrait(game, i, "Sentinel Hill"));
      if (!tested.length) return;
      queue(
        game,
        ...tested.map((i) =>
          resolveEffect({
            effect: {
              op: "skillTest",
              skill: "willpower",
              difficulty: 4,
              onFail: [{ op: "takeDamage", amount: 2 }],
            },
            ctx: { you: i, inv: i, source: run.source },
          }),
        ),
      );
    },
  },
} satisfies CardScript;
