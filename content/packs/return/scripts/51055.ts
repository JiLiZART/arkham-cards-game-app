// Into the Beyond (v. II) (Return to Lost in Time and Space, act 2) — its action is in cards.json (the scenario's
// `litasExplore`), its objective (an investigator enters The Edge of the Universe) the Return scenario's
// checkObjectives; back: the set-aside Seth Bishop (Thrall of Yog-Sothoth) spawns at The Edge of the Universe
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
  EDGE,
  inPlay,
  SHARED,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";
import { SETH } from "../../../campaigns/return-to-the-dunwich-legacy/scripts/return-to-lost-in-time-and-space";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      const seth = findByCode(game, SETH, [ZONE.SetAside])?.id;
      const edge = inPlay(game, EDGE);
      if (!seth || !edge) return;
      moveCard(game, seth, ZONE.Limbo);
      queue(game, spawn({ enemy: seth, inv: null, at: edge }));
    },
  },
} satisfies CardScript;
