// Through the Catacombs (The Pallid Mask, act 1): the Tomb of Shadows revealed advances it. Back (The Stranger's
// Shadow): The Man in the Pallid Mask spawns in the Tomb of Shadows; Ishimaru Haruko, unless slain, at the starting
// location.
import {
  type CardScript,
  findByCode,
  type GameContext,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";
import {
  HARUKO,
  MITPM,
  startLocation,
  TOMB,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [{ kind: "revelation", run: "shadow" }],
  fns: {
    shadow(game: GameContext) {
      const him = findByCode(game, MITPM, [ZONE.SetAside]);
      const tomb = findByCode(game, TOMB, [ZONE.Location]);
      const haruko = findByCode(game, HARUKO, [ZONE.SetAside]);
      const start = startLocation(game);
      queue(
        game,
        ...(him && tomb ? [spawn({ enemy: him.id, inv: null, at: tomb.id })] : []),
        ...(haruko && start ? [spawn({ enemy: haruko.id, inv: null, at: start })] : []),
      );
    },
  },
} satisfies CardScript;
