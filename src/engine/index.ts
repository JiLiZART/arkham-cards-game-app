import type { LogCondition, SetupStep } from "../content/schema";
import {
  addCounter,
  allCards,
  cardOfIf,
  emit,
  type GameContext,
  inv,
  pileOf,
  placeInvestigator,
  push,
  shuffleDeck,
} from "./context";
import { createCard, moveCard } from "./movement";
import { findByCode, locationByName } from "./queries";
import { legalTurnActions } from "./rules/round";
import { drawOpeningCards, revealLocation } from "./rules/investigators";
import { run } from "./steps/dispatch";
import { fireCardHook, runScript } from "./rules/scripts";
import { discardFromOpeningHands } from "./world/flags";
import { randInt, shuffle } from "./world/rng";
import { newWorld, pileRec } from "./world/store";
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
import { ZONE, PHASE, INV_STATUS, PILE, isOneOf } from "./world/constants";
import { STEP } from "./steps/step";
import { scriptOf } from "./world/scripts";

export const ENGINE_VERSION = 7;

/**
 * Whether a save written by this engine version replays to the same game on this one. Versions 6 and 7 changed only how
 * the state is stored (ADR-0023, ADR-0024), which the replay oracle proves: their choices replay as before. Any older
 * version had different rules, so its scenario restarts.
 */
export const replaysSave = (version: number) =>
  version === ENGINE_VERSION || version === 6 || version === 5;

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
    act: null,
    agenda: null,
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

function applySetupStep(game: GameContext, st: SetupStep) {
  const s = game.s;
  if (!checkLog(s.campaignLog, st.when, s.order.length)) return;
  const take = (code: string) =>
    allCards(game).find(
      (c) =>
        c.code === code &&
        isOneOf(c.zone, ZONE.SetAside, ZONE.EncounterDeck, ZONE.SideDeck, ZONE.Limbo),
    );
  switch (st.do) {
    case "putIntoPlay":
      for (const code of st.codes) {
        const c = take(code);
        if (c) moveCard(game, c.id, ZONE.Location);
      }
      return;
    case "putRandomIntoPlay": {
      const pool = st.from
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
      // a code listed n times sets n copies aside: a copy already set aside is not taken again
      for (const code of st.codes) {
        const c = allCards(game).find(
          (x) => x.code === code && isOneOf(x.zone, ZONE.EncounterDeck, ZONE.SideDeck, ZONE.Limbo),
        );
        if (c) moveCard(game, c.id, ZONE.SetAside);
      }
      return;
    case "remove":
      for (const code of st.codes) {
        const c = allCards(game).find((x) => x.code === code && x.zone !== "removed");
        if (c) moveCard(game, c.id, ZONE.Removed);
      }
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
    case "placeDoomOnAgenda":
      if (s.agenda) addCounter(game, s.agenda, "doom", st.amount);
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
  });
  // encounter cards
  const sets = [...scen.encounterSets];
  if (scen.randomEncounterSet?.length)
    sets.push(scen.randomEncounterSet[randInt(s, scen.randomEncounterSet.length)]);
  for (const set of sets) {
    for (const code of db.encounterSets[set] ?? []) {
      const d = db.cards[code];
      if (d.type === "act" || d.type === "agenda" || d.type === "scenario") continue;
      for (let k = 0; k < d.quantity; k++)
        createCard(game, code, d.type === "location" ? ZONE.SetAside : ZONE.EncounterDeck);
    }
  }
  for (const [deck, deckSets] of Object.entries(scen.sideDecks)) {
    const side = pileRec(game, `sideDeck:${deck}`);
    for (const set of deckSets)
      for (const code of db.encounterSets[set] ?? []) {
        for (let k = 0; k < db.cards[code].quantity; k++)
          side.push(createCard(game, code, ZONE.SideDeck));
      }
    shuffle(s, side);
  }
  // a card created in an act or agenda deck is put in that pile
  for (const code of scen.acts) createCard(game, code, ZONE.ActDeck);
  for (const code of scen.agendas) createCard(game, code, ZONE.AgendaDeck);
  moveCard(game, pileOf(s, PILE.ActDeck)[0], ZONE.Act);
  moveCard(game, pileOf(s, PILE.AgendaDeck)[0], ZONE.Agenda);
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
    { t: STEP.Script, code: "__engine", fn: "roundCleanup", ctx: {} },
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
