// Calling in Favors — an [[Ally]] asset you control back to your hand; then an Ally asset from the top 9 cards of your
// deck played, its cost reduced by the returned one's; the deck is shuffled
import {
  addCounter,
  argField,
  asNumber,
  type CardScript,
  controlled,
  def,
  emit,
  EVENT,
  type GameContext,
  type InstId,
  inv,
  invName,
  moveCard,
  playCard,
  playCost,
  queue,
  runScript,
  type ScriptRun,
  shuffleDeck,
  uniqueInPlay,
  ZONE,
} from "../../../../src/engine/api";

const isAlly = (game: GameContext, id: InstId) =>
  def(game, id).type === "asset" && def(game, id).traits.includes("Ally");
/** what the card costs once the returned ally's cost is taken off */
const reduced = (game: GameContext, you: string, id: InstId, x: number) =>
  Math.max(0, playCost(game, you, id) - x);

export default {
  abilities: [
    {
      kind: "onPlay",
      condition: { assetInPlay: { type: "asset", trait: "Ally" } },
      run: "favor",
    },
  ],
  fns: {
    favor(game: GameContext, run: ScriptRun) {
      const allies = controlled(game, run.you)
        .filter((c) => isAlly(game, c.id))
        .map((c) => c.id);
      if (!allies.length) return;
      const pick = run.chooseCard(allies, {
        text: "Choose an Ally asset to return to your hand",
        key: "returnAlly",
      });
      const cost = def(game, pick).cost;
      moveCard(game, pick, ZONE.Hand);
      emit(
        game,
        EVENT.Search,
        `${invName(game, run.you)} returns ${def(game, pick).name} to their hand`,
        {
          inv: run.you,
          card: pick,
        },
      );
      queue(
        game,
        runScript({
          code: "03158",
          fn: "search",
          ctx: run.ctx,
          args: { x: typeof cost === "number" ? cost : 0 },
        }),
      );
    },
    search(game: GameContext, run: ScriptRun) {
      const x = asNumber(argField(run.args, "x")) ?? 0;
      const me = inv(game, run.you);
      const found = me.deck
        .slice(0, 9)
        .filter(
          (id) =>
            isAlly(game, id) &&
            !uniqueInPlay(game, id) &&
            me.resources >= reduced(game, run.you, id, x),
        );
      const pick = run.choose<InstId | "none">(
        [
          ...found.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          { id: "none", label: "Play nothing", value: "none", key: "option.playNothing" },
        ],
        { text: "Choose an Ally asset to play", key: "callingInFavors" },
        { auto: false, shown: me.deck.slice(0, 9) },
      );
      if (pick !== "none") {
        addCounter(game, run.you, "resources", -reduced(game, run.you, pick, x));
        queue(game, playCard({ inv: run.you, card: pick, free: true }));
      }
      shuffleDeck(game, run.you);
    },
  },
} satisfies CardScript;
