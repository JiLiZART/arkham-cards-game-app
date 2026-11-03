// Joe Diamond — a hunch deck of 11 Insight events; its top card is revealed each investigation phase and playable at -2 cost
import {
  ask,
  card,
  type CardScript,
  def,
  emit,
  flags,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  invName,
  moveCard,
  push,
  setController,
  shuffleList,
  type Step,
  EVENT,
  ZONE,
  PHASE,
  CHOICE,
  STEP,
  type ScriptRun,
  type HookRun,
} from "../../../../src/engine/api";

const UNSOLVED_CASE = "05010";
const HUNCH_SIZE = 11;

/** the hunch deck, top first (its cards wait set aside) */
export const hunch = (game: GameContext, i: InvId): InstId[] => flags.hunch.get(game, i) ?? [];
const revealed = (game: GameContext, i: InvId) => flags.hunchRevealed.get(game, i);
const isInsightEvent = (game: GameContext, id: InstId) =>
  def(game, id).type === "event" && def(game, id).traits.includes("Insight");

/** you may move an Insight event from your discard pile to the bottom of your hunch deck (Joe's elder sign, Detective's Colt 1911s) */
export function insightToHunch(game: GameContext, you: InvId, step: Step | undefined) {
  if (flags.hunch.get(game, you) === undefined) return;
  const cands = inv(game, you).discard.filter((id) => isInsightEvent(game, id));
  if (!cands.length || !step) return;
  const pick = ask<InstId | "no">(
    game,
    step,
    you,
    CHOICE.Generic,
    "Move an Insight event from your discard pile to the bottom of your hunch deck?",
    [
      ...cands.map((id) => ({
        id,
        label: `Move ${def(game, id).name} to the hunch deck`,
        card: id,
        value: id,
      })),
      { id: "no", label: "Don't move", value: "no" as const },
    ],
    { key: "chooseOne" },
  );
  if (pick === undefined || pick === "no") return;
  moveCard(game, pick, ZONE.SetAside);
  flags.hunch.set(game, you, [...hunch(game, you), pick]);
  emit(
    game,
    EVENT.Hunch,
    `${def(game, pick).name} goes to the bottom of ${invName(game, you)}'s hunch deck`,
    {
      inv: you,
      card: pick,
    },
  );
}

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "phaseBegins",
      condition: { phase: PHASE.Investigation },
      run: "reveal",
    },
    {
      kind: "forced",
      trigger: "phaseEnds",
      condition: { phase: PHASE.Investigation },
      run: "putBack",
    },
    { kind: "elderSign", tokenValue: 1, run: "elder" },
  ],
  hooks: {
    /** choose 11 Insight events, Unsolved Case among them, and shuffle them into the hunch deck */
    setup(game: GameContext, run: HookRun) {
      const me = inv(game, run.you);
      const insight = me.deck.filter((id) => isInsightEvent(game, id));
      // ponytail: the first Insight events of the decklist are taken; a choice at setup when deckbuilding needs it
      const chosen = [
        ...insight.filter((id) => card(game, id).code === UNSOLVED_CASE).slice(0, 1),
        ...insight.filter((id) => card(game, id).code !== UNSOLVED_CASE),
      ].slice(0, HUNCH_SIZE);
      for (const id of chosen) moveCard(game, id, ZONE.SetAside);
      shuffleList(game, chosen);
      flags.hunch.set(game, run.you, chosen);
    },
  },
  extraPlayable(game: GameContext, _cardId: InstId, i: InvId) {
    const id = revealed(game, i);
    return id && card(game, id).zone === "setAside" ? [id] : [];
  },
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      const [top, ...rest] = hunch(game, run.you);
      if (!top) return;
      flags.hunch.set(game, String(run.ctx.you), rest);
      flags.hunchRevealed.set(game, String(run.ctx.you), top);
      flags.costMod.set(game, top, -2);
      emit(game, EVENT.Hunch, `${invName(game, run.you)} reveals a hunch: ${def(game, top).name}`, {
        inv: run.you,
        card: top,
      });
    },
    putBack(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const id = revealed(game, you);
      flags.hunchRevealed.clear(game, you);
      if (!id) return;
      flags.costMod.clear(game, id);
      if (card(game, id).zone !== "setAside") return; // played
      // Unsolved Case: "If Unsolved Case would be shuffled into your hunch deck: add it to your threat area instead"
      if (card(game, id).code === UNSOLVED_CASE) {
        moveCard(game, id, ZONE.Threat);
        setController(game, id, you);
        emit(game, EVENT.Threat, `Unsolved Case enters ${invName(game, you)}'s threat area`, {
          inv: you,
          card: id,
        });
        return;
      }
      const deck = [...hunch(game, you), id];
      shuffleList(game, deck);
      flags.hunch.set(game, you, deck);
      emit(game, EVENT.Hunch, `${def(game, id).name} is shuffled back into the hunch deck`, {
        inv: you,
        card: id,
      });
    },
    elder(game: GameContext, run: ScriptRun) {
      push(game, { t: STEP.Script, code: "05002", fn: "toHunch", ctx: run.ctx });
    },
    toHunch(game: GameContext, run: ScriptRun) {
      insightToHunch(game, run.you, run.step);
    },
  },
} satisfies CardScript;
