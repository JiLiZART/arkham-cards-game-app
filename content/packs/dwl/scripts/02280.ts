// Ascending the Hill (v. III) (Where Doom Awaits, act 2) — clues are placed on [[Altered]] locations only while it is
// current; its objective (an investigator enters Sentinel Peak) is the scenario's; back: the set-aside Seth Bishop into
// play at Sentinel Peak with 1 [per_investigator] damage on him
import { type CardScript, type GameContext, playerCount } from "../../../../src/engine/api";
import {
  onlyAltered,
  sethToPeak,
} from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

export default {
  modifiers: onlyAltered,
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      sethToPeak(game, playerCount(game));
    },
  },
} satisfies CardScript;
