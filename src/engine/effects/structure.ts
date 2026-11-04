/** Effects on the scenario's structure: act and agenda decks (engine-scenario-structure). */
import { decksByName } from "../../content/schema";
import {
  allCards,
  card,
  cardsBeneath,
  currentAct,
  currentAgenda,
  deckCards,
  def,
  emit,
  type GameContext,
  inv,
  push,
  randomInt,
  reveal,
  scenarioIdOf,
  shuffleDeck,
  shuffleList,
} from "../context";
import { holderOf, locationByName } from "../queries";
import { STEP } from "../steps/step";
import { becomes, moveCard, putBeneath } from "../movement";
import { EVENT } from "../events/event";
import { ZONE } from "../world/constants";
import type { InstId } from "../world/types";
import type { EffectOf, EffectRun } from "./types";

/** an act or agenda deck back to its first card: its cards, advanced or not, in the scenario's order */
function resetDeckEffect(game: GameContext, run: EffectRun<EffectOf<"resetDeck">>) {
  const { kind, deck = "a" } = run.effect;
  const scen = game.db.scenarios[scenarioIdOf(game)];
  const entries = decksByName(kind === "act" ? scen.acts : scen.agendas)[deck] ?? [];
  const current = kind === "act" ? currentAct(game, deck) : currentAgenda(game, deck);
  // the deck's cards: the current one, those still beneath it, and those advanced out of play
  const pool: InstId[] = [
    ...(current ? [current] : []),
    ...deckCards(game, kind, deck),
    ...allCards(game)
      .filter((c) => c.zone === ZONE.Removed)
      .map((c) => c.id),
  ];
  const ordered: InstId[] = [];
  for (const e of entries) {
    const codes = typeof e === "string" ? [e] : e.oneOf;
    const id = pool.find((x) => !ordered.includes(x) && codes.includes(card(game, x).code));
    if (id) ordered.push(id);
  }
  for (const id of ordered)
    moveCard(game, id, kind === "act" ? ZONE.ActDeck : ZONE.AgendaDeck, { deck });
  if (!ordered.length) return;
  moveCard(game, ordered[0], kind === "act" ? ZONE.Act : ZONE.Agenda, { deck });
  emit(game, kind === "act" ? EVENT.Act : EVENT.Agenda, `The ${kind} deck is reset`, {
    card: ordered[0],
  });
}

function flipEffect(game: GameContext, run: EffectRun<EffectOf<"flip">>) {
  if (run.src) push(game, { t: STEP.Flip, card: run.src.id });
}

/** this card becomes a set-aside copy of `with`, its tokens and place kept; that copy leaves the game */
function swapEffect(game: GameContext, run: EffectRun<EffectOf<"swap">>) {
  const { src } = run;
  const copy = allCards(game).find((c) => c.code === run.effect.with && c.zone === ZONE.SetAside);
  if (!src || !copy) return;
  moveCard(game, copy.id, ZONE.Removed);
  becomes(game, src.id, run.effect.with);
}

function resolveStoryEffect(game: GameContext, run: EffectRun<EffectOf<"resolveStory">>) {
  const { src, you } = run;
  if (!src) return;
  // the first given resolves first: turned over, then resolved
  push(game, ...(run.effect.flip ? [{ t: STEP.Flip, card: src.id } as const] : []), {
    t: STEP.ResolveStory,
    card: src.id,
    you,
  });
}

// ---------- cards beneath cards ----------
function putBeneathEffect(game: GameContext, run: EffectRun<EffectOf<"putBeneath">>) {
  const { effect, ctx, src } = run;
  const under = holderOf(game, effect.under, ctx);
  const id = effect.card
    ? allCards(game).find((c) => c.code === effect.card && c.zone === ZONE.SetAside)?.id
    : src?.id;
  if (!under || !id || id === under) return;
  putBeneath(game, id, under);
  emit(game, EVENT.UnderAct, `${def(game, id).name} is placed beneath ${def(game, under).name}`, {
    card: id,
  });
}

