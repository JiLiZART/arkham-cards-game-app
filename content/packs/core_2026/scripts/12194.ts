// Dissonance — choose a card type: discard each non-weakness card of that type from your hand
import {
  def,
  discard,
  inv,
  type CardScript,
  type GameContext,
  CHOICE,
  type ScriptRun,
} from "../../../../src/engine/api";

const TYPES = ["asset", "event", "skill"] as const;

export default {
  fns: {
    dissonance(game: GameContext, run: ScriptRun) {
      const me = inv(game, run.you);
      const type = run.choose<string>(
        TYPES.map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1), value: t })),
        { text: "Dissonance: choose a card type to discard", key: "chooseOne" },
        { auto: false, kind: CHOICE.Generic },
      );
      for (const h of me.hand.slice())
        if (def(game, h).type === type && !def(game, h).subtype) discard(game, h);
    },
  },
} satisfies CardScript;
