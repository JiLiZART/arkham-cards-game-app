// The Ritual Begins (Black Stars Rise, agenda 1c) — [fast] spend 1 clue per investigator as a group: 1 doom here, each
// investigator draws 1 card (group limit once per round). Back (Blue Star's Demise): the encounter discard pile and both
// set-aside Rift Seekers shuffled into the encounter deck; with agenda 1a the current "a" agenda, one Conviction (2 or
// fewer doom on it) or one Doubt (3 or more).
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import {
  ashleighAbility,
  ashleighOffered,
  ashleighsInformation,
  groupDoom,
  RIFT_SEEKER,
  sunrise,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [groupDoom("cards"), ashleighAbility, { kind: "revelation", run: "demise" }],
  conditions: { ashleighOffered },
  fns: {
    ashleigh: ashleighsInformation,
    demise: (game: GameContext) => sunrise(game, RIFT_SEEKER, "a", "03275"),
  },
} satisfies CardScript;
