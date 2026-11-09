import { explored, logEntry, peril, surge as surgeFlag } from "../world/flags";
import {
  abilitiesOf,
  actClueCost,
  actSpenders,
  enemies,
  gainsKeyword,
  hasKeyword,
  connectsBySymbol,
  POISONED,
  invsAt,
} from "../queries";
import {
  activeInvs,
  addCounter,
  allCards,
  card,
  cardIf,
  currentAct,
  currentAgenda,
  currentAgendas,
  currentPhase,
  deckCards,
  def,
  emit,
  endScenario,
  type GameContext,
  ask,
  inv,
  invName,
  isCancelled,
  leadInvestigator,
  logLength,
  periodCounter,
  pile,
  placeInvestigator,
  shuffleDeck,
  shuffleList,
  push,
  scenarioIdOf,
  setController,
  setCounter,
  tapToDraw,
} from "../context";
import { createCard, flip, link, moveCard, passBeneath, reshuffleDiscard } from "../movement";
import type { EffCtx, InstId, InvId, Step, StepOf } from "../world/types";
import { win } from "./cards";
import { EVENT } from "../events/event";
import { CHOICE, PILE, SCENARIO_CARD, ZONE, isOneOf, type Zone } from "../world/constants";
import type { ExplorationSpec } from "../../content/schema";
import { STEP } from "../steps/step";
import { scriptOf } from "../world/scripts";
import { fireCardHook, fireGameEnd, fireScenarioHook, hasScenarioHook } from "./scripts";

type Handler<T extends Step["t"]> = (game: GameContext, step: Extract<Step, { t: T }>) => void;

// ---------- encounter deck ----------
export const drawEncounterHandler: Handler<"DrawEncounter"> = (game, step) => {
  if (inv(game, step.inv).status !== "playing") return;
  // "when you would draw an encounter card during the mythos phase" (On the Hunt): only while a hand holds such a card
  if (!step.card && !step.key && currentPhase(game) === "mythos") {
    if (step.would && isCancelled(game, step.would)) return;
    if (
      !step.would &&
      allCards(game).some(
        (c) =>
          c.zone === "hand" &&
          abilitiesOf(game, c.id).some((a) => a.trigger === "wouldDrawEncounter"),
      )
    ) {
      const would = `would:${step.inv}:${logLength(game)}`;
      push(game, win("wouldDrawEncounter", { inv: step.inv, key: would }), { ...step, would });
      return;
    }
  }
  if (!step.card) {
    if (!tapToDraw(game, step, step.inv, "encounter", 1)) return;
    if (pile(game, ZONE.EncounterDeck).length === 0) {
      reshuffleDiscard(game, "encounter");
      emit(
        game,
        EVENT.Reshuffle,
        "The encounter discard pile is shuffled into a new encounter deck",
      );
    }
  }
  const id = step.card ?? pile(game, ZONE.EncounterDeck)[0];
  if (!id) return;
  const d = def(game, id);
  if (!step.key) {
    moveCard(game, id, ZONE.Resolving);
    emit(game, EVENT.Encounter, `${invName(game, step.inv)} draws ${d.name}`, {
      inv: step.inv,
      card: id,
    });
    // drawn from the deck: the draw can be cancelled before the card resolves (Ward of Protection 5, Dr. Maleson)
    if (!step.card) {
      const key = `enc:${id}:${logLength(game)}`;
      push(game, win("encounterDrawn", { inv: step.inv, card: id, key }), {
        ...step,
        card: id,
        key,
      });
      return;
    }
  } else if (isCancelled(game, step.key)) {
    // cancelled: discarded, unless the canceller put it elsewhere (shuffled back into the deck)
    if (cardIf(game, id)?.zone === ZONE.Resolving) moveCard(game, id, ZONE.EncounterDiscard);
    emit(game, EVENT.Cancelled, `${d.name} is cancelled`, { card: id });
    return;
  }
  // a location that prints its own revelation ("Put … into play") resolves it as a treachery does (Lost in Time and Space)
  if (d.type === "location" && !abilitiesOf(game, id).some((a) => a.kind === "revelation")) {
    // a location drawn as an encounter card enters play connected to the drawer's location
    const here = inv(game, step.inv).location;
    moveCard(game, id, ZONE.Location);
    if (here) link(game, id, here);
    push(game, { t: STEP.RevealLocation, location: id });
    return;
  }
  if (d.type === "enemy") {
    push(
      game,
      { t: STEP.Spawn, enemy: id, inv: step.inv },
      ...(d.keywords.includes("surge") ? [{ t: STEP.DrawEncounter, inv: step.inv } as Step] : []),
    );
    return;
  }
  push(game, win("treacheryDrawn", { inv: step.inv, card: id, key: `rev:${id}` }), {
    t: STEP.Revelation,
    inv: step.inv,
    card: id,
  });
};

