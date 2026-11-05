// Let The Storm Rage (Black Stars Rise, agenda 2a, The Flood Below) — each copy of Ancient Evils gains surge; the group
// doom ability (each investigator gains 2 resources). Back (The Path to Carcosa): the rest of this agenda deck leaves the
// game; act 3a, Open The Path Below, is the current act.
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import {
  ancientEvilsSurge,
  ashleighAbility,
  ashleighOffered,
  ashleighsInformation,
  groupDoom,
  pathToCarcosa,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [groupDoom("resources"), ashleighAbility, { kind: "revelation", run: "path" }],
  conditions: { ashleighOffered },
  modifiers: ancientEvilsSurge,
  fns: {
    ashleigh: ashleighsInformation,
    path: (game: GameContext) => pathToCarcosa(game, "a"),
  },
} satisfies CardScript;
