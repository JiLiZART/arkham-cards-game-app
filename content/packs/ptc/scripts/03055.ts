// Green Room (Curtain Call) — [action] Investigate with +3 [intellect]; after this skill test ends, discard each card
// in your hand.
import {
  type CardScript,
  discard,
  type GameContext,
  inv,
  isHidden,
  type ScriptRun,
  queue,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "action",
      designator: "investigate",
      label: "Green Room: investigate (+3 intellect), then discard your hand",
      run: "investigate",
    },
  ],
  fns: {
    investigate(game: GameContext, run: ScriptRun) {
      const ctx = { ...run.ctx, you: run.you };
      queue(
        game,
        resolveEffect({ effect: { op: "investigate", bonus: 3 }, ctx }),
        runScript({ code: "03055", fn: "discardHand", ctx }),
      );
    },
    discardHand(game: GameContext, run: ScriptRun) {
      // a hidden treachery is not a card a discard from hand can take
      for (const h of inv(game, run.you).hand.filter((x) => !isHidden(game, x))) discard(game, h);
    },
  },
} satisfies CardScript;
