// Deciphered Reality — Investigate: the difficulty is the highest shroud among revealed locations; a success discovers 1
// clue at each revealed location instead of the usual one
import {
  type CardScript,
  discoverClues,
  type GameContext,
  inv,
  locations,
  queue,
  resolveEffect,
  type ScriptRun,
  shroud,
} from "../../../../src/engine/api";

const revealed = (game: GameContext) => locations(game).filter((l) => l.revealed);

export default {
  abilities: [{ kind: "onPlay", designator: "investigate", run: "decipher" }],
  fns: {
    decipher(game: GameContext, run: ScriptRun) {
      const here = inv(game, run.you).location;
      if (!here || !Number.isFinite(shroud(game, here))) return;
      // a location whose text defines its shroud can't be investigated: it has no value to count
      const highest = Math.max(
        0,
        ...revealed(game)
          .map((l) => shroud(game, l.id))
          .filter(Number.isFinite),
      );
      queue(
        game,
        resolveEffect({
          effect: {
            op: "investigate",
            shroud: highest - shroud(game, here),
            insteadOfClues: [{ op: "script", fn: "each" }],
          },
          ctx: run.ctx,
        }),
      );
    },
    each(game: GameContext, run: ScriptRun) {
      queue(
        game,
        ...revealed(game).map((l) => discoverClues({ inv: run.you, location: l.id, n: 1 })),
      );
    },
  },
} satisfies CardScript;
