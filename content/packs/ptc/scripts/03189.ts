// "I'll see you in hell!" — each non-Elite enemy engaged with you is defeated; then you are defeated and suffer 1
// physical trauma. Playing it provokes no attack of opportunity.
import {
  addCounter,
  type CardScript,
  defeatEnemy,
  defeatInvestigator,
  enemies,
  type GameContext,
  isElite,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", aoo: false, run: "hell" }],
  fns: {
    hell(game: GameContext, run: ScriptRun) {
      const engaged = enemies(game).filter(
        (e) => e.engagedWith === run.you && !isElite(game, e.id),
      );
      addCounter(game, run.you, "physicalTrauma", 1);
      queue(
        game,
        ...engaged.map((e) => defeatEnemy({ enemy: e.id, by: run.you })),
        defeatInvestigator({ inv: run.you, by: "effect" }),
      );
    },
  },
} satisfies CardScript;
