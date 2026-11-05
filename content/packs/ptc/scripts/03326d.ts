// Bleak Desolation (Dim Carcosa, the story of Bleak Plains): 2 damage per investigator to Hastur; the card flips back
// and can't be flipped again. The Coffin (03327f) deals 1 per investigator.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
} from "../../../../src/engine/api";
import { damageHastur, lock } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export const hasturStory = (perInvestigator: number): CardScript => ({
  abilities: [{ kind: "revelation", run: "story" }],
  fns: {
    story(game: GameContext, run: ScriptRun) {
      lock(game, run.source);
      queue(game, ...damageHastur(game, run.source, perInvestigator));
    },
  },
});

export default hasturStory(2) satisfies CardScript;
