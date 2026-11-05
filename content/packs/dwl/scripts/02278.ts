// Ascending the Hill (v. I) (Where Doom Awaits, act 2) — clues are placed on [[Altered]] locations only while it is
// current; its objective (an investigator enters Sentinel Peak) is the scenario's; back: the set-aside Seth Bishop
// leaves the game
import { type CardScript, type GameContext, moveCard, ZONE } from "../../../../src/engine/api";
import {
  onlyAltered,
  sethAside,
} from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

export default {
  modifiers: onlyAltered,
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      const seth = sethAside(game);
      if (seth) moveCard(game, seth, ZONE.Removed);
    },
  },
} satisfies CardScript;
