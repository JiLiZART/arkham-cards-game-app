// The Hidden Chamber — drawn from beneath a location, it enters play connected to that location (the engine's rule for
// a location drawn as an encounter card); its door is locked: no investigator enters it unless Key to the Chamber is
// attached to it
import {
  type CardScript,
  cardsIn,
  type GameContext,
  type InstId,
  ZONE,
} from "../../../../src/engine/api";

const KEY = "02215";

export default {
  modifiers(game: GameContext, id: InstId) {
    const unlocked = cardsIn(game, ZONE.Attached).some((c) => c.code === KEY && c.location === id);
    return unlocked ? [] : [{ target: id, mod: { flag: "cannotMoveInto" as const } }];
  },
} satisfies CardScript;
