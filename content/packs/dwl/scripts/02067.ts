// Skin Game (The House Always Wins, act 2) — only investigators in the VIP Area may spend 2 [per_investigator] clues, as a
// group, to advance; back: before Extracurricular Activity, Dr. Morgan is in the VIP Area (act 3 "All In"); after it,
// Peter Clover and an Abomination enemy are in the Clover Club Bar (act 3 "Fold")
import {
  allCards,
  type CardScript,
  def,
  emit,
  type EffCtx,
  findByCode,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  pile,
  setController,
  shuffleDeck,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  advanceAct,
  spawn,
} from "../../../../src/engine/api";
import { canSpendHere, spendHere } from "./02052";
import { eaCompleted } from "./02063";

const VIP = "02076";

/** a set-aside story asset into play at a location, controlled by no one */
export function placeAlly(game: GameContext, code: string, at: InstId) {
  const ally = findByCode(game, code, [ZONE.SetAside]);
  if (!ally) return;
  moveCard(game, ally.id, ZONE.Attached, { location: at });
  setController(game, ally.id, null);
  emit(game, EVENT.Place, `${def(game, ally.id).name} is at ${def(game, at).name}`, {
    card: ally.id,
  });
}

const isAbomination = (game: GameContext, id: InstId) =>
  def(game, id).type === "enemy" && def(game, id).traits.includes("Abomination");

export default {
  abilities: [
    {
      kind: "fast",
      label: "Skin Game: spend 2 clues per investigator in the VIP Area, as a group, to advance",
      usableBy: "anyone",
      condition: { script: "canSpend" },
      run: "objective",
    },
    { kind: "revelation", run: "back" },
  ],
  conditions: {
    canSpend: (game: GameContext, ctx: EffCtx) => {
      const vip = findByCode(game, VIP, [ZONE.Location]);
      return (
        !!vip &&
        !!ctx.you &&
        inv(game, ctx.you).location === vip.id &&
        canSpendHere(game, vip.id, 2)
      );
    },
  },
  fns: {
    objective(game: GameContext, run: ScriptRun) {
      const vip = findByCode(game, VIP, [ZONE.Location]);
      if (!vip) return;
      spendHere(game, run, vip.id, 2);
      queue(game, advanceAct());
    },
    back(game: GameContext) {
      if (!eaCompleted(game)) {
        const vip = findByCode(game, VIP, [ZONE.Location]);
        if (vip) placeAlly(game, "02080", vip.id);
        return;
      }
      const bar = findByCode(game, "02072", [ZONE.Location]);
      if (!bar) return;
      placeAlly(game, "02079", bar.id);
      // "search the encounter deck (or out of play) for an Abomination enemy"
      const inDeck = pile(game, ZONE.EncounterDeck).find((id) => isAbomination(game, id));
      const aside = allCards(game).find(
        (c) => c.zone === ZONE.SetAside && isAbomination(game, c.id),
      )?.id;
      const found = inDeck ?? aside;
      if (inDeck) shuffleDeck(game, "encounter");
      if (found) queue(game, spawn({ enemy: found, inv: null, at: bar.id }));
    },
  },
} satisfies CardScript;
