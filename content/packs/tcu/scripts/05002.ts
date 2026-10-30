// Joe Diamond — a hunch deck of 11 Insight events; its top card is revealed each investigation phase and playable at -2 cost
import {
  ask,
  card,
  def,
  emit,
  inv,
  invName,
  moveCard,
  push,
  shuffle,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type InvId,
  type Step,
} from "../../../../src/engine/api";

const UNSOLVED_CASE = "05010";
const HUNCH_SIZE = 11;

/** the hunch deck, top first (its cards wait set aside) */
export const hunch = (g: G, i: InvId): InstId[] =>
  (g.s.flags[`hunch:${i}`] as InstId[] | undefined) ?? [];
const revealed = (g: G, i: InvId) => g.s.flags[`hunchRevealed:${i}`] as InstId | undefined;
const isInsightEvent = (g: G, id: InstId) =>
  def(g, id).type === "event" && def(g, id).traits.includes("Insight");

/** you may move an Insight event from your discard pile to the bottom of your hunch deck (Joe's elder sign, Detective's Colt 1911s) */
export function insightToHunch(g: G, you: InvId, step: Step | undefined) {
  if (g.s.flags[`hunch:${you}`] === undefined) return;
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
  g.s.flags[`hunch:${you}`] = [...hunch(g, you), pick];
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
      shuffle(g.s, chosen);
      g.s.flags[`hunch:${ctx.you}`] = chosen;
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
      g.s.flags[`hunch:${ctx.you}`] = rest;
      g.s.flags[`hunchRevealed:${ctx.you}`] = top;
      g.s.flags[`costMod:${top}`] = -2;
      emit(g, "hunch", `${invName(g, ctx.you!)} reveals a hunch: ${def(g, top).name}`, {
        inv: ctx.you!,
        card: top,
      });
    },
    putBack(g: G, ctx: EffCtx) {
      const you = ctx.you!;
      const id = revealed(g, you);
      delete g.s.flags[`hunchRevealed:${you}`];
      if (!id) return;
      delete g.s.flags[`costMod:${id}`];
      if (card(g, id).zone !== "setAside") return; // played
      // Unsolved Case: "If Unsolved Case would be shuffled into your hunch deck: add it to your threat area instead"
      if (card(g, id).code === UNSOLVED_CASE) {
        moveCard(g, id, "threat");
        card(g, id).controller = you;
        emit(g, "threat", `Unsolved Case enters ${invName(g, you)}'s threat area`, {
          inv: you,
          card: id,
        });
        return;
      }
      const deck = [...hunch(g, you), id];
      shuffle(g.s, deck);
      g.s.flags[`hunch:${you}`] = deck;
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
