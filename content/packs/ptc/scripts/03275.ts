// The Tide Rises (Black Stars Rise, agenda 1a) — [fast] spend 1 clue per investigator as a group: 1 doom here, each
// investigator gains 2 resources (group limit once per round). Back (Red Dawn's Sunrise): the encounter discard pile and
// both set-aside Tidal Terrors shuffled into the encounter deck; with agenda 1c the current "c" agenda, one Conviction
// (2 or fewer doom on it) or one Doubt (3 or more).
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import {
  ashleighAbility,
  ashleighOffered,
  ashleighsInformation,
  groupDoom,
  sunrise,
  TIDAL_TERROR,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [groupDoom("resources"), ashleighAbility, { kind: "revelation", run: "sunrise" }],
  conditions: { ashleighOffered },
  fns: {
    ashleigh: ashleighsInformation,
    sunrise: (game: GameContext) => sunrise(game, TIDAL_TERROR, "c", "03278"),
  },
} satisfies CardScript;
