import {
  decksByName,
  type CampaignDef,
  type LogCondition,
  type SetupStep,
} from "../content/schema";
import {
  addCounter,
  addTokens,
  allCards,
  cardOf,
  cardOfIf,
  emit,
  type GameContext,
  inv,
  pileOf,
  placeInvestigator,
  push,
  shuffleDeck,
  setCode,
  reveal,
  setController,
  setCounter,
} from "./context";
import { createCard, moveCard, putBeneath } from "./movement";
import { findByCode, locationByName, matchesFilter } from "./queries";
import { legalTurnActions } from "./rules/round";
import { drawOpeningCards, revealLocation } from "./rules/investigators";
import { run } from "./steps/dispatch";
import { fireCardHook, runScript } from "./rules/scripts";
import { discardFromOpeningHands } from "./world/flags";
import { randInt, shuffle } from "./world/rng";
import { deckPile, newWorld, pileRec } from "./world/store";
import type {
  Action,
  ChoiceOption,
  ContentDb,
  GameEvent,
  GameSetup,
  GameState,
  InstId,
  Step,
} from "./world/types";
import { EVENT } from "./events/event";
import { ZONE, PHASE, INV_STATUS, PILE, SCENARIO_CARD, isOneOf } from "./world/constants";
import { STEP } from "./steps/step";
import { scriptOf } from "./world/scripts";

export const ENGINE_VERSION = 9;

/**
 * Whether a save written by this engine version replays to the same game on this one. Version 8 changed the setup (a
 * card's back face is no longer a card of its own, the scenario card is an instance: engine-scenario-structure) and
 * version 9 the enemy phase and bonded cards (engine-generic-keywords), so an older save's choices may name other cards
 * or steps: its scenario restarts, its campaign kept.
 */
export const replaysSave = (version: number) => version === ENGINE_VERSION;

// ---------- setup ----------
export function checkLog(
  log: Record<string, unknown>,
  c: LogCondition | undefined,
  players: number,
): boolean {
  if (!c) return true;
  if ("logHas" in c) return !!log[c.logHas];
  if ("not" in c) return !checkLog(log, c.not, players);
  if ("playerCount" in c) return players === c.playerCount;
  if ("playersAtLeast" in c) return players >= c.playersAtLeast;
  if ("logCount" in c) {
    const v = log[c.logCount.key];
    const n = Array.isArray(v) ? v.length : 0;
    return n >= (c.logCount.min ?? 0) && n <= (c.logCount.max ?? Infinity);
  }
  return false;
}

function emptyState(setup: GameSetup): GameState {
  return {
    version: ENGINE_VERSION,
    seed: setup.seed,
    rng: setup.seed >>> 0,
    seq: 0,
    scenarioId: setup.scenarioId,
    campaignId: setup.campaignId,
    difficulty: setup.difficulty,
    round: 0,
    phase: PHASE.Setup,
    counters: { turn: 0, phase: 0, round: 0, test: 0, reveal: 0 },
    world: newWorld(),
    order: [],
    lead: setup.investigators[0].code,
    active: null,
    acts: {},
    agendas: {},
    chaosBag: [],
    skillTest: null,
    testStack: [],
    tempMods: [],
    usage: {},
    queue: [],
    pending: null,
    cancelled: [],
    log: [],
    flags: {},
    campaignLog: setup.campaignLog ?? {},
    resolution: null,
    nextId: 1,
    ...(setup.pacePhases ? { pacePhases: true } : {}),
    ...(setup.tapDecks ? { tapDecks: true } : {}),
  };
}

function locByRef(game: GameContext, ref: string) {
  return findByCode(game, ref, [ZONE.Location]) ?? locationByName(game, ref);
}

/**
 * The sets a scenario gathers with the chosen options: each replaced set swapped for its replacement (dropped when the
 * replacement is already listed), and the added sets appended to the encounter deck's.
 */
export function gatherSets(declared: CampaignDef["options"], chosen: readonly string[]) {
  const on = declared.filter((o) => chosen.includes(o.id));
  const replacing = new Map(
    on.flatMap((o) => Object.entries(o.replaceSets).map(([n, old]) => [old, n] as const)),
  );
  const added = on.flatMap((o) => o.addSets);
  return (sets: readonly string[], encounterDeck: boolean): string[] => {
    const out: string[] = [];
    for (const set of [...sets.map((x) => replacing.get(x) ?? x), ...(encounterDeck ? added : [])])
      if (!out.includes(set)) out.push(set);
    return out;
  };
}

