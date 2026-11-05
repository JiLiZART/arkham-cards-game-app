// Ascending the Hill (v. II) (Where Doom Awaits, act 2) — clues are placed on [[Altered]] locations only while it is
// current; its objective (an investigator enters Sentinel Peak) is the scenario's; back: the set-aside Seth Bishop into
// play at Sentinel Peak
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import {
  onlyAltered,
  sethToPeak,
} from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

export default {
  modifiers: onlyAltered,
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      sethToPeak(game, 0);
    },
  },
} satisfies CardScript;
