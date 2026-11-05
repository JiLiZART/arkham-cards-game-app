// Bishop's Brook (the other copy) — while an investigator is at Bishop's Brook, other investigators cannot enter it
import {
  type CardScript,
  card,
  type GameContext,
  type InstId,
  invsAt,
  ZONE,
} from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, id: InstId) {
    const c = card(game, id);
    return c.zone === ZONE.Location && c.revealed && invsAt(game, id).length
      ? [{ target: id, mod: { flag: "cannotMoveInto" as const } }]
      : [];
  },
} satisfies CardScript;
