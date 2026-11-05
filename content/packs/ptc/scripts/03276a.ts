// Let The Storm Rage (Black Stars Rise, agenda 2a, The Vortex Above) — each copy of Ancient Evils gains surge; the
// group doom ability (each investigator gains 2 resources). Back (Worlds Intertwine): Beast of Aldebaran spawns in the
// Abbey Tower, Ashleigh Clarke at Porte de l'Avancée unless slain; act 3a leaves the game; agenda 3a follows.
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import {
  ACT_BELOW,
  ancientEvilsSurge,
  ashleighAbility,
  ashleighOffered,
  ashleighsInformation,
  groupDoom,
  TOWER,
  worldsIntertwine,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [groupDoom("resources"), ashleighAbility, { kind: "revelation", run: "intertwine" }],
  conditions: { ashleighOffered },
  modifiers: ancientEvilsSurge,
  fns: {
    ashleigh: ashleighsInformation,
    intertwine: (game: GameContext) => worldsIntertwine(game, TOWER, ACT_BELOW),
  },
} satisfies CardScript;
