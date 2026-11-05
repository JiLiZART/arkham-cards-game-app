// "The Really Bad Ones" (v. II) (The Unspeakable Oath, act 2) — as version I's front. Back: Daniel Chesterfield
// spawns at Daniel's Cell, enemy side up.
import {
  type CardScript,
  findByCode,
  type GameContext,
  moveCard,
  setCode,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";
import {
  DANIEL,
  DANIEL_ENEMY,
  DANIELS_CELL,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";

export default {
  abilities: [{ kind: "revelation", run: "danielsWarning" }],
  fns: {
    danielsWarning(game: GameContext) {
      const daniel = findByCode(game, DANIEL, [ZONE.SetAside]);
      const cell = findByCode(game, DANIELS_CELL, [ZONE.Location]);
      if (!daniel || !cell) return;
      setCode(game, daniel.id, DANIEL_ENEMY);
      moveCard(game, daniel.id, ZONE.Limbo);
      queue(game, spawn({ enemy: daniel.id, inv: null, at: cell.id }));
    },
  },
} satisfies CardScript;