/** the top card beneath a card, or one at random */
const topBeneath = (
  game: GameContext,
  holder: InstId | null,
  random?: boolean,
): InstId | undefined => {
  const pile = holder ? cardsBeneath(game, holder) : [];
  return random ? pile[randomInt(game, pile.length)] : pile[0];
};

function drawBeneathEffect(game: GameContext, run: EffectRun<EffectOf<"drawBeneath">>) {
  const id = topBeneath(game, holderOf(game, run.effect.from, run.ctx), run.effect.random);
  if (id) push(game, { t: STEP.DrawEncounter, inv: run.you, card: id });
}

function revealBeneathEffect(game: GameContext, run: EffectRun<EffectOf<"revealBeneath">>) {
  const id = topBeneath(game, holderOf(game, run.effect.from, run.ctx));
  if (!id) return;
  reveal(game, id);
  emit(game, EVENT.Reveal, `${def(game, id).name} is revealed`, { card: id });
}

function shuffleBeneathEffect(game: GameContext, run: EffectRun<EffectOf<"shuffleBeneath">>) {
  const holder = holderOf(game, run.effect.of, run.ctx);
  if (!holder) return;
  const ids = [...cardsBeneath(game, holder)];
  shuffleList(game, ids);
  for (const id of ids) putBeneath(game, id, holder);
}

function moveBeneathEffect(game: GameContext, run: EffectRun<EffectOf<"moveBeneath">>) {
  const holder = holderOf(game, run.effect.from, run.ctx);
  if (!holder) return;
  for (const id of [...cardsBeneath(game, holder)]) moveCard(game, id, run.effect.to);
  if (run.effect.to === ZONE.EncounterDeck) shuffleDeck(game, "encounter");
}

// ---------- the void, removing a location ----------
function toVoidEffect(game: GameContext, run: EffectRun<EffectOf<"toVoid">>) {
  if (!run.src) return;
  moveCard(game, run.src.id, ZONE.Void);
  emit(game, EVENT.Discard, `${def(game, run.src.id).name} goes into the void`, {
    card: run.src.id,
  });
}

function fromVoidEffect(game: GameContext, run: EffectRun<EffectOf<"fromVoid">>) {
  const c = allCards(game).find((x) => x.code === run.effect.code && x.zone === ZONE.Void);
  if (!c) return;
  const at = run.effect.at ? (locationByName(game, run.effect.at)?.id ?? null) : undefined;
  moveCard(game, c.id, ZONE.Limbo);
  push(
    game,
    at === undefined
      ? { t: STEP.Spawn, enemy: c.id, inv: run.you }
      : { t: STEP.Spawn, enemy: c.id, inv: null, at },
  );
}

function removeLocationEffect(game: GameContext, run: EffectRun<EffectOf<"removeLocation">>) {
  const { effect, src, you } = run;
  const loc = effect.location === "yourLocation" ? inv(game, you).location : src?.id;
  if (!loc) return;
  const to = effect.to ? locationByName(game, effect.to)?.id : undefined;
  push(
    game,
    to
      ? { t: STEP.RemoveLocation, location: loc, investigators: "move", to }
      : { t: STEP.RemoveLocation, location: loc },
  );
}

function readInterludeEffect(game: GameContext, run: EffectRun<EffectOf<"readInterlude">>) {
  push(game, { t: STEP.ReadInterlude, id: run.effect.id });
}

export const structureEffects = {
  readInterlude: readInterludeEffect,
  toVoid: toVoidEffect,
  fromVoid: fromVoidEffect,
  removeLocation: removeLocationEffect,
  putBeneath: putBeneathEffect,
  drawBeneath: drawBeneathEffect,
  revealBeneath: revealBeneathEffect,
  shuffleBeneath: shuffleBeneathEffect,
  moveBeneath: moveBeneathEffect,
  resetDeck: resetDeckEffect,
  flip: flipEffect,
  swap: swapEffect,
  resolveStory: resolveStoryEffect,
};