function applySetupStep(game: GameContext, st: SetupStep) {
  const s = game.s;
  if (!checkLog(s.campaignLog, st.when, s.order.length)) return;
  const take = (code: string) =>
    allCards(game).find(
      (c) =>
        c.code === code &&
        isOneOf(c.zone, ZONE.SetAside, ZONE.EncounterDeck, ZONE.SideDeck, ZONE.Limbo),
    );
  // a back face named on its own is its front with that side up (Midnight Masks' 01121b): the front's copies turn over
  const named =
    "codes" in st
      ? st.codes
      : "from" in st && Array.isArray(st.from)
        ? st.from
        : "code" in st
          ? [st.code]
          : [];
  for (const code of named) {
    const front = game.db.cards[code]?.front;
    if (!front) continue;
    for (const c of allCards(game))
      if (
        c.code === front &&
        isOneOf(c.zone, ZONE.SetAside, ZONE.EncounterDeck, ZONE.SideDeck, ZONE.Limbo)
      )
        setCode(game, c.id, code);
  }
  switch (st.do) {
    case "putIntoPlay":
      for (const code of st.codes) {
        const c = take(code);
        if (c) moveCard(game, c.id, ZONE.Location);
      }
      return;
    case "putRandomIntoPlay": {
      const pool = st.filter
        ? allCards(game)
            .filter((c) => c.zone === ZONE.SetAside && matchesFilter(game, c.code, st.filter!))
            .map((c) => c.id)
        : st.from
            .map(take)
            .filter(Boolean)
            .map((c) => c!.id);
      shuffle(s, pool);
      pool.forEach((id, k) =>
        moveCard(
          game,
          id,
          k < st.count ? ZONE.Location : st.removeRest ? ZONE.Removed : ZONE.SetAside,
        ),
      );
      return;
    }
    case "setAside":
      // every copy of each code (or `count` of them) out of the decks; a copy already set aside is not taken again
      for (const code of new Set(st.codes)) {
        const copies = allCards(game).filter(
          (x) => x.code === code && isOneOf(x.zone, ZONE.EncounterDeck, ZONE.SideDeck, ZONE.Limbo),
        );
        for (const c of copies.slice(0, st.count ?? copies.length))
          moveCard(game, c.id, ZONE.SetAside);
      }
      return;
    case "remove":
      // every copy of each code leaves the game
      for (const code of new Set(st.codes))
        for (const c of allCards(game).filter((x) => x.code === code && x.zone !== "removed"))
          moveCard(game, c.id, ZONE.Removed);
      return;
    case "startAt": {
      const loc = locByRef(game, st.code);
      if (!loc) throw new Error(`startAt: ${st.code} not in play`);
      for (const i of s.order) placeInvestigator(game, i, loc.id);
      return;
    }
    case "spawn": {
      const c = take(st.code);
      const loc = locByRef(game, st.at);
      if (c && loc) {
        moveCard(game, c.id, ZONE.Limbo);
        push(game, { t: STEP.Spawn, enemy: c.id, inv: null, at: loc.id });
      }
      return;
    }
    case "shuffleIntoEncounter":
      for (const code of st.codes) {
        const c = take(code);
        if (c) moveCard(game, c.id, ZONE.EncounterDeck);
        else if (st.create) createCard(game, code, ZONE.EncounterDeck);
      }
      return;
    case "chooseRandom": {
      const codes = [...st.from];
      shuffle(s, codes);
      const n = st.n ?? 1;
      const kind = st.then === "act" || st.then === "agenda" ? st.then : null;
      for (const code of codes.slice(0, n)) {
        // an act or agenda isn't in a pool: it's made, and goes on top of its deck as the current card
        const c = take(code) ?? (kind ? cardOf(s, createCard(game, code, ZONE.Limbo)) : undefined);
        if (!c) continue;
        if (kind) {
          const deck = st.deck ?? "a";
          const was = kind === "act" ? s.acts[deck] : s.agendas[deck];
          if (was)
            moveCard(game, was, kind === "act" ? ZONE.ActDeck : ZONE.AgendaDeck, {
              deck,
              top: true,
            });
          moveCard(game, c.id, kind === "act" ? ZONE.Act : ZONE.Agenda, { deck });
        } else moveCard(game, c.id, st.then === "putIntoPlay" ? ZONE.Location : ZONE.SetAside);
        const back = game.db.cards[code].back;
        if (st.backs && back) {
          const b = take(back) ?? cardOf(s, createCard(game, back, ZONE.Limbo));
          moveCard(game, b.id, ZONE.SetAside);
        }
      }
      for (const code of codes.slice(n)) {
        if (st.rest === "keep") continue;
        for (const c of allCards(game).filter(
          (x) =>
            x.code === code &&
            isOneOf(x.zone, ZONE.SetAside, ZONE.EncounterDeck, ZONE.SideDeck, ZONE.Limbo),
        ))
          moveCard(game, c.id, st.rest === "remove" ? ZONE.Removed : ZONE.SetAside);
      }
      return;
    }
    case "removeRandom": {
      const pool = (
        st.from === "setAside"
          ? allCards(game)
              .filter((c) => c.zone === ZONE.SetAside)
              .map((c) => c.id)
          : st.from === "encounterDeck"
            ? [...pileOf(s, PILE.EncounterDeck)]
            : [...pileOf(s, st.from as `sideDeck:${string}`)]
      ).filter((id) => !st.filter || matchesFilter(game, cardOf(s, id).code, st.filter));
      shuffle(s, pool);
      for (const id of pool.slice(0, st.n)) moveCard(game, id, ZONE.Removed);
      return;
    }
    case "shuffleSetAside":
      for (const c of allCards(game).filter(
        (x) => x.zone === ZONE.SetAside && matchesFilter(game, x.code, st.filter),
      ))
        moveCard(game, c.id, ZONE.EncounterDeck);
      return;
    case "fromCheckpoint": {
      // what a checkpoint resolution wrote (campaign/campaign.ts recordCheckpoint), rebuilt: locations with their clues
      // and tokens, each investigator's story assets and tokens, the cards beneath the scenario card
      const log = s.campaignLog;
      const list = (k: string) => (Array.isArray(log[k]) ? (log[k] as string[]) : []);
      const num = (k: string) => (typeof log[k] === "number" ? (log[k] as number) : 0);
      const tokensOf = (prefix: string, holder: string) => {
        for (const [k, n] of Object.entries(log))
          if (k.startsWith(prefix) && typeof n === "number")
            addTokens(game, holder, k.slice(prefix.length), n);
      };
      for (const code of list("checkpoint:locations")) {
        const loc = take(code) ?? cardOf(s, createCard(game, code, ZONE.Limbo));
        moveCard(game, loc.id, ZONE.Location);
        reveal(game, loc.id);
        setCounter(game, loc.id, "clues", num(`checkpoint:clues:${code}`));
        tokensOf(`checkpoint:tokens:${code}:`, loc.id);
      }
      for (const i of s.order) {
        for (const code of list(`checkpoint:assets:${i}`)) {
          const a = take(code) ?? cardOf(s, createCard(game, code, ZONE.Limbo));
          moveCard(game, a.id, ZONE.Play);
          setController(game, a.id, i);
        }
        tokensOf(`checkpoint:tokens:${i}:`, i);
      }
      for (const code of list("checkpoint:beneathScenario")) {
        const c = take(code) ?? cardOf(s, createCard(game, code, ZONE.Limbo));
        putBeneath(game, c.id, SCENARIO_CARD);
      }
      return;
    }
    case "putBeneath": {
      const under =
        st.under === "scenario"
          ? SCENARIO_CARD
          : st.under === "act"
            ? s.acts.a
            : st.under === "agenda"
              ? s.agendas.a
              : locByRef(game, st.under)?.id;
      if (!under) return;
      for (const code of st.codes) {
        const c = take(code);
        if (c) putBeneath(game, c.id, under);
      }
      return;
    }
    case "placeDoomOnAgenda":
      if (s.agendas.a) addCounter(game, s.agendas.a, "doom", st.amount);
      return;
    case "addChaosToken":
      s.chaosBag.push(st.token);
      return;
    case "discardRandomFromHands":
      // applied after opening hands are drawn
      discardFromOpeningHands.set(game, st.amount);
      return;
    case "script": {
      const fn = scriptOf(game.db, s.scenarioId)?.fns?.[st.fn];
      if (fn)
        runScript(
          game,
          { t: STEP.Script, code: s.scenarioId, fn: st.fn, ctx: {} },
          { fn, direct: true },
        );
      return;
    }
  }
}

