// Curtain Call's reference card — the cultist, tablet and elder thing: with horror on your location you take 1 horror;
// with none, 1 is placed on it. (Return to Curtain Call plays with the same card and finds this through it.)
import {
  card,
  type CardScript,
  type GameContext,
  inv,
  type ScriptRun,
} from "../../../../src/engine/api";
import { horrorOn, takeHorror } from "../../../campaigns/the-path-to-carcosa/scripts/curtain-call";

export default {
  fns: {
    horrorHere(game: GameContext, run: ScriptRun) {
      const loc = inv(game, run.you).location;
      if (!loc) return;
      if (card(game, loc).horror > 0) takeHorror(game, run.you, 1, null);
      else horrorOn(game, loc);
    },
  },
} satisfies CardScript;
