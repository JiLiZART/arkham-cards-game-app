// Breaking Through (Lost in Time and Space, agenda 3) — its forced horror is the scenario's `encounterMove`; back: the
// set-aside Yog-Sothoth spawns at The Edge of the Universe, or in Another Dimension if the Edge is not in play
import {
  type CardScript,
  findByCode,
  type GameContext,
  moveCard,
  queue,
  spawn,
  ZONE,
} from "../../../../src/engine/api";
import {
  ANOTHER_DIMENSION,
  EDGE,
  inPlay,
  SHARED,
  YOG,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      const yog = findByCode(game, YOG, [ZONE.SetAside])?.id;
      const at = inPlay(game, EDGE) ?? inPlay(game, ANOTHER_DIMENSION);
      if (!yog || !at) return;
      moveCard(game, yog, ZONE.Limbo);
      queue(game, spawn({ enemy: yog, inv: null, at }));
    },
  },
} satisfies CardScript;
