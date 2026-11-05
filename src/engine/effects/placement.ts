/** Effects that put cards into play, attach, move, discard, remove or ready them. */
import { deckDiscarded, noReady } from "../world/flags";
import {
  ask,
  card,
  def,
  emit,
  type GameContext,
  inv,
  invName,
  leadInvestigator,
  push,
  cardIf,
  randomInt,
  ready,
  exhaust,
  setCardLocation,
  setController,
  setEngaged,
} from "../context";
import {
  cardsIn,
  connections,
  controlled,
  distances,
  enemiesAt,
  invsAt,
  locations,
  matchesFilter,
  isHidden,
  canReady,
} from "../queries";
import { discard, discardTop, isInPlay, moveCard, shuffleIntoDeck } from "../movement";
import { win } from "../rules/cards";
import type { InstId } from "../world/types";
import { amt, invTargets, opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { ZONE, CHOICE } from "../world/constants";
import { STEP } from "../steps/step";

function putInThreatAreaEffect(game: GameContext, run: EffectRun<EffectOf<"putInThreatArea">>) {
  const { you, src } = run;

  if (!src) return;
  moveCard(game, src.id, ZONE.Threat);
  setController(game, src.id, you);
  emit(game, EVENT.Threat, `${def(game, src.id).name} enters ${invName(game, you)}'s threat area`, {
    inv: you,
    card: src.id,
  });
  return;
}

function attachToLocationEffect(game: GameContext, run: EffectRun<EffectOf<"attachToLocation">>) {
  const { step, you, src } = run;
  const e = run.effect;

  if (!src) return;
  let cands =
    e.where === "yours"
      ? [inv(game, you).location!].filter(Boolean)
      : locations(game).map((l) => l.id);
  if (e.limitOnePerLocation)
    cands = cands.filter(
      (l) => !cardsIn(game, ZONE.Attached).some((a) => a.location === l && a.code === src.code),
    );
  if (e.where !== "yours" && cands.length) {
    const count = (l: InstId) =>
      e.where === "mostClues" ? card(game, l).clues : invsAt(game, l).length;
    const most = Math.max(...cands.map(count));
    cands = cands.filter((l) => count(l) === most);
  }
  if (!cands.length) {
    discard(game, src.id);
    return;
  }
  const pick = ask<InstId>(
    game,
    step,
    leadInvestigator(game),
    CHOICE.Target,
    `Attach ${def(game, src.id).name} to:`,
    cands.map((l) => opt(game, l)),
    { auto: true, key: "attach", vars: { card: src.id } },
  );
  if (pick === undefined) return;
  moveCard(game, src.id, ZONE.Attached, { location: pick });
  emit(game, EVENT.Attach, `${def(game, src.id).name} is attached to ${def(game, pick).name}`, {
    card: src.id,
  });
  return;
}

function discardSelfEffect(game: GameContext, run: EffectRun<EffectOf<"discardSelf">>) {
  const { src } = run;

  if (src && src.zone !== "discard" && src.zone !== "encounterDiscard") discard(game, src.id);
  return;
}

function addSelfToVictoryEffect(game: GameContext, run: EffectRun<EffectOf<"addSelfToVictory">>) {
  const { src } = run;

  if (!src) return;
  moveCard(game, src.id, ZONE.Victory);
  emit(game, EVENT.Victory, `${def(game, src.id).name} is added to the victory display`, {
    card: src.id,
  });
  push(game, { t: STEP.CheckObjectives });
  return;
}

function removeSelfEffect(game: GameContext, run: EffectRun<EffectOf<"removeSelf">>) {
  const { src } = run;

  if (src) moveCard(game, src.id, ZONE.Removed);
  return;
}

function returnSelfToHandEffect(game: GameContext, run: EffectRun<EffectOf<"returnSelfToHand">>) {
  const { src } = run;

  if (src?.owner) moveCard(game, src.id, ZONE.Hand);
  return;
}

function discardFromHandEffect(game: GameContext, run: EffectRun<EffectOf<"discardFromHand">>) {
  const { step, ctx } = run;
  const e = run.effect;

  const ts = invTargets(game, step, e.target, ctx);
  if (!ts) return;
  const i = ts[0];
  // a Hidden card leaves a hand only by its own text
  const discardable = (who: string) =>
    inv(game, who).hand.filter((h) => !isHidden(game, h) || h === ctx.source);
  let n = Math.min(amt(game, e.amount, ctx), discardable(i).length);
  const me = inv(game, i);
  if (e.random) {
    for (const t of ts) {
      for (let k = 0; k < n && discardable(t).length; k++) {
        const pool = discardable(t);
        discard(game, pool[randomInt(game, pool.length)]);
      }
    }
    return;
  }
  if (n <= 0) return;
  const pick = ask<InstId>(
    game,
    step,
    i,
    CHOICE.Generic,
    `${me.name}: choose a card to discard (${n})`,
    discardable(i).map((h) => opt(game, h)),
    { key: "discardN", vars: { n } },
  );
  if (pick === undefined) return;
  discard(game, pick);
  n--;
  if (n > 0)
    push(game, {
      ...step,
      choice: undefined,
      effect: { ...e, amount: n, target: "you" },
      ctx: { ...ctx, you: i },
    });
  return;
}

function discardAssetEffect(game: GameContext, run: EffectRun<EffectOf<"discardAsset">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const assets = controlled(game, you).filter(
    (c) => def(game, c.id).type === "asset" && !def(game, c.id).subtype,
  );
  if (!assets.length) {
    if (e.orElse) push(game, { t: STEP.Effects, effects: e.orElse, ctx });
    return;
  }
  const pick = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Generic,
    "Choose an asset to discard",
    assets.map((a) => opt(game, a.id)),
    { key: "discardAsset" },
  );
  if (pick === undefined) return;
  discard(game, pick);
  return;
}

function discardAllButOneFromHandEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"discardAllButOneFromHand">>,
) {
  const { step, you } = run;

  // a Hidden card stays in the hand whatever is kept
  const cards = inv(game, you).hand.filter((h) => !isHidden(game, h));
  if (cards.length <= 1) return;
  const keep = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Generic,
    "Choose 1 card to keep",
    cards.map((h) => opt(game, h)),
    { key: "keepOne" },
  );
  if (keep === undefined) return;
  for (const h of cards.filter((x) => x !== keep)) discard(game, h);
  return;
}

function removeDiscardFromGameEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"removeDiscardFromGame">>,
) {
  const { you } = run;

  const me = inv(game, you);
  for (const id of me.discard.slice()) moveCard(game, id, ZONE.Removed);
  emit(game, EVENT.Remove, `${me.name}'s discard pile is removed from the game`, { inv: you });
  return;
}

/** the top cards of the targets' decks discarded; a test's token effect keeps them for its X, an emptied deck is told */
function discardDeckTopEffect(game: GameContext, run: EffectRun<EffectOf<"discardDeckTop">>) {
  const { step, ctx } = run;
  const ts = invTargets(game, step, run.effect.target, ctx);
  if (!ts) return;
  for (const i of ts) {
    const had = inv(game, i).deck.length;
    const gone = discardTop(game, i, amt(game, run.effect.amount, ctx));
    if (ctx.testId !== undefined && gone.length) {
      const key = String(ctx.testId);
      deckDiscarded.set(game, key, [...(deckDiscarded.get(game, key) ?? []), ...gone]);
    }
    if (had && !inv(game, i).deck.length) push(game, win("deckEmptied", { inv: i }));
  }
}

/** the card the event was about discarded, if it is still in play, resolving or in the hand it was drawn to (Dr. Henry Armitage) */
function discardEventCardEffect(game: GameContext, run: EffectRun<EffectOf<"discardEventCard">>) {
  const c = run.ctx.card ? cardIf(game, run.ctx.card) : undefined;
  if (c && (isInPlay(c) || c.zone === ZONE.Resolving || c.zone === ZONE.Hand)) discard(game, c.id);
}

function moveToEffect(game: GameContext, run: EffectRun<EffectOf<"moveTo">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  // another investigator moved (Shortcut): who first, then where, you choosing both
  const who = e.target ? invTargets(game, step, e.target, ctx)?.[0] : you;
  if (!who) return;
  const from = inv(game, who).location;
  let cands: InstId[] = [];
  if (e.where === "connecting" && from) cands = connections(game, from);
  if (e.where === "connectingRevealed" && from)
    cands = connections(game, from).filter((l) => card(game, l).revealed);
  if (e.where === "revealedWithin2" && from) {
    const d = distances(game, from);
    cands = locations(game)
      .filter((l) => l.revealed && (d.get(l.id) ?? Infinity) <= 2)
      .map((l) => l.id);
  }
  if (e.where === "revealedNoEnemies")
    cands = locations(game)
      .filter((l) => l.revealed && enemiesAt(game, l.id).length === 0)
      .map((l) => l.id);
  if (e.where === "central")
    cands = locations(game)
      .filter((l) => def(game, l.id).traits.includes("Central"))
      .map((l) => l.id);
  if (e.where === "choose") cands = locations(game).map((l) => l.id);
  if (e.where === "eventLocation" && ctx.location) cands = [ctx.location];
  cands = cands.filter((l) => l !== from);
  if (!cands.length) return;
  const pick = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Target,
    "Choose a location to move to",
    cands.map((l) => opt(game, l)),
    { auto: true, key: "chooseMove" },
  );
  if (pick === undefined) return;
  push(game, { t: STEP.Move, inv: who, to: pick });
  return;
}

