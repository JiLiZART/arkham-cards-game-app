/** Effects that search and look at decks. */
import {
  activeInvs,
  addCounter,
  ask,
  card,
  def,
  emit,
  type GameContext,
  inv,
  invName,
  pile,
  push,
  setController,
  shuffleDeck,
} from "../context";
import { matchesFilter, uniqueInPlay } from "../queries";
import { moveCard, putOnTop, shuffleThenTop } from "../movement";
import { playCost } from "../rules/cards";
import type { InstId, InvId } from "../world/types";
import { amt, invTargets, opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { ZONE, CHOICE } from "../world/constants";
import { STEP } from "../steps/step";
import { scriptOf } from "../world/scripts";

/** a card that cancels a search of the deck it is found in, and is drawn instead (Dead Ends) */
function searchBlocked(game: GameContext, who: InvId, searched: readonly InstId[]): boolean {
  const id = searched.find((x) => scriptOf(game.db, card(game, x).code)?.cancelsSearch);
  if (!id) return false;
  shuffleThenTop(game, who, [id]);
  emit(game, EVENT.SearchCancelled, `${def(game, id).name} cancels the search`, {
    inv: who,
    card: id,
  });
  push(game, { t: STEP.Draw, inv: who, n: 1, tapped: true });
  return true;
}

function searchDeckEffect(game: GameContext, run: EffectRun<EffectOf<"searchDeck">>) {
  const { step, ctx } = run;
  const e = run.effect;

  const ts = invTargets(game, step, e.target, ctx);
  if (!ts) return;
  const who = ts[0];
  const me = inv(game, who);
  const n = e.top === undefined ? 0 : amt(game, e.top, ctx);
  const top = e.top !== undefined ? me.deck.slice(0, n) : null;
  if (step.choice === undefined && searchBlocked(game, who, top ?? me.deck)) return;
  const pool = (top ?? me.deck).filter((id) => matchesFilter(game, card(game, id).code, e.filter));
  // the top cards that don't match are shown too: the searcher sees what they looked at
  // the deck's investigator searches it (Old Book of Lore); for a card put into play, you do (Flare: any investigator's deck)
  const pick = ask<InstId | "none">(
    game,
    step,
    e.intoPlay ? run.you : who,
    CHOICE.Generic,
    `Search ${e.intoPlay && who !== run.you ? `${me.name}'s` : "your"} deck${top ? ` (top ${n})` : ""}`,
    [...pool.map((id) => opt(game, id)), { id: "none", label: "Take nothing", value: "none" }],
    {
      key: top ? "searchTop" : "searchDeck",
      vars: { n },
      shown: top?.filter((id) => !pool.includes(id)),
    },
  );
  if (pick === undefined) return;
  // the weaknesses among the searched cards are drawn as well, after the card found
  const weak = e.drawWeaknesses
    ? (top ?? []).filter((id) => id !== pick && !!def(game, id).subtype)
    : [];
  if (weak.length) {
    // the found card is shuffled with the deck, then lifted to the top with the weaknesses under it
    for (const id of weak) moveCard(game, id, ZONE.Limbo);
    shuffleDeck(game, me.id);
    putOnTop(game, who, [...(pick !== "none" ? [pick] : []), ...weak]);
    push(game, {
      t: STEP.Draw,
      inv: who,
      n: weak.length + (pick !== "none" ? 1 : 0),
      tapped: true,
    });
    return;
  }
  if (pick !== "none" && e.draw) {
    // drawn: the rest is shuffled, the card goes on top and is drawn from there (a weakness resolves as drawn)
    shuffleThenTop(game, who, [pick]);
    push(game, { t: STEP.Draw, inv: who, n: 1, tapped: true });
    return;
  }
  if (pick !== "none" && e.intoPlay) {
    // into play under the searcher's control, slots checked first; the searched deck shuffled
    moveCard(game, pick, ZONE.Limbo);
    setController(game, pick, run.you);
    shuffleDeck(game, me.id);
    push(
      game,
      { t: STEP.SlotCheck, inv: run.you, card: pick },
      { t: STEP.EnterPlay, inv: run.you, card: pick },
    );
    return;
  }
  if (pick !== "none") {
    moveCard(game, pick, ZONE.Hand);
    emit(game, EVENT.Search, `${me.name} adds ${def(game, pick).name} to their hand`, {
      inv: who,
      card: pick,
    });
  }
  shuffleDeck(game, me.id);
  if (pick === "none" && e.orDraw) push(game, { t: STEP.Draw, inv: who, n: 1, tapped: true });
  return;
}

function lookAtTopEffect(game: GameContext, run: EffectRun<EffectOf<"lookAtTop">>) {
  const { step, you } = run;
  const e = run.effect;

  const decks = e.anyDeck
    ? [
        ...activeInvs(game)
          .filter((i) => inv(game, i).deck.length)
          .map((i) => ({
            id: i,
            label: `${invName(game, i)}'s deck`,
            value: i,
            key: "option.deckOf",
            vars: { code: i },
          })),
        ...(pile(game, ZONE.EncounterDeck).length
          ? [
              {
                id: "encounter",
                label: "Encounter deck",
                value: "encounter",
                key: "option.encounterDeck",
              },
            ]
          : []),
      ]
    : [{ id: you, label: invName(game, you), value: you }];
  if (!decks.length) return;
  const deck = ask<InvId | "encounter">(
    game,
    step,
    you,
    CHOICE.Generic,
    "Choose a deck to look at",
    decks,
    { auto: true, key: "chooseDeck" },
  );
  if (deck === undefined) return;
  const cards = (
    deck === "encounter" ? pile(game, ZONE.EncounterDeck) : inv(game, deck).deck
  ).slice(0, e.amount);
  const whose = deck === "encounter" ? "the encounter deck" : invName(game, deck);
  emit(game, EVENT.Look, `${invName(game, you)} looks at the top ${cards.length} of ${whose}`, {
    inv: you,
    data: { n: cards.length },
  });
  push(game, { t: STEP.ArrangeTop, inv: you, deck, cards, placed: [] });
  return;
}

function searchAndPlayEffect(game: GameContext, run: EffectRun<EffectOf<"searchAndPlay">>) {
  const { step, you } = run;
  const e = run.effect;

  const me = inv(game, you);
  if (step.choice === undefined && searchBlocked(game, you, me.deck)) return;
  const pool = [...(e.discardOnly ? [] : me.deck), ...(e.deckOnly ? [] : me.discard)].filter(
    (id) =>
      matchesFilter(game, card(game, id).code, e.filter) &&
      me.resources >= Math.max(0, playCost(game, you, id) + (e.costMod ?? 0)) &&
      !uniqueInPlay(game, id),
  );
  const pick = ask<InstId | "none">(
    game,
    step,
    you,
    CHOICE.Generic,
    "Search your deck and discard pile",
    [...pool.map((id) => opt(game, id)), { id: "none", label: "Take nothing", value: "none" }],
    { key: "searchAndPlay" },
  );
  if (pick === undefined) return;
  if (pick !== "none") {
    emit(
      game,
      EVENT.Search,
      `${me.name} plays ${def(game, pick).name} from their deck or discard pile`,
      {
        inv: you,
        card: pick,
      },
    );
    if (e.costMod) {
      // the reduction is paid here; the card itself is then played for free
      addCounter(game, me.id, "resources", -Math.max(0, playCost(game, you, pick) + e.costMod));
      push(game, { t: STEP.PlayCard, inv: you, card: pick, free: true });
    } else push(game, { t: STEP.PlayCard, inv: you, card: pick });
  }
  shuffleDeck(game, me.id);
  return;
}

export const searchEffects = {
  searchDeck: searchDeckEffect,
  lookAtTop: lookAtTopEffect,
  searchAndPlay: searchAndPlayEffect,
};
