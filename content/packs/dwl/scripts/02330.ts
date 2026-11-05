// Yithian Starseeker (Lost in Time and Space) — spawn and Retaliate as printed; forced when it attacks an investigator
// with more than 10 cards in their discard pile: 1 doom on it
import {
  type CardScript,
  type GameContext,
  inv,
  placeDoom,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  fns: {
    ...SHARED.fns,
    starseekerDoom(game: GameContext, run: ScriptRun) {
      const target = run.ctx.inv;
      if (target && inv(game, target).discard.length > 10)
        queue(game, placeDoom({ card: run.source, n: 1 }));
    },
  },
} satisfies CardScript;
