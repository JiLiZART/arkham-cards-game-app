// Ever Vigilant — one at a time, up to 3 assets from your hand are played, each costing 1 less
import {
  addCounter,
  asNumber,
  type CardScript,
  def,
  type GameContext,
  inv,
  playCard,
  playCost,
  queue,
  runScript,
  type ScriptRun,
  uniqueInPlay,
} from "../../../../src/engine/api";

const MAX = 3;

/** the assets in your hand you can afford at 1 less */
const affordable = (game: GameContext, you: string) =>
  inv(game, you).hand.filter(
    (h) =>
      def(game, h).type === "asset" &&
      !uniqueInPlay(game, h) &&
      inv(game, you).resources >= Math.max(0, playCost(game, you, h) - 1),
  );

export default {
  abilities: [{ kind: "onPlay", run: "vigil" }],
  fns: {
    vigil(game: GameContext, run: ScriptRun) {
      const played = asNumber(run.args) ?? 0;
      const ids = affordable(game, run.you);
      if (played >= MAX || !ids.length) return;
      const pick = run.choose<string>(
        [
          { id: "done", label: "Done", value: "done", key: "option.done" },
          ...ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        ],
        { text: "Play an asset from your hand (1 less)", key: "everVigilant" },
        { auto: false },
      );
      if (pick === "done") return;
      // the reduced cost is paid here; the card itself is then played for free
      addCounter(game, run.you, "resources", -Math.max(0, playCost(game, run.you, pick) - 1));
      queue(
        game,
        playCard({ inv: run.you, card: pick, free: true }),
        runScript({ code: "03023", fn: "vigil", ctx: run.ctx, args: played + 1 }),
      );
    },
  },
} satisfies CardScript;
