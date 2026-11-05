// Realms Beyond (All-In-One, Return to Lost in Time and Space) — Yog-Sothoth here is immune to player card effects,
// cannot take damage and cannot leave; leaving costs a willpower or agility (3) test, in cards.json; a forced effect
// moving someone to Another Dimension takes them here instead: the Return scenario's locationLeavesPlay and
// `anotherDimension`
import {
  type CardScript,
  enemies,
  type GameContext,
  type InstId,
} from "../../../../src/engine/api";
import { SHARED, YOG } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";
import { realms } from "../../../campaigns/return-to-the-dunwich-legacy/scripts/return-to-lost-in-time-and-space";

export default {
  fns: SHARED.fns,
  modifiers: (game: GameContext, id: InstId) => {
    if (realms(game) !== id) return [];
    return enemies(game)
      .filter((e) => e.code === YOG && e.location === id)
      .flatMap((e) => [
        { target: e.id, mod: { flag: "immuneToPlayerCards" as const } },
        { target: e.id, mod: { flag: "cannotBeDamaged" as const } },
        { target: e.id, mod: { flag: "cannotMove" as const } },
      ]);
  },
} satisfies CardScript;