/** a Hidden card goes into the investigator's hand, secretly; it works from there as if in their threat area */
export function hideInHand(game: GameContext, id: InstId, i: InvId) {
  moveCard(game, id, ZONE.Hand, { inv: i });
  setController(game, id, i);
  emit(game, EVENT.HiddenDrawn, `${invName(game, i)} takes a hidden card`, { inv: i, card: id });
}

export const revelationHandler: Handler<"Revelation"> = (game, step) => {
  const c = cardIf(game, step.card);
  if (!c) return;
  if (isCancelled(game, `rev:${step.card}`)) {
    emit(game, EVENT.Cancelled, `${def(game, step.card).name}'s revelation is cancelled`, {
      card: step.card,
    });
    moveCard(game, step.card, c.owner ? ZONE.Discard : ZONE.EncounterDiscard);
    return;
  }
  // Hidden: into the drawer's hand, secretly; one whose revelation offers something else resolves it (Delusory Evils)
  if (
    hasKeyword(game, step.card, "hidden") &&
    !abilitiesOf(game, step.card).some((a) => a.kind === "revelation")
  ) {
    hideInHand(game, step.card, step.inv);
    return;
  }
  moveCard(game, step.card, ZONE.Resolving);
  if (gainsKeyword(game, step.card, "peril")) peril.set(game, true);
  const ctx = { source: step.card, you: step.inv, inv: step.inv };
  const steps: Step[] = [];
  for (const a of abilitiesOf(game, step.card)) {
    if (a.kind !== "revelation") continue;
    if (a.run) steps.push({ t: STEP.Script, code: c.code, fn: a.run, ctx });
    else if (a.effects) steps.push({ t: STEP.Effects, effects: a.effects, ctx });
  }
  steps.push({ t: STEP.FinishRevelation, card: ctx.source!, inv: ctx.you! });
  push(game, ...steps);
};

export function finishRevelation(game: GameContext, cardId: InstId, invId: string) {
  const c = cardIf(game, cardId);
  peril.clear(game);
  const surges = surgeFlag.take(game, cardId) || gainsKeyword(game, cardId, "surge");
  // a treachery with Victory X is added to the victory display instead (Grimoire, Victory X)
  const d = def(game, cardId);
  const playerType = d.type === "asset" || d.type === "event" || d.type === "skill";
  if (c?.zone === "resolving")
    moveCard(
      game,
      cardId,
      // Vengeance X goes there as Victory X does (The Forgotten Age)
      !c.owner && (d.victory ?? d.vengeance) !== undefined
        ? ZONE.Victory
        : c.owner
          ? playerType
            ? ZONE.Hand
            : ZONE.Discard
          : ZONE.EncounterDiscard,
    );
  if (surges) push(game, { t: STEP.DrawEncounter, inv: invId });
}

// ---------- the Poisoned weakness (The Forgotten Age) ----------
/**
 * Set aside the Poisoned weaknesses not in an investigator's deck: `copies` in all, less those the investigators hold
 * (in the encounter deck when its set was gathered, made otherwise)
 */
