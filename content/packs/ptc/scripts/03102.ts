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

const printedCost = (game: GameContext, id: InstId) => {
  const c = def(game, id).cost;
  return typeof c === "number" ? c : 0;
};

/**
 * "Discard … with a total printed resource cost of at least X, where X is the shroud value of your location. If no
 * cards are discarded by this effect, it gains surge": the cards `pool` gives, one at a time as you choose
 */
export const discardToShroud = (
  code: string,
  pool: (game: GameContext, i: InvId) => InstId[],
  prompt: { text: string; key: string },
): CardScript => ({
  abilities: [{ kind: "revelation", run: "discardToShroud" }],
  fns: {
    discardToShroud(game: GameContext, run: ScriptRun) {
      const loc = inv(game, run.you).location;
      // the first call: X from the location; a continuation: what is left of it
      const left =
        run.args === undefined ? (loc ? shroud(game, loc) : 0) : (asNumber(run.args) ?? 0);
      const cards = pool(game, run.you);
      if (run.args === undefined && (!cards.length || left <= 0)) {
        flags.surge.set(game, run.source, true);
        return;
      }
      if (left <= 0 || !cards.length) return;
      const pick = run.chooseCard(cards, prompt);
      const rest = left - printedCost(game, pick);
      discard(game, pick);
      if (rest > 0)
        queue(game, runScript({ code, fn: "discardToShroud", ctx: run.ctx, args: rest }));
    },
  },
});

export default discardToShroud(
  "03102",
  (game, i) =>
    [...controlled(game, i).map((c) => c.id), ...inv(game, i).hand].filter(
      (id) => def(game, id).type === "asset" && def(game, id).traits.includes("Item"),
    ),
  { text: "Choose an Item asset to discard", key: "corrosion" },
);