export interface Result {
  state: GameState;
  events: GameEvent[];
  error?: string;
}

export function createGame(db: ContentDb, setup: GameSetup): Result {
  const scen = db.scenarios[setup.scenarioId];
  if (!scen) throw new Error(`unknown scenario ${setup.scenarioId}`);
  const campaign = db.campaigns[setup.campaignId];
  const game: GameContext = { s: emptyState(setup), db, events: [] };
  const s = game.s;
  // investigators & decks
  setup.investigators.forEach((x, player) => {
    const cardId = createCard(game, x.code, ZONE.Investigator, x.code);
    s.order.push(x.code);
    s.world.tables.investigator[x.code] = {
      id: x.code,
      cardId,
      name: db.cards[x.code].name,
      location: null,
      damage: x.physicalTrauma ?? 0,
      horror: x.mentalTrauma ?? 0,
      clues: 0,
      resources: 5,
      actionsLeft: 0,
      restrictedActions: [],
      actionsThisRound: [],
      actionsTaken: 0,
      defeatedHealth: 0,
      status: INV_STATUS.Playing,
      turnDone: false,
      physicalTrauma: 0,
      mentalTrauma: 0,
      player,
    };
    // an investigator's piles exist from the start, so reading one never has to make it
    for (const kind of ["deck", "hand", "discard"] as const) pileRec(game, `${kind}:${x.code}`);
    for (const code of x.deck) {
      const id = createCard(game, code, ZONE.Deck, x.code);
      // a permanent card starts the game in play (Grimoire, Permanent)
      if (db.cards[code].text.startsWith("Permanent.")) moveCard(game, id, ZONE.Play);
    }
    // the cards bonded to a card in the deck wait set aside for their owner, outside the deck
    const hosts = new Set(x.deck);
    for (const c of Object.values(db.cards)) {
      const host = c.keywords.find(
        (k): k is { bonded: string } => typeof k === "object" && "bonded" in k,
      )?.bonded;
      if (host && hosts.has(host))
        for (let k = 0; k < c.quantity; k++) createCard(game, c.code, ZONE.SetAside, x.code);
    }
  });
  // encounter cards, through the campaign's chosen options (a Return-to box's sets in its base campaign)
  const gather = gatherSets(campaign?.options ?? [], setup.options ?? []);
  const sets = gather(scen.encounterSets, true);
  if (scen.randomEncounterSet?.length)
    sets.push(scen.randomEncounterSet[randInt(s, scen.randomEncounterSet.length)]);
  for (const set of sets) {
    for (const code of db.encounterSets[set] ?? []) {
      const d = db.cards[code];
      // a back face is its front's other side, never a card of its own
      if (d.type === "act" || d.type === "agenda" || d.type === "scenario" || d.front) continue;
      for (let k = 0; k < d.quantity; k++)
        createCard(
          game,
          code,
          d.type === "location" && !scen.encounterLocations?.includes(set)
            ? ZONE.SetAside
            : ZONE.EncounterDeck,
        );
    }
  }
  for (const [deck, deckSets] of Object.entries(scen.sideDecks)) {
    const side = pileRec(game, `sideDeck:${deck}`);
    for (const set of gather(deckSets, false))
      for (const code of db.encounterSets[set] ?? []) {
        if (db.cards[code].front) continue;
        for (let k = 0; k < db.cards[code].quantity; k++)
          side.push(createCard(game, code, ZONE.SideDeck));
      }
    shuffle(s, side);
  }
  // the scenario reference card is an instance, so cards can lie beneath it
  if (db.cards[scen.card]) createCard(game, scen.card, ZONE.Scenario, null, SCENARIO_CARD);
  // each act and agenda deck, in order: a version entry is the first whose log condition holds, else one at random;
  // its first card is current. A scenario may have no act deck (Sepulchre of the Sleeper): it ends through its agendas
  for (const kind of ["act", "agenda"] as const) {
    const current = kind === "act" ? s.acts : s.agendas;
    for (const [deck, entries] of Object.entries(
      decksByName(kind === "act" ? scen.acts : scen.agendas),
    )) {
      current[deck] = null;
      for (const e of entries) {
        const code =
          typeof e === "string"
            ? e
            : e.when
              ? (e.oneOf[checkLog(s.campaignLog, e.when, s.order.length) ? 0 : 1] ?? e.oneOf[0])
              : e.oneOf[randInt(s, e.oneOf.length)];
        moveCard(
          game,
          createCard(game, code, ZONE.Limbo),
          kind === "act" ? ZONE.ActDeck : ZONE.AgendaDeck,
          { deck },
        );
      }
      const first = pileOf(s, deckPile(kind, deck))[0];
      if (first) moveCard(game, first, kind === "act" ? ZONE.Act : ZONE.Agenda, { deck });
    }
  }
  s.chaosBag = [...(setup.chaosBag ?? campaign?.chaosBags[setup.difficulty] ?? [])];
  for (const st of scen.setup) applySetupStep(game, st);
  shuffleDeck(game, "encounter");
  // reveal starting locations where investigators are
  for (const i of s.order) if (inv(game, i).location) revealLocation(game, inv(game, i).location!);
  // decks & opening hands
  for (const i of s.order) {
    // the investigator's own setup, before the deck is shuffled (Joe Diamond's hunch deck)
    fireCardHook(game, i, "setup", { you: i, source: inv(game, i).cardId });
    shuffleDeck(game, i);
    drawOpeningCards(game, i, 5);
  }
  const discardN = discardFromOpeningHands.get(game) ?? 0;
  for (const i of s.order) {
    const me = inv(game, i);
    for (let k = 0; k < discardN && me.hand.length; k++)
      moveCard(game, me.hand[randInt(s, me.hand.length)], ZONE.Discard);
  }
  emit(game, EVENT.Setup, `${scen.name} begins`, { data: { scenario: scen.id } });
  push(
    game,
    ...s.order.map((i): Step => ({ t: STEP.Mulligan, inv: i })),
    { t: STEP.RoundCleanup },
    { t: STEP.StartRound },
  );
  // setup spawns pushed earlier resolve first
  s.queue = [...s.queue.filter((x) => x.t !== "Spawn"), ...s.queue.filter((x) => x.t === "Spawn")];
  run(game);
  return { state: s, events: game.events };
}

