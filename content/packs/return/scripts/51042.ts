// Brood of Yog-Sothoth (Charging Beast, Return to Undimensioned and Unseen) — Massive, +1 health per investigator and
// only the Esoteric Formula attacks it, in cards.json; forced after it moves for the first time each round, if it is
// unengaged: it moves again toward a random location. Its spawning is not a move.
import {
  card,
  type CardScript,
  currentRound,
  flags,
  type GameContext,
  invsAt,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";
import {
  atRandom,
  SHARED,
} from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

const spawnKey = (id: string) => `chargingSpawn:${id}`;

export default {
  fns: {
    ...SHARED.fns,
    /** the enters-location window that follows its spawn is not a move */
    spawned(game: GameContext, run: ScriptRun) {
      if (run.ctx.enemy === run.source) flags.setNamed(game, spawnKey(run.source), true);
    },
    charge(game: GameContext, run: ScriptRun) {
      const me = run.source;
      if (run.ctx.enemy !== me) return;
      if (flags.named(game, spawnKey(me))) {
        flags.clearNamed(game, spawnKey(me));
        return;
      }
      const key = `charging:${currentRound(game)}:${me}`;
      if (flags.named(game, key)) return;
      flags.setNamed(game, key, true);
      // Massive: engaged with each investigator at its location
      const loc = card(game, me).location;
      if (!loc || card(game, me).engagedWith || invsAt(game, loc).length) return;
      queue(game, atRandom(game, "uauMoveToward", { enemy: me }));
    },
  },
} satisfies CardScript;
