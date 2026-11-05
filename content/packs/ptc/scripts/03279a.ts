// The Entity Above (Black Stars Rise, agenda 2c, The Flood Below) — each [[Monster]] enemy gets +1 fight; the group
// doom ability (each investigator draws 1 card). Back (Worlds Intertwine): Beast of Aldebaran spawns in the Chapel of
// St. Aubert, Ashleigh Clarke at Porte de l'Avancée unless slain; act 3c leaves the game; agenda 3c follows.
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import {
  ACT_ABOVE,
  ashleighAbility,
  ashleighOffered,
  ashleighsInformation,
  CHAPEL,
  groupDoom,
  monstersFight,
  worldsIntertwine,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [groupDoom("cards"), ashleighAbility, { kind: "revelation", run: "intertwine" }],
  conditions: { ashleighOffered },
  modifiers: monstersFight,
  fns: {
    ashleigh: ashleighsInformation,
    intertwine: (game: GameContext) => worldsIntertwine(game, CHAPEL, ACT_ABOVE),
  },
} satisfies CardScript;