// ---------- dispatch ----------
export function dispatch(db: ContentDb, state: GameState, action: Action): Result {
  const p = state.pending;
  if (!p) return { state, events: [], error: "no pending choice" };
  if (p.inv !== action.inv)
    return { state, events: [], error: `waiting for ${p.inv}, not ${action.inv}` };
  const opt = p.options.find((o) => o.id === action.option);
  if (!opt) return { state, events: [], error: `illegal option ${action.option}` };
  const events: GameEvent[] = [];
  // the state is small (a few hundred cards): a plain deep copy is cheaper than proxy-based drafts
  const game: GameContext = { s: structuredClone(state), db, events };
  game.s.pending = null;
  game.s.queue.push({ ...p.step, choice: opt.value } as Step);
  run(game);
  if (revealed(state, game.s, events)) game.s.counters.reveal = (state.counters.reveal ?? 0) + 1;
  return { state: game.s, events };
}

/** did this choice bring hidden information into play: the RNG used, a card left a deck, or deck cards were shown? */
export function revealed(prev: GameState, next: GameState, events: GameEvent[]): boolean {
  if (next.rng !== prev.rng) return true;
  const left = (a: readonly InstId[], b: readonly InstId[]) => a.some((id) => !b.includes(id));
  if (left(pileOf(prev, PILE.EncounterDeck), pileOf(next, PILE.EncounterDeck))) return true;
  for (const i of prev.order)
    if (left(pileOf(prev, `deck:${i}`), pileOf(next, `deck:${i}`))) return true;
  if (events.some((e) => e.type === "look")) return true;
  const shown = (s: GameState) =>
    (s.pending?.options ?? []).some(
      (o) => o.card && ["deck", "encounterDeck"].includes(cardOfIf(s, o.card)?.zone as string),
    );
  return shown(next) && !shown(prev);
}

export const getPending = (s: GameState) => s.pending;

/** options of the active turn choice (empty when another kind of choice is pending) */
export function getLegalActions(db: ContentDb, s: GameState): ChoiceOption[] {
  if (s.pending?.kind === "turn") return s.pending.options;
  if (!s.active) return [];
  return legalTurnActions({ s, db, events: [] }, s.active);
}

export function replay(db: ContentDb, setup: GameSetup, actions: Action[]): Result {
  let r = createGame(db, setup);
  const events = [...r.events];
  for (const a of actions) {
    r = dispatch(db, r.state, a);
    if (r.error) throw new Error(`replay failed at ${JSON.stringify(a)}: ${r.error}`);
    events.push(...r.events);
  }
  return { state: r.state, events };
}

export const serialize = (s: GameState) => JSON.stringify(s);
export const deserialize = (json: string): GameState => JSON.parse(json);

export type { Action, ContentDb, GameSetup, GameState };
