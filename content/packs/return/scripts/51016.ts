// Clover Club Lounge (Return to The House Always Wins) — revealed, the set-aside Clover Club Stage comes into play; while
// it is act 1: look at the top card of your deck, an Ally asset you may put into play, any other card you draw (limit
// once per round)
import {
  argField,
  asString,
  cardIf,
  type CardScript,
  checkSlots,
  def,
  drawCards,
  emit,
  enterPlay,
  EVENT,
  type GameContext,
  inv,
  queue,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";
import { actOne } from "../../dwl/scripts/02071";

const isAlly = (game: GameContext, id: string) =>
  def(game, id).type === "asset" && def(game, id).traits.includes("Ally");

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "revealed",
      effects: [{ op: "putSetAsideIntoPlay", code: "51017" }],
    },
    {
      kind: "action",
      label: "Clover Club Lounge: look at the top card of your deck",
      limit: { per: "round", count: 1 },
      condition: { script: "actOne" },
      run: "look",
    },
  ],
  conditions: { actOne },
  fns: {
    look(game: GameContext, run: ScriptRun) {
      const top = inv(game, run.you).deck[0];
      if (!top) return;
      emit(game, EVENT.Look, `${inv(game, run.you).name} looks at ${def(game, top).name}`, {
        inv: run.you,
        card: top,
      });
      if (!isAlly(game, top)) {
        queue(game, drawCards({ inv: run.you, n: 1 }));
        return;
      }
      queue(game, runScript({ code: "51016", fn: "ally", ctx: run.ctx, args: { card: top } }));
    },
    /** "If it is an Ally asset, you may put it into play. Otherwise, draw it." */
    ally(game: GameContext, run: ScriptRun) {
      const ally = asString(argField(run.args, "card"));
      if (!ally || cardIf(game, ally)?.zone !== "deck") return;
      const play = run.choose<boolean>(
        [
          { id: "play", label: "Put it into play", value: true, key: "option.putIntoPlay" },
          { id: "draw", label: "Draw it", value: false, key: "option.drawIt" },
        ],
        { text: `${def(game, ally).name}: put it into play?`, key: "loungeAllyIntoPlay" },
        { auto: false },
      );
      queue(
        game,
        ...(play
          ? [checkSlots({ inv: run.you, card: ally }), enterPlay({ inv: run.you, card: ally })]
          : [drawCards({ inv: run.you, n: 1 })]),
      );
    },
  },
} satisfies CardScript;
