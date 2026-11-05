// Puppet of Hastur — after it engages you: take 1 horror, or it gets +3 fight until the end of the investigation phase
// (until the end of the round when it engages you outside that phase).
import {
  addTempMod,
  type CardScript,
  currentPhase,
  type GameContext,
  PHASE,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enemyEngages", run: "pull" }],
  fns: {
    pull(game: GameContext, run: ScriptRun) {
      const pick = run.choose<"horror" | "fight">(
        [
          { id: "horror", label: "Take 1 horror", value: "horror", key: "option.take1Horror" },
          {
            id: "fight",
            label: "Puppet of Hastur gets +3 fight",
            value: "fight",
            key: "option.puppetFight",
          },
        ],
        { text: "Puppet of Hastur engages you", key: "puppetOfHastur" },
        { auto: false },
      );
      if (pick === "horror")
        queue(
          game,
          dealDamage({ inv: run.you, damage: 0, horror: 1, direct: false, source: run.source }),
        );
      else
        addTempMod(
          game,
          { stat: "fight", value: 3 },
          run.source,
          currentPhase(game) === PHASE.Investigation ? "phase" : "round",
          run.source,
        );
    },
  },
} satisfies CardScript;
