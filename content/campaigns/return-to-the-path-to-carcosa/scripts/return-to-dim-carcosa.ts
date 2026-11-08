// Return to Dim Carcosa (setup card 52059): the base scenario's script, with the box's rules over it — Hastur's Domain
// (52060) takes the original Palace of the King's place and links (the scenario file), the original leaves the game;
// Recesses of Your Own Mind, The Throne Room and Stage of the Ward Theatre wait set aside for Hastur's Last Stand
// (52060b). "Hastur's health cannot be reduced to less than 2 [per_investigator] unless any investigator 'knows the
// secret'" (the base damageHastur reads `HEALTH_FLOOR`). While Hastur moves, his location is connected to Stage of the
// Ward Theatre if an investigator is there.
import {
  allCards,
  type CardScript,
  composeScript,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  invsAt,
  moveCard,
  ZONE,
} from "../../../../src/engine/api";
import base, { HEALTH_FLOOR, hastur, PALACE } from "../../the-path-to-carcosa/scripts/dim-carcosa";
import { STAGE } from "../../../packs/return/scripts/52060b";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    hastursDomain(game: GameContext) {
      flags.setNamed(game, HEALTH_FLOOR, true);
      for (const c of allCards(game).filter((x) => x.code === PALACE && x.zone === ZONE.SetAside))
        moveCard(game, c.id, ZONE.Removed);
    },
  },
  hooks: {
    connections(game: GameContext, loc: InstId, enemy: boolean | InstId) {
      const h = hastur(game);
      const stage = findByCode(game, STAGE, [ZONE.Location]);
      if (!h?.location || enemy !== h.id || !stage || !invsAt(game, stage.id).length) return [];
      if (loc === h.location) return [stage.id];
      return loc === stage.id ? [h.location] : [];
    },
  },
};

export default composeScript(base, returnTo);