/** the event's enemy moved to a location connecting to its own (Bait and Switch); it engages no one while exhausted */
function moveEnemyEffect(game: GameContext, run: EffectRun<EffectOf<"moveEnemy">>) {
  const { step, ctx, you } = run;
  const e = ctx.enemy ? cardIf(game, ctx.enemy) : undefined;
  if (e?.zone !== ZONE.Enemy || !e.location) return;
  const cands = connections(game, e.location);
  if (!cands.length) return;
  const to = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Target,
    `Where does ${def(game, e.id).name} move?`,
    cands.map((l) => opt(game, l)),
    { auto: true, key: "enemyMoveWhere", vars: { card: e.id } },
  );
  if (to === undefined) return;
  const from = e.location;
  setEngaged(game, e.id, null);
  setCardLocation(game, e.id, to);
  emit(game, EVENT.EnemyMove, `${def(game, e.id).name} moves to ${def(game, to).name}`, {
    card: e.id,
    data: { from, to },
  });
  push(game, win("enemyEntersLocation", { enemy: e.id, location: to }));
}

/** every card you control matching the filter exhausted (Wracked by Nightmares) */
function exhaustCardsEffect(game: GameContext, run: EffectRun<EffectOf<"exhaustCards">>) {
  for (const c of controlled(game, run.you))
    if (!c.exhausted && matchesFilter(game, c.code, run.effect.filter)) exhaust(game, c.id);
}

function takeControlEffect(game: GameContext, run: EffectRun<EffectOf<"takeControl">>) {
  const { you, src } = run;

  if (!src) return;
  moveCard(game, src.id, ZONE.Play);
  setController(game, src.id, you);
  emit(game, EVENT.Control, `${invName(game, you)} takes control of ${def(game, src.id).name}`, {
    inv: you,
    card: src.id,
  });
  push(game, { t: STEP.SlotCheck, inv: you, card: src.id });
  return;
}

function takeFromDiscardEffect(game: GameContext, run: EffectRun<EffectOf<"takeFromDiscard">>) {
  const { step, you } = run;
  const e = run.effect;

  const me = inv(game, you);
  const pool = me.discard.filter((id) => matchesFilter(game, card(game, id).code, e.filter));
  if (!pool.length) return;
  const pick = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Generic,
    "Choose a card from your discard pile",
    pool.map((id) => opt(game, id)),
    { auto: true, key: "chooseFromDiscard" },
  );
  if (pick === undefined) return;
  moveCard(game, pick, ZONE.Hand);
  emit(game, EVENT.Search, `${me.name} returns ${def(game, pick).name} to their hand`, {
    inv: you,
    card: pick,
  });
  return;
}

function readyCardEffect(game: GameContext, run: EffectRun<EffectOf<"readyCard">>) {
  const { step, you } = run;
  const e = run.effect;

  const ids = controlled(game, you)
    .filter((c) => c.exhausted && matchesFilter(game, c.code, e.filter) && canReady(game, c.id))
    .map((c) => c.id);
  if (!ids.length) return;
  const pick = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Target,
    "Choose a card to ready",
    ids.map((id) => opt(game, id)),
    { auto: true, key: "chooseReady" },
  );
  if (pick === undefined) return;
  ready(game, pick);
  emit(game, EVENT.Ready, `${def(game, pick).name} is readied`, { inv: you, card: pick });
  return;
}

function shuffleSelfIntoDeckEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"shuffleSelfIntoDeck">>,
) {
  const { src } = run;

  if (!src?.owner) return;
  shuffleIntoDeck(game, src.id, src.owner);
  return;
}

function skipNextReadyEffect(game: GameContext, run: EffectRun<EffectOf<"skipNextReady">>) {
  const { ctx } = run;

  if (ctx.enemy) noReady.set(game, ctx.enemy, true);
  return;
}

export const placementEffects = {
  putInThreatArea: putInThreatAreaEffect,
  attachToLocation: attachToLocationEffect,
  discardSelf: discardSelfEffect,
  addSelfToVictory: addSelfToVictoryEffect,
  removeSelf: removeSelfEffect,
  returnSelfToHand: returnSelfToHandEffect,
  discardFromHand: discardFromHandEffect,
  discardAsset: discardAssetEffect,
  discardAllButOneFromHand: discardAllButOneFromHandEffect,
  removeDiscardFromGame: removeDiscardFromGameEffect,
  discardDeckTop: discardDeckTopEffect,
  discardEventCard: discardEventCardEffect,
  moveTo: moveToEffect,
  moveEnemy: moveEnemyEffect,
  exhaustCards: exhaustCardsEffect,
  takeControl: takeControlEffect,
  takeFromDiscard: takeFromDiscardEffect,
  readyCard: readyCardEffect,
  shuffleSelfIntoDeck: shuffleSelfIntoDeckEffect,
  skipNextReady: skipNextReadyEffect,
};
