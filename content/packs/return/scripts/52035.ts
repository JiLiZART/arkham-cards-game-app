// "The Really Bad Ones" (v. III) (Return to The Unspeakable Oath, act 2 while Conviction ≥ Doubt) — as the base act 2's
// front (its data; Daniel's Cell revealed advances it). Back (The Tale Retold): the set-aside Host of Insanity spawns at
// Daniel's Cell; the encounter discard pile and every enemy beneath the act deck are shuffled into the encounter deck.
import {
  type CardScript,
  findByCode,
  type GameContext,
  moveCard,
  queue,
  type ScriptRun,
  spawn,
  ZONE,
} from "../../../../src/engine/api";
import { DANIELS_CELL } from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";
import { underActToDeck } from "../../ptc/scripts/03166";

export const HOST = "52037";

export default {
  abilities: [{ kind: "revelation", run: "taleRetold" }],
  fns: {
    taleRetold(game: GameContext, run: ScriptRun) {
      const host = findByCode(game, HOST, [ZONE.SetAside]);
      const cell = findByCode(game, DANIELS_CELL, [ZONE.Location]);
      if (host && cell) {
        moveCard(game, host.id, ZONE.Limbo);
        queue(game, spawn({ enemy: host.id, inv: null, at: cell.id }));
      }
      underActToDeck(game, run.source);
    },
  },
} satisfies CardScript;
