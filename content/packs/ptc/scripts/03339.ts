// The Final Act (Dim Carcosa): surge (data). With no remaining sanity, 2 doom on the current agenda, which can make it
// advance.
import {
  type CardScript,
  type GameContext,
  remainingSanity,
  type ScriptRun,
  queue,
  checkDoom,
  placeDoom,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "finalAct" }],
  fns: {
    finalAct(game: GameContext, run: ScriptRun) {
      if (remainingSanity(game, run.you) === 0)
        queue(game, placeDoom({ card: "agenda", n: 2 }), checkDoom());
    },
  },
} satisfies CardScript;
