// Think on Your Feet (level 2) — an enemy entering your location stays there: it does not engage you as you move away
// to a connecting location (the move is in cards.json)
import {
  card,
  type CardScript,
  type GameContext,
  type ScriptRun,
  setEngaged,
} from "../../../../src/engine/api";

export default {
  fns: {
    stayBehind(game: GameContext, run: ScriptRun) {
      const enemy = run.ctx.enemy;
      if (enemy && card(game, enemy).engagedWith === run.you) setEngaged(game, enemy, null);
    },
  },
} satisfies CardScript;
