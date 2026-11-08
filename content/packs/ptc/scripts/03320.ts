// In Lost Carcosa (Dim Carcosa, act 1): the investigators spend 2 clues per investigator (its printed cost). Back (His
// Final Bow...?): The Man in the Pallid Mask spawns at the Palace of the King.
import {
  type CardScript,
  findByCode,
  type GameContext,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";
import { MITPM, palaceInPlay } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  abilities: [{ kind: "revelation", run: "finalBow" }],
  fns: {
    finalBow(game: GameContext) {
      const him = findByCode(game, MITPM, [ZONE.SetAside]);
      const palace = palaceInPlay(game);
      if (him && palace) queue(game, spawn({ enemy: him.id, inv: null, at: palace.id }));
    },
  },
} satisfies CardScript;