export function setAsidePoisoned(game: GameContext, copies: number) {
  const all = allCards(game).filter((c) => c.code === POISONED);
  const held = all.filter((c) => !!c.owner).length;
  const loose = all.filter((c) => !c.owner);
  const want = Math.max(0, copies - held);
  loose.forEach((c, k) => moveCard(game, c.id, k < want ? ZONE.SetAside : ZONE.Removed));
  for (let k = loose.length; k < want; k++) createCard(game, POISONED, ZONE.SetAside);
}

// ---------- the exploration deck (ADR-0052) ----------
/**
 * Build the exploration deck: the listed cards (a code per copy), each pick's `count` codes at random, one location per
 * connection symbol of `bySymbol`, taken from the encounter deck, the set-aside cards and the side decks; then shuffled
 * with the seed, so a replay rebuilds the same deck.
 */
export function buildExploration(game: GameContext, spec: ExplorationSpec) {
  const out = (code: string) =>
    allCards(game).find(
      (c) =>
        c.code === code &&
        isOneOf(c.zone, ZONE.SetAside, ZONE.EncounterDeck, ZONE.SideDeck, ZONE.Limbo),
    )?.id;
  const put = (id: InstId) => moveCard(game, id, ZONE.Exploration);
  for (const code of spec.cards ?? []) {
    const id = out(code);
    if (id) put(id);
  }
  for (const p of spec.pick ?? []) {
    const pool = p.from.flatMap((code) => out(code) ?? []);
    shuffleList(game, pool);
    pool.forEach((id, k) => {
      if (k < p.count) put(id);
      else if (p.rest === "remove") moveCard(game, id, ZONE.Removed);
    });
  }
  // one location per symbol, the rest out of the game (Return to The Forgotten Age)
  const groups = new Map<string, InstId[]>();
  for (const code of spec.bySymbol ?? []) {
    const id = out(code);
    if (!id) continue;
    const key = def(game, id).symbol ?? code;
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  for (const ids of groups.values()) {
    shuffleList(game, ids);
    ids.forEach((id, k) => (k === 0 ? put(id) : moveCard(game, id, ZONE.Removed)));
  }
  shuffleDeck(game, "exploration");
}

/** a drawn card is the kind of location an Explore ability seeks: connected to the explorer's location, a trait, any */
function explorationMatch(game: GameContext, step: StepOf<"Explore">, id: InstId) {
  if (def(game, id).type !== "location") return false;
  const m = step.match;
  if ("any" in m) return true;
  if ("trait" in m) return def(game, id).traits.includes(m.trait);
  const here = inv(game, step.inv).location;
  return !!here && connectsBySymbol(game, here, id);
}

/**
 * Explore (ADR-0052, the Forgotten Age guide): draw the top card of the exploration deck. A matching location is put into
 * play with its clues and the investigator moves there (successful); another location is set beside the deck and the
 * next card drawn; an encounter card resolves as drawn, a treachery to the encounter discard (unsuccessful); an empty
 * deck ends it, neither. Then the set-aside locations are shuffled back and the `explored` window opens.
 */
export const exploreHandler: Handler<"Explore"> = (game, step) => {
  if (currentPhase(game) === "ended") return;
  if (step.ended) {
    for (const id of step.drawn)
      if (cardIf(game, id)?.zone === ZONE.Limbo) moveCard(game, id, ZONE.Exploration);
    if (step.drawn.length) shuffleDeck(game, "exploration");
    const { ok, location } = step.ended;
    if (ok !== undefined) {
      const turn = periodCounter(game, "turn");
      const rec = explored.get(game, step.inv);
      explored.set(game, step.inv, {
        turn,
        ok: [...(rec?.turn === turn ? rec.ok : []), ok],
      });
    }
    const after = ok ? (game.db.scenarios[scenarioIdOf(game)].afterExplore ?? []) : [];
    push(
      game,
      win("explored", { inv: step.inv, location, ...(ok !== undefined ? { ok } : {}) }),
      ...(after.length
        ? [
            {
              t: STEP.Effects,
              effects: after,
              ctx: { source: SCENARIO_CARD, you: step.inv },
            } as Step,
          ]
        : []),
    );
    return;
  }
  const here = inv(game, step.inv).location;
  const id = pile(game, PILE.Exploration)[0];
  if (!id) {
    emit(game, EVENT.Look, `The exploration deck is empty`, { inv: step.inv });
    push(game, { ...step, ended: { location: here } });
    return;
  }
  const d = def(game, id);
  if (d.type === "location") {
    if (explorationMatch(game, step, id)) {
      moveCard(game, id, ZONE.Location);
      emit(game, EVENT.Location, `${invName(game, step.inv)} explores and finds ${d.name}`, {
        inv: step.inv,
        card: id,
      });
      push(
        game,
        { t: STEP.RevealLocation, location: id, by: step.inv },
        { t: STEP.Move, inv: step.inv, to: id },
        { ...step, ended: { ok: true, location: id } },
      );
      return;
    }
    // not the place sought: beside the deck until the exploration ends
    moveCard(game, id, ZONE.Limbo);
    emit(game, EVENT.Look, `${d.name} is set beside the exploration deck`, {
      inv: step.inv,
      card: id,
    });
    push(game, { ...step, drawn: [...step.drawn, id] });
    return;
  }
  // a treachery or an enemy resolves as an encounter card drawn (a discarded one to the encounter discard pile)
  moveCard(game, id, ZONE.Limbo);
  push(
    game,
    { t: STEP.DrawEncounter, inv: step.inv, card: id },
    { ...step, ended: { ok: false, location: here } },
  );
};

// ---------- doom, agenda, act ----------
const DOOM_ZONES: Zone[] = [
  ZONE.Agenda,
  ZONE.Act,
  ZONE.Enemy,
  ZONE.Play,
  ZONE.Location,
  ZONE.Attached,
  ZONE.Threat,
];
export const doomInPlay = (game: GameContext) =>
  allCards(game)
    .filter((c) => DOOM_ZONES.includes(c.zone))
    .reduce((n, c) => n + c.doom, 0);

/** the agenda decks with a current card, in deck order */
const agendaDecks = (game: GameContext): [string, InstId][] =>
  Object.entries(currentAgendas(game)).filter((e): e is [string, InstId] => !!e[1]);

export const placeDoomHandler: Handler<"PlaceDoom"> = (game, step) => {
  let target = step.card;
  if (target === "agenda") {
    // "on the agenda": with several agenda decks the lead chooses which (Black Stars Rise)
    const decks = agendaDecks(game);
    if (!decks.length) return;
    const pick = ask<InstId>(
      game,
      step,
      leadInvestigator(game),
      CHOICE.Target,
      `Choose the agenda that takes ${step.n} doom`,
      decks.map(([, id]) => ({ id, label: def(game, id).name, card: id, value: id })),
      { auto: true, key: "doomOnWhichAgenda", vars: { n: step.n } },
    );
    if (pick === undefined) return;
    target = pick;
  }
  const c = cardIf(game, target);
  if (!c) return;
  // the agenda may replace placing doom (Brethren of Ash)
  const agenda = currentAgenda(game) ? cardIf(game, currentAgenda(game)) : undefined;
  if (agenda && scriptOf(game.db, agenda.code)?.wouldPlaceDoom?.(game, agenda.id, step.n)) return;
  addCounter(game, c.id, "doom", step.n);
  emit(game, EVENT.Doom, `${step.n} doom placed on ${def(game, c.id).name}`, {
    card: c.id,
    data: { n: step.n },
  });
  push(game, win("doomPlaced", { card: c.id, amount: step.n }));
};

/** the doom an agenda counts: its own and every non-agenda card's, not another agenda deck's (Black Stars Rise) */
export const doomFor = (game: GameContext, agenda: InstId) =>
  allCards(game)
    .filter((c) => DOOM_ZONES.includes(c.zone) && (c.zone !== ZONE.Agenda || c.id === agenda))
    .reduce((n, c) => n + c.doom, 0);

export const checkDoomHandler: Handler<"CheckDoom"> = (game, step) => {
  if (currentPhase(game) === "ended") return;
  // each agenda deck whose threshold is met advances, in deck order
  const due = agendaDecks(game).filter(
    ([, id]) =>
      doomFor(game, id) >= (def(game, id).doom ?? Infinity) &&
      // "when this agenda would advance by reaching its doom threshold: instead, …"
      !fireCardHook(game, card(game, id).code, "doomThreshold", {
        source: id,
        you: leadInvestigator(game),
      }),
  );
  const advance = (deck: string): Step =>
    deck === "a" ? { t: STEP.AdvanceAgenda } : { t: STEP.AdvanceAgenda, deck };
  if (due.length > 1) {
    // "choose only one agenda to advance. Then, once you have completed advancing that agenda, check the doom threshold
    // of the other agenda" (Black Stars Rise's dual agendas)
    const pick = ask<string>(
      game,
      step,
      leadInvestigator(game),
      CHOICE.Target,
      "Choose the agenda that advances first",
      due.map(([deck, id]) => ({ id: deck, label: def(game, id).name, card: id, value: deck })),
      { key: "advanceWhichAgenda" },
    );
    if (pick === undefined) return;
    push(game, advance(pick), { t: STEP.CheckDoom });
    return;
  }
  push(game, ...due.map(([deck]) => advance(deck)));
};

function backSide(game: GameContext, id: InstId, by?: EffCtx["actAdvancedBy"]): Step[] {
  const c = card(game, id);
  const ctx = { source: id, you: leadInvestigator(game), ...(by ? { actAdvancedBy: by } : {}) };
  return abilitiesOf(game, id)
    .filter((a) => a.kind === "revelation")
    .map((a): Step =>
      a.run
        ? { t: STEP.Script, code: c.code, fn: a.run, ctx }
        : { t: STEP.Effects, effects: a.effects ?? [], ctx },
    );
}

export const advanceAgendaHandler: Handler<"AdvanceAgenda"> = (game, step) => {
  const deck = step.deck ?? "a";
  const id = currentAgenda(game, deck);
  if (!id) return;
  if (!step.fired) {
    push(game, win("agendaAdvances", { card: id }), { ...step, fired: true });
    return;
  }
  // the doom this agenda counted is removed; another agenda deck keeps its own
  for (const c of allCards(game))
    if (DOOM_ZONES.includes(c.zone) && (c.zone !== ZONE.Agenda || c.id === id))
      setCounter(game, c.id, "doom", 0);
  emit(
    game,
    EVENT.AgendaAdvance,
    `Agenda advances: ${def(game, id).backName ?? def(game, id).name}`,
    {
      card: id,
    },
  );
  moveCard(game, id, ZONE.Limbo);
  push(
    game,
    ...backSide(game, id),
    deck === "a" ? { t: STEP.NextAgenda, card: id } : { t: STEP.NextAgenda, card: id, deck },
  );
};

export function nextAgenda(game: GameContext, prev: InstId, deck = "a") {
  if (currentPhase(game) === "ended") return;
  const next = deckCards(game, "agenda", deck)[0];
  // the cards beneath the agenda stay beneath the deck's next one (Blood on the Altar's sacrifices)
  if (next) passBeneath(game, prev, next);
  moveCard(game, prev, ZONE.Removed);
  if (next) {
    moveCard(game, next, ZONE.Agenda, { deck });
    emit(game, EVENT.Agenda, `New agenda: ${def(game, next).name}`, { card: next });
  } else endUnscripted(game, prev, EVENT.Agenda);
}

/**
 * The resolution an unscripted last act or agenda leads to (generated scenarios, ADR-0007): the "(→R2)" its back
 * names when the scenario has it, else the first numbered resolution for an act and no resolution for an agenda.
 */
export function finalResolution(
  backText: string | undefined,
  ids: string[],
  kind: "act" | "agenda",
): string {
  const named = /→\s*(R\d+)/.exec((backText ?? "").replace(/<[^>]+>/g, ""))?.[1];
  if (named && ids.includes(named)) return named;
  if (kind === "agenda") return "none";
  return (
    ids
      .filter((i) => /^R\d+$/.test(i))
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))[0] ?? "none"
  );
}

