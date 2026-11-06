// Archaic Glyphs (Prophecy Foretold) — Researched; its investigation, on a success, may put an asset from your hand into
// play whose printed cost is at most the amount it succeeded by (a card with no printed cost, or X, has none to compare)
import {
  type CardScript,
  checkSlots,
  def,
  enterPlay,
  type GameContext,
  inv,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    foretold(game: GameContext, run: ScriptRun) {
      const x = run.ctx.succeedBy ?? 0;
      const ids = inv(game, run.you).hand.filter((h) => {
        const d = def(game, h);
        return d.type === "asset" && typeof d.cost === "number" && d.cost <= x;
      });
      if (!ids.length) return;
      const pick = run.choose<string | null>(
        [
          ...ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          { id: "none", label: "Put none into play", value: null, key: "option.putNone" },
        ],
        { text: "Choose an asset to put into play", key: "chooseAsset" },
        { auto: false },
      );
      if (pick)
        queue(
          game,
          checkSlots({ inv: run.you, card: pick }),
          enterPlay({ inv: run.you, card: pick }),
        );
    },
  },
} satisfies CardScript;
