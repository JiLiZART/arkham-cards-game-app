// The Entity Above (Black Stars Rise, agenda 2c, The Vortex Above) — each [[Monster]] enemy gets +1 fight; the group
// doom ability (each investigator draws 1 card). Back (The Path to Carcosa): the rest of this agenda deck leaves the
// game; act 3c, Open The Path Above, is the current act.
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import {
  ashleighAbility,
  ashleighOffered,
  ashleighsInformation,
  groupDoom,
  monstersFight,
  pathToCarcosa,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [groupDoom("cards"), ashleighAbility, { kind: "revelation", run: "path" }],
  conditions: { ashleighOffered },
  modifiers: monstersFight,
  fns: {
    ashleigh: ashleighsInformation,
    path: (game: GameContext) => pathToCarcosa(game, "c"),
  },
} satisfies CardScript;