/** the deck ran out and the card's back did nothing (no written behaviour): the scenario ends rather than stalls */
function endUnscripted(game: GameContext, prev: InstId, kind: "act" | "agenda") {
  if (backSide(game, prev).length) return;
  push(game, {
    t: STEP.Resolution,
    id: finalResolution(
      def(game, prev).backText,
      Object.keys(game.db.scenarios[scenarioIdOf(game)].resolutions),
      kind,
    ),
  });
}

export { actClueCost };

export const advanceActHandler: Handler<"AdvanceAct"> = (game, step) => {
  const deck = step.deck ?? "a";
  const id = currentAct(game, deck);
  if (!id) return;
  if (step.spend) {
    let n = actClueCost(game, deck);
    // the lead's first, then the others' (only those who may spend them)
    const spenders = actSpenders(game, deck);
    const order = [
      leadInvestigator(game),
      ...activeInvs(game).filter((x) => x !== leadInvestigator(game)),
    ].filter((x) => spenders.includes(x));
    for (const i of order) {
      const take = Math.min(n, inv(game, i).clues);
      addCounter(game, i, "clues", -take);
      n -= take;
    }
  }
  emit(game, EVENT.ActAdvance, `Act advances: ${def(game, id).backName ?? def(game, id).name}`, {
    card: id,
  });
  moveCard(game, id, ZONE.Limbo);
  push(
    game,
    ...backSide(game, id, step.spend ? "clues" : step.by),
    deck === "a" ? { t: STEP.NextAct, card: id } : { t: STEP.NextAct, card: id, deck },
  );
};

