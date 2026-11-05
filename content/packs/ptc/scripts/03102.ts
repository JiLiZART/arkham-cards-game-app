// Corrosion — discard [[Item]] assets from your play area and/or hand with a total printed cost of at least X, X the
// shroud of your location, one at a time as you choose; none discarded: it gains surge.
import {
  asNumber,
  type CardScript,
  controlled,
  def,
  discard,
  flags,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  shroud,
  type ScriptRun,
  queue,
  runScript,
} from "../../../../src/engine/api";

const items = (game: GameContext, i: InvId): InstId[] =>
  [...controlled(game, i).map((c) => c.id), ...inv(game, i).hand].filter(
    (id) => def(game, id).type === "asset" && def(game, id).traits.includes("Item"),
  );
const printedCost = (game: GameContext, id: InstId) => {
  const c = def(game, id).cost;
  return typeof c === "number" ? c : 0;
};

export default {
  abilities: [{ kind: "revelation", run: "corrode" }],
  fns: {
    corrode(game: GameContext, run: ScriptRun) {
      const loc = inv(game, run.you).location;
      // the first call: X from the location; a continuation: what is left of it
      const left =
        run.args === undefined ? (loc ? shroud(game, loc) : 0) : (asNumber(run.args) ?? 0);
      const pool = items(game, run.you);
      if (run.args === undefined && (!pool.length || left <= 0)) {
        flags.surge.set(game, run.source, true);
        return;
      }
      if (left <= 0 || !pool.length) return;
      const pick = run.chooseCard(pool, {
        text: "Choose an Item asset to discard",
        key: "corrosion",
      });
      const rest = left - printedCost(game, pick);
      discard(game, pick);
      if (rest > 0)
        queue(game, runScript({ code: "03102", fn: "corrode", ctx: run.ctx, args: rest }));
    },
  },
} satisfies CardScript;
