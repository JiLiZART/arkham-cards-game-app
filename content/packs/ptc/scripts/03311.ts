// Time Warp — played after an investigator at your location finishes an action of their turn: the game goes back to
// before that action, but for Time Warp in your discard and its cost (design decision 5 of player-cards-ptc). The
// engine notes each action of a turn under a key while a hand holds Time Warp (`flags.actionStart`); this sets the
// rewind, and `replay` resolves it from the game's list of choices, so a save, a report and every peer of a room reach
// the same state.
import {
  type CardScript,
  type EffCtx,
  flags,
  type GameContext,
  playCost,
  type ScriptRun,
  setRewind,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      fromHand: true,
      trigger: "actionPerformed",
      usableBy: "atLocation",
      condition: { script: "thatAction" },
      run: "warp",
    },
  ],
  conditions: {
    /** the action just finished is the one the engine noted the start of */
    thatAction: (game: GameContext, ctx: EffCtx) => flags.actionStart.get(game)?.inv === ctx.inv,
  },
  fns: {
    warp(game: GameContext, run: ScriptRun) {
      const start = flags.actionStart.get(game);
      if (!start) return;
      setRewind(game, start.key, run.source, playCost(game, run.you, run.source));
    },
  },
} satisfies CardScript;
