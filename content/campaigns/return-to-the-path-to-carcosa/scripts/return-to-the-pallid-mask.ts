// Return to The Pallid Mask (setup card 52048): the base scenario's script, with the box's rules over it — the four new
// Catacombs join the pool before the starting location is chosen, then four random Catacombs (not the start, the Tomb
// of Shadows or the Blocked Passage) leave the game unseen and the deck is built as normal; The Man in the Pallid Mask
// is no [[Humanoid]] to Corpse Dweller's spawn ability and cannot leave the Tomb of Shadows during act 2 (the base
// script, 03259 and 03257 read `RETURN_RULES`). Sea of Skulls stays connected to the location it marked.
import {
  type CardScript,
  composeScript,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  locations,
  ZONE,
} from "../../../../src/engine/api";
import base, {
  layCatacombs,
  RETURN_RULES,
} from "../../the-path-to-carcosa/scripts/the-pallid-mask";
import { seaLinked } from "../../../packs/return/scripts/52052";

const NEW_CATACOMBS = ["52049", "52050", "52051", "52052"];
const SEA = "52052";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    returnRules(game: GameContext) {
      flags.setNamed(game, RETURN_RULES, true);
    },
    catacombs(game: GameContext) {
      layCatacombs(game, NEW_CATACOMBS, 4);
    },
  },
  hooks: {
    connections(game: GameContext, loc: InstId) {
      const sea = findByCode(game, SEA, [ZONE.Location]);
      if (!sea || !sea.revealed) return [];
      if (loc === sea.id)
        return locations(game)
          .filter((l) => seaLinked(game, l.id))
          .map((l) => l.id);
      return seaLinked(game, loc) ? [sea.id] : [];
    },
  },
};

export default composeScript(base, returnTo);
