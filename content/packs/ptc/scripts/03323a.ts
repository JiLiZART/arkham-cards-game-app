// Search For the Stranger (v. III) (Dim Carcosa, act 2): each investigator cannot discover clues; The Man in the Pallid
// Mask cannot be defeated except by damage, and that defeat advances the act instead (the scenario's would-be-defeated
// hook). Back (The Disguise is Laid Aside): Hastur (Lord of Carcosa) spawns at his location; he leaves the game.
import {
  type CardScript,
  findByCode,
  type GameContext,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";
import {
  LORD_OF_CARCOSA,
  palaceInPlay,
} from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";
import { noClues, removeStranger } from "./03321a";

export default {
  abilities: [{ kind: "revelation", run: "disguise" }],
  modifiers: noClues,
  fns: {
    disguise(game: GameContext) {
      const at = removeStranger(game) ?? palaceInPlay(game)?.id;
      const lord = findByCode(game, LORD_OF_CARCOSA, [ZONE.SetAside]);
      if (lord && at) queue(game, spawn({ enemy: lord.id, inv: null, at }));
    },
  },
} satisfies CardScript;