export function nextAct(game: GameContext, prev: InstId, deck = "a") {
  if (currentPhase(game) === "ended") return;
  const next = deckCards(game, "act", deck)[0];
  // the cards beneath the act stay beneath the deck's next one (Smoke and Mirrors' interrogated suspects)
  if (next) passBeneath(game, prev, next);
  moveCard(game, prev, ZONE.Removed);
  if (next) {
    moveCard(game, next, ZONE.Act, { deck });
    emit(game, EVENT.Act, `New act: ${def(game, next).name}`, { card: next });
    fireScenarioHook(game, "actAdvanced", next);
  } else endUnscripted(game, prev, EVENT.Act);
}

export const flipHandler: Handler<"Flip"> = (game, step) => {
  if (cardIf(game, step.card)) flip(game, step.card);
};

/** a story face: shown (the UI stops on it), its abilities run, its script told, then what the card says */
export const resolveStoryHandler: Handler<"ResolveStory"> = (game, step) => {
  const c = cardIf(game, step.card);
  if (!c) return;
  if (!step.shown) {
    emit(game, EVENT.StoryShown, `${def(game, c.id).name}`, { card: c.id, inv: step.you });
    const ctx = { source: c.id, you: step.you };
    push(
      game,
      ...abilitiesOf(game, c.id)
        .filter((a) => a.kind === "revelation")
        .map((a): Step =>
          a.run
            ? { t: STEP.Script, code: c.code, fn: a.run, ctx }
            : { t: STEP.Effects, effects: a.effects ?? [], ctx },
        ),
      { ...step, shown: true },
    );
    return;
  }
  fireCardHook(game, c.code, "storyResolved", { source: c.id, you: step.you }, c.id);
  const after = def(game, c.id).story?.after ?? "stay";
  if (after === "flipBack") flip(game, c.id);
  else if (after === "remove") moveCard(game, c.id, ZONE.Removed);
};

