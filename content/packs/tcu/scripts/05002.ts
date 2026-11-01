// Joe Diamond — a hunch deck of 11 Insight events; its top card is revealed each investigation phase and playable at -2 cost
import {
  ask,
  card,
  type CardScript,
  def,
  type EffCtx,
  emit,
  flags,
  type G,
  type InstId,
  inv,
  type InvId,
  invName,
  moveCard,
  push,
  setController,
  shuffleList,
  type Step,
} from "../../../../src/engine/api";

const UNSOLVED_CASE = "05010";
const HUNCH_SIZE = 11;

/** the hunch deck, top first (its cards wait set aside) */
export const hunch = (g: G, i: InvId): InstId[] => flags.hunch.get(g, i) ?? [];
const revealed = (g: G, i: InvId) => flags.hunchRevealed.get(g, i);
const isInsightEvent = (g: G, id: InstId) =>
  def(g, id).type === "event" && def(g, id).traits.includes("Insight");

/** you may move an Insight event from your discard pile to the bottom of your hunch deck (Joe's elder sign, Detective's Colt 1911s) */
export function insightToHunch(g: G, you: InvId, step: Step | undefined) {
  if (flags.hunch.get(g, you) === undefined) return;
  const cands = inv(g, you).discard.filter((id) => isInsightEvent(g, id));
  if (!cands.length || !step) return;
  const pick = ask<InstId | "no">(
    g,
    step,
    you,
    "generic",
    "Move an Insight event from your discard pile to the bottom of your hunch deck?",
    [
      ...cands.map((id) => ({
        id,
        label: `Move ${def(g, id).name} to the hunch deck`,
        card: id,
        value: id,
      })),
      { id: "no", label: "Don't move", value: "no" as const },
    ],
    { key: "chooseOne" },
  );
  if (pick === undefined || pick === "no") return;
  moveCard(g, pick, "setAside");
  flags.hunch.set(g, you, [...hunch(g, you), pick]);
  emit(g, "hunch", `${def(g, pick).name} goes to the bottom of ${invName(g, you)}'s hunch deck`, {
    inv: you,
    card: pick,
  });
}

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "phaseBegins",
      condition: { phase: "investigation" },
      run: "reveal",
    },
    { kind: "forced", trigger: "phaseEnds", condition: { phase: "investigation" }, run: "putBack" },
    { kind: "elderSign", tokenValue: 1, run: "elder" },
  ],
  hooks: {
    /** choose 11 Insight events, Unsolved Case among them, and shuffle them into the hunch deck */
    setup(g: G, ctx: EffCtx) {
      const me = inv(g, ctx.you!);
      const insight = me.deck.filter((id) => isInsightEvent(g, id));
      // ponytail: the first Insight events of the decklist are taken; a choice at setup when deckbuilding needs it
      const chosen = [
        ...insight.filter((id) => card(g, id).code === UNSOLVED_CASE).slice(0, 1),
        ...insight.filter((id) => card(g, id).code !== UNSOLVED_CASE),
      ].slice(0, HUNCH_SIZE);
      for (const id of chosen) moveCard(g, id, "setAside");
      shuffleList(g, chosen);
      flags.hunch.set(g, String(ctx.you), chosen);
    },
  },
  extraPlayable(g: G, _cardId: InstId, i: InvId) {
    const id = revealed(g, i);
    return id && card(g, id).zone === "setAside" ? [id] : [];
  },
  fns: {
    reveal(g: G, ctx: EffCtx) {
      const [top, ...rest] = hunch(g, ctx.you!);
      if (!top) return;
      flags.hunch.set(g, String(ctx.you), rest);
      flags.hunchRevealed.set(g, String(ctx.you), top);
      flags.costMod.set(g, top, -2);
      emit(g, "hunch", `${invName(g, ctx.you!)} reveals a hunch: ${def(g, top).name}`, {
        inv: ctx.you!,
        card: top,
      });
    },
    putBack(g: G, ctx: EffCtx) {
      const you = ctx.you!;
      const id = revealed(g, you);
      flags.hunchRevealed.clear(g, you);
      if (!id) return;
      flags.costMod.clear(g, id);
      if (card(g, id).zone !== "setAside") return; // played
      // Unsolved Case: "If Unsolved Case would be shuffled into your hunch deck: add it to your threat area instead"
      if (card(g, id).code === UNSOLVED_CASE) {
        moveCard(g, id, "threat");
        setController(g, id, you);
        emit(g, "threat", `Unsolved Case enters ${invName(g, you)}'s threat area`, {
          inv: you,
          card: id,
        });
        return;
      }
      const deck = [...hunch(g, you), id];
      shuffleList(g, deck);
      flags.hunch.set(g, you, deck);
      emit(g, "hunch", `${def(g, id).name} is shuffled back into the hunch deck`, {
        inv: you,
        card: id,
      });
    },
    elder(g: G, ctx: EffCtx) {
      push(g, { t: "Script", code: "05002", fn: "toHunch", ctx });
    },
    toHunch(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      insightToHunch(g, ctx.you!, step);
    },
  },
} satisfies CardScript;
