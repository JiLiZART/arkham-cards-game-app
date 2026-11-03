// The Necronomicon — move 1 horror from it to Daisy; discard it when empty
import {
  addCounter,
  card,
  type CardScript,
  discard,
  type GameContext,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "action", label: "The Necronomicon: move 1 horror to yourself", run: "moveHorror" },
  ],
  fns: {
    moveHorror(game: GameContext, run: ScriptRun) {
      const c = card(game, run.source);
      if (c.horror <= 0) return;
      addCounter(game, c.id, "horror", -1);
      queue(game, dealDamage({ inv: run.you, damage: 0, horror: 1, direct: true, source: c.id }));
      if (c.horror === 0) discard(game, c.id);
    },
  },
} satisfies CardScript;