/**
 * A location leaves play (Grimoire: the card says so; Essex County Express, Lost in Time and Space): the scenario is told
 * first; the investigators there are defeated unless the card moves them; its enemies are discarded; it goes to the
 * victory display when it has Victory X and no clues, else to the encounter discard (its attachments with it), or out of
 * the game when the card says "remove".
 */
export const removeLocationHandler: Handler<"RemoveLocation"> = (game, step) => {
  const loc = cardIf(game, step.location);
  if (!loc || loc.zone !== ZONE.Location) return;
  fireScenarioHook(game, "locationLeavesPlay", loc.id);
  for (const i of invsAt(game, loc.id)) {
    if (step.investigators === "move" && step.to) placeInvestigator(game, i, step.to);
    else push(game, { t: STEP.Defeated, inv: i, by: "effect" });
  }
  for (const e of enemies(game).filter((x) => x.location === loc.id))
    moveCard(game, e.id, e.owner ? ZONE.Discard : ZONE.EncounterDiscard, { inv: e.owner });
  const d = def(game, loc.id);
  emit(game, EVENT.LocationRemoved, `${d.name} leaves play`, { card: loc.id });
  moveCard(
    game,
    loc.id,
    (d.victory ?? d.vengeance) !== undefined && loc.clues === 0
      ? ZONE.Victory
      : step.outOfGame
        ? ZONE.Removed
        : ZONE.EncounterDiscard,
  );
};

