// The Gold Pocket Watch — when a phase begins, remove it from the game: skip that phase; after a phase ends, remove it
// from the game: repeat that phase. Each phase's end is a window of its own, so the second ability is listed for each.
import {
  type CardScript,
  currentPhase,
  type GameContext,
  moveCard,
  PHASE,
  repeatPhase,
  type ScriptRun,
  skipPhase,
  ZONE,
} from "../../../../src/engine/api";

const repeat = {
  kind: "reaction" as const,
  label: "The Gold Pocket Watch: repeat this phase",
  run: "repeat",
};

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "phaseBegins",
      label: "The Gold Pocket Watch: skip this phase",
      run: "skip",
    },
    { ...repeat, trigger: "mythosEnds" },
    { ...repeat, trigger: "phaseEnds" },
    { ...repeat, trigger: "enemyPhaseEnds" },
    { ...repeat, trigger: "upkeepPhaseEnds" },
  ],
  fns: {
    skip(game: GameContext, run: ScriptRun) {
      moveCard(game, run.source, ZONE.Removed);
      skipPhase(game);
    },
    repeat(game: GameContext, run: ScriptRun) {
      const phase = currentPhase(game);
      if (
        phase !== PHASE.Mythos &&
        phase !== PHASE.Investigation &&
        phase !== PHASE.Enemy &&
        phase !== PHASE.Upkeep
      )
        return;
      moveCard(game, run.source, ZONE.Removed);
      repeatPhase(game, phase);
    },
  },
} satisfies CardScript;