/** a mid-scenario interlude: its text as the prompt, the lead answers its choice, the answer recorded for the campaign log */
export const readInterludeHandler: Handler<"ReadInterlude"> = (game, step) => {
  const it = game.db.scenarios[scenarioIdOf(game)].interludes?.[step.id];
  if (!it) return;
  if (step.choice === undefined) emit(game, EVENT.Interlude, it.text, { data: { id: step.id } });
  const pick = ask<string>(
    game,
    step,
    leadInvestigator(game),
    CHOICE.Generic,
    it.text,
    it.choices.map((c) => ({ id: c.id, label: c.label, value: c.id })),
  );
  if (pick === undefined) return;
  const rec = it.choices.find((c) => c.id === pick)?.record;
  if (rec) logEntry.set(game, [rec.section ?? "campaign_notes", rec.id], true);
};

export const checkObjectivesHandler: Handler<"CheckObjectives"> = (game) => {
  if (currentPhase(game) === "ended") return;
  fireScenarioHook(game, "checkObjectives");
};

export const resolutionHandler: Handler<"Resolution"> = (game, step) => {
  if (currentPhase(game) === "ended") return;
  endScenario(game, step.id);
  // what the scenario's script records about the game, before its cards are gone (Smoke and Mirrors)
  fireScenarioHook(game, "ended", step.id !== "none");
  // "when the game ends" effects (Cover Up, Hospital Debts; Dead Ends in the hand; Smite the Wicked on its enemy)
  fireGameEnd(
    game,
    allCards(game).filter(
      (c) =>
        c.zone === "threat" ||
        c.zone === "play" ||
        c.zone === "hand" ||
        (c.zone === "attached" && !!c.owner),
    ),
  );
  const r = game.db.scenarios[scenarioIdOf(game)].resolutions[step.id];
  emit(game, EVENT.Resolution, `Scenario ends: ${r?.title ?? step.id}`, { data: { id: step.id } });
};

export function allEliminated(game: GameContext) {
  if (hasScenarioHook(game, "allEliminated")) fireScenarioHook(game, "allEliminated");
  else push(game, { t: STEP.Resolution, id: "none" });
}

export const handlers = {
  FinishRevelation: (game: GameContext, step: StepOf<"FinishRevelation">) =>
    finishRevelation(game, step.card, step.inv),
  AllEliminated: (game: GameContext) => allEliminated(game),
  NextAgenda: (game: GameContext, step: StepOf<"NextAgenda">) =>
    nextAgenda(game, step.card, step.deck),
  NextAct: (game: GameContext, step: StepOf<"NextAct">) => nextAct(game, step.card, step.deck),
  DrawEncounter: drawEncounterHandler,
  Revelation: revelationHandler,
  PlaceDoom: placeDoomHandler,
  CheckDoom: checkDoomHandler,
  AdvanceAgenda: advanceAgendaHandler,
  AdvanceAct: advanceActHandler,
  Flip: flipHandler,
  ResolveStory: resolveStoryHandler,
  RemoveLocation: removeLocationHandler,
  ReadInterlude: readInterludeHandler,
  CheckObjectives: checkObjectivesHandler,
  Resolution: resolutionHandler,
  Explore: exploreHandler,
};
