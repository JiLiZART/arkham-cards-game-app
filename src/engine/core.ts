import { attacked, connections as connectionsAdded, named } from "./flags";
import { randInt, shuffle } from "./rng";
import type {
  Ability,
  CardDef,
  ChaosToken,
  CardFilter,
  Condition,
  Cost,
  Modifier,
  ModStat,
  Skill,
} from "../content/schema";
import {
  allCardRecs,
  allCardRecsIn,
  allInvRecs,
  cardDataIn,
  cardRec,
  cardRecIf,
  cardRecIfIn,
  invRec,
  invRecIf,
  invViewIn,
  patchedCardsIn,
  pileKey,
  pileRead,
  pileRec,
  pilesNamed,
  putCardIn,
} from "./records";
import type {
  CardInst,
  CardView,
  InvView,
  ChoiceOption,
  ContentDb,
  EffCtx,
  GameEvent,
  GameState,
  InstId,
  InvId,
  InvState,
  PendingChoice,
  Step,
  PileName,
  Zone,
} from "./types";

/** engine context passed to every rule: the state (mutated in place, one deep copy per choice) + static content */
export interface G {
  s: GameState;
  db: ContentDb;
  events: GameEvent[];
}

export const LOG_LIMIT = 300;

// ---------- basic accessors ----------
/** a card instance, read-only (ADR-0022): change it through the setters below */
export const card = (g: G, id: InstId): CardView => cardRec(g, id);
export const def = (g: G, id: InstId): CardDef => defOf(g, card(g, id).code);
export const defOf = (g: G, code: string): CardDef => {
  const d = g.db.cards[code];
  if (!d) throw new Error(`no card def ${code}`);
  return d;
};
/** an investigator, read-only (ADR-0022): change them through the setters below */
export const inv = (g: G, id: InvId): InvView => {
  const v = invViewIn(g.s, id);
  if (!v) throw new Error(`no investigator ${id}`);
  return v;
};
export const name = (g: G, id: InstId) => def(g, id).name;

// ---------- lookups over a state (for code that holds a state, not the engine context) ----------
/** a card in a game state (or anything holding its `world`), read-only: throws for an id the game doesn't have */
export const cardOf = (s: Pick<GameState, "world">, id: InstId): CardView => {
  const c = cardRecIfIn(s, id);
  if (!c) throw new Error(`no card instance ${id}`);
  return c;
};
/** a card in a game state, or undefined when the id is absent or names no card */
export const cardOfIf = (
  s: Pick<GameState, "world"> | null | undefined,
  id: InstId | null | undefined,
): CardView | undefined => (s ? cardRecIfIn(s, id) : undefined);
/** an investigator in a game state, read-only and always current: throws for one the game doesn't have */
export const invOf = (s: Pick<GameState, "world">, id: InvId): InvView => {
  const v = invViewIn(s, id);
  if (!v) throw new Error(`no investigator ${id}`);
  return v;
};
export const invOfIf = (
  s: Pick<GameState, "world"> | null | undefined,
  id: InvId | null | undefined,
): InvView | undefined => (s && id ? invViewIn(s, id) : undefined);
/** every card of a state, in creation order */
export const cardsOf = (s: Pick<GameState, "world">): readonly CardView[] => allCardRecsIn(s);
/** a card's fields as a plain object, a copy (a view spreads to its id alone): for a recording, or a copy to edit */
export const cardCopyOf = (s: Pick<GameState, "world">, id: InstId): CardInst => cardDataIn(s, id);
/** every investigator of a state, in turn order */
export const invsOf = (s: Pick<GameState, "world" | "order">): readonly InvView[] =>
  s.order.map((i) => invViewIn(s, i)!);

export type { PileName } from "./types";
/** every pile of a state by name, read-only, in order (the top of a deck first); only the piles the game has made */
export const pileMap = (
  s: Pick<GameState, "world">,
): Readonly<Partial<Record<PileName, readonly InstId[]>>> => s.world.piles;
/** one pile of a state by name; empty when the game has no such pile */
export const pileOf = (s: Pick<GameState, "world">, name: PileName): readonly InstId[] =>
  pileRead(s, name);

/**
 * A copy of a state with some cards' fields overridden, for a view of the game that differs from the game (the table
 * while events wait to play). The state given is not changed; cards not patched are shared with it.
 */
export const patchedState = (s: GameState, patches: Record<InstId, Partial<CardInst>>): GameState =>
  patchedCardsIn(s, patches);

// ---------- what scripts read about the scenario ----------
/** a card instance, or undefined when the id is absent or names no card */
export const cardIf = (g: G, id: InstId | null | undefined): CardView | undefined =>
  cardRecIf(g, id);
/** every card instance, in creation order */
export const allCards = (g: G): readonly CardView[] => allCardRecs(g);
/** an investigator, or undefined when the id is absent or names none */
export const invIf = (g: G, id: InvId | null | undefined): InvView | undefined => invOfIf(g.s, id);
export const currentAct = (g: G) => g.s.act;
export const currentAgenda = (g: G) => g.s.agenda;
export const leadInvestigator = (g: G) => g.s.lead;
/** every investigator in turn order, eliminated ones included */
export const turnOrder = (g: G): readonly InvId[] => g.s.order;
export const currentPhase = (g: G) => g.s.phase;
export const currentRound = (g: G) => g.s.round;
export const difficultyOf = (g: G) => g.s.difficulty;
/** the campaign log as the scenario began (read-only for scripts) */
export const campaignLogOf = (g: G): Readonly<Record<string, unknown>> => g.s.campaignLog;
/** the skill test under way, or null */
export const currentTest = (g: G) => g.s.skillTest;
export const activeInvestigator = (g: G) => g.s.active;
export const scenarioIdOf = (g: G) => g.s.scenarioId;
export const logLength = (g: G) => g.s.log.length;
/** the game waits for the lead investigator before each phase (the UI's games) */
export const pacesPhases = (g: G) => !!g.s.pacePhases;
/** the event under this key was cancelled (an attack, a movement, a clue discovery) */
export const isCancelled = (g: G, key: string) => g.s.cancelled.includes(key);

/** a key no other event has: `prefix` and the next number of the scenario's one counter */
export const nextKey = (g: G, prefix: string) => `${prefix}${g.s.seq++}`;

/** how often a limited ability has been used in a period (the key names the card, the ability and the period) */
export const limitUses = (g: G, key: string) => g.s.usage[key] ?? 0;
export const recordLimitUse = (g: G, key: string) => void (g.s.usage[key] = limitUses(g, key) + 1);
/** the number of the current turn, phase, round or test, for a limit's period */
export const periodCounter = (g: G, per: "turn" | "phase" | "round" | "test") => g.s.counters[per];
export const bumpCounter = (g: G, per: "turn" | "phase" | "round" | "test") =>
  void g.s.counters[per]++;

/** a new phase begins */
export function setPhase(g: G, phase: GameState["phase"]) {
  g.s.phase = phase;
  bumpCounter(g, "phase");
}
/** a new round begins */
export function startRound(g: G) {
  g.s.round++;
  bumpCounter(g, "round");
}
/** whose turn it is (null: no one's) */
export const setActive = (g: G, who: InvId | null) => void (g.s.active = who);
export const setLead = (g: G, who: InvId) => void (g.s.lead = who);
/** the scenario ends with this resolution: nothing more resolves and no choice is pending */
export function endScenario(g: G, resolution: string) {
  g.s.phase = "ended";
  g.s.resolution = resolution;
  g.s.queue = [];
  g.s.pending = null;
}
/** a scenario pile, top first for the decks (read-only: move cards with moveCard) */
export const pile = (
  g: G,
  name: "encounterDeck" | "encounterDiscard" | "actDeck" | "agendaDeck",
): readonly InstId[] => pileRead(g.s, name);
export const sideDeck = (g: G, name: string): readonly InstId[] =>
  pileRead(g.s, `sideDeck:${name}`);

// ---------- what scripts change besides cards, counters and flags ----------
/** the event under this key doesn't happen (an attack, a token's effect) */
export function cancelEvent(g: G, key: string) {
  g.s.cancelled.push(key);
}
export function addChaosTokens(g: G, tokens: ChaosToken[]) {
  g.s.chaosBag.push(...tokens);
}
/** put an investigator at a location without moving (no move triggers) */
export function placeInvestigator(g: G, i: InvId, loc: InstId | null) {
  invRec(g, i).location = loc;
}
/** the enemy is engaged with the investigator (null: no one), with no engage triggers */
export function setEngaged(g: G, enemy: InstId, i: InvId | null) {
  cardRec(g, enemy).engagedWith = i;
}

// ---------- chance, from the scenario's seeded generator ----------
/** a random whole number from 0 to n - 1 */
export const randomInt = (g: G, n: number) => randInt(g.s, n);
/** shuffle a script's own list in place */
export function shuffleList<T>(g: G, list: T[]) {
  shuffle(g.s, list);
}
/** shuffle an investigator's deck or the encounter deck */
export function shuffleDeck(g: G, owner: InvId | "encounter") {
  shuffle(g.s, pileRec(g, owner === "encounter" ? "encounterDeck" : `deck:${owner}`));
}

// ---------- counters ----------
/** the tokens a card holds, and the ones an investigator holds; doom and uses are a card's only, the rest an investigator's only */
export type Counter =
  | "damage"
  | "horror"
  | "clues"
  | "doom"
  | "uses"
  | "resources"
  | "actionsLeft"
  | "actionsTaken"
  | "defeatedHealth"
  | "physicalTrauma"
  | "mentalTrauma";
const CARD_ONLY: Counter[] = ["doom", "uses"];
const INV_ONLY: Counter[] = [
  "actionsLeft",
  "actionsTaken",
  "defeatedHealth",
  "physicalTrauma",
  "mentalTrauma",
];

/** the record a counter lives on: an investigator (by code) or a card instance */
function holder(g: G, id: InvId | InstId, k: Counter): Record<Counter, number> {
  const i = invRecIf(g, id);
  if (i) {
    if (CARD_ONLY.includes(k)) throw new Error(`investigator ${id} holds no ${k}`);
    return i as unknown as Record<Counter, number>;
  }
  const c = cardRecIf(g, id);
  if (!c) throw new Error(`no card or investigator ${id}`);
  if (INV_ONLY.includes(k)) throw new Error(`card ${id} holds no ${k}`);
  return c as unknown as Record<Counter, number>;
}

export const counter = (g: G, id: InvId | InstId, k: Counter): number => holder(g, id, k)[k];

/** set a counter as given (no clamping: a rule clamps where it must) */
export function setCounter(g: G, id: InvId | InstId, k: Counter, v: number) {
  holder(g, id, k)[k] = v;
}

/** add to a counter (negative to remove) and return the new value */
export function addCounter(g: G, id: InvId | InstId, k: Counter, n: number): number {
  const h = holder(g, id, k);
  h[k] += n;
  return h[k];
}

// ---------- card fields ----------
export const exhaust = (g: G, id: InstId) => void (cardRec(g, id).exhausted = true);
export const ready = (g: G, id: InstId) => void (cardRec(g, id).exhausted = false);
/** turn a location (or anything revealed) face up */
export const reveal = (g: G, id: InstId) => void (cardRec(g, id).revealed = true);
/** where an enemy or an attachment is (the card of a location), without moving it through zones */
export const setCardLocation = (g: G, id: InstId, loc: InstId | null) =>
  void (cardRec(g, id).location = loc);
/** the investigator who controls the card (null: no one) */
export const setController = (g: G, id: InstId, who: InvId | null) =>
  void (cardRec(g, id).controller = who);
export const setOwner = (g: G, id: InstId, who: InvId | null) => void (cardRec(g, id).owner = who);
/** the card is another card now (a story asset that transforms: Elokoss's two sides) */
export const setCode = (g: G, id: InstId, code: string) => void (cardRec(g, id).code = code);
/** the card is attached to another (null: to none) */
export const attachTo = (g: G, id: InstId, to: InstId | null) =>
  void (cardRec(g, id).attachedTo = to);

// ---------- investigator fields ----------
/** a new turn's actions: how many, and the restricted ones the investigator's cards grant */
export function beginActions(
  g: G,
  i: InvId,
  left: number,
  restricted: InvState["restrictedActions"],
) {
  const me = invRec(g, i);
  me.actionsTaken = 0;
  me.actionsLeft = left;
  me.restrictedActions = restricted.map((r) => ({ ...r }));
}
/** a restricted action only some cards can use (Daisy's Tome action) */
export function grantRestricted(g: G, i: InvId, r: InvState["restrictedActions"][number]) {
  invRec(g, i).restrictedActions.push({ ...r });
}
/** use up `n` of the investigator's restricted action at `index` */
export function spendRestricted(g: G, i: InvId, index: number, n: number) {
  invRec(g, i).restrictedActions[index].left -= n;
}
/** an action of this designator was taken: it counts for "first time each round" and "first action" */
export function noteAction(g: G, i: InvId, designator: string) {
  const me = invRec(g, i);
  me.actionsThisRound.push(designator);
  me.actionsTaken++;
}
export function clearRoundActions(g: G) {
  for (const i of allInvRecs(g)) i.actionsThisRound = [];
}
export function clearTurnDone(g: G) {
  for (const i of allInvRecs(g)) i.turnDone = false;
}
export function clearDefeatedHealth(g: G) {
  for (const i of allInvRecs(g)) i.defeatedHealth = 0;
}
export const setTurnDone = (g: G, i: InvId, done: boolean) => void (invRec(g, i).turnDone = done);
/** an investigator resigns or is defeated (by damage or horror) */
export function setStatus(g: G, i: InvId, status: InvState["status"], by?: "damage" | "horror") {
  const me = invRec(g, i);
  me.status = status;
  if (by) me.defeatedBy = by;
}

// ---------- deck order ----------
/** put cards on top of a deck in the order given (`ids[0]` on top), the rest of the deck below them in its order */
export function arrangeOnTop(g: G, owner: InvId | "encounter", ids: readonly InstId[]) {
  const deck = pileRec(g, owner === "encounter" ? "encounterDeck" : `deck:${owner}`);
  deck.splice(0, deck.length, ...ids, ...deck.filter((id) => !ids.includes(id)));
}

export const invName = (g: G, id: InvId) => invRecIf(g, id)?.name ?? id;

export const activeInvs = (g: G): InvId[] =>
  g.s.order.filter((i) => invRec(g, i).status === "playing");
export const playerCount = (g: G) => g.s.order.length; // per-investigator values use starting count

// ---------- events ----------
export function emit(g: G, type: string, text: string, extra: Partial<GameEvent> = {}) {
  const e: GameEvent = { type, text, ...extra };
  g.events.push(e);
  g.s.log.push(e);
  if (g.s.log.length > LOG_LIMIT) g.s.log.splice(0, g.s.log.length - LOG_LIMIT);
}

/** marks the start of an automated step of a phase in the log (the UI's captions); never a choice */
export function logStep(g: G, step: string, who?: string) {
  emit(g, "step", who ? `${invName(g, who)}: ${step}` : step, {
    ...(who ? { inv: who } : {}),
    data: { step, phase: g.s.phase },
  });
}

// ---------- queue ----------
/** push steps so that steps[0] resolves first */
export function push(g: G, ...steps: Step[]) {
  for (let i = steps.length - 1; i >= 0; i--) g.s.queue.push(steps[i]);
}

/**
 * Ask a player. Returns the chosen value when the step is re-run with an answer,
 * otherwise records a pending choice and returns undefined (handler must return).
 * With `auto`, a single option is chosen without asking.
 */
export function ask<T = unknown>(
  g: G,
  step: Step,
  invId: InvId,
  kind: PendingChoice["kind"],
  prompt: string,
  options: ChoiceOption[],
  opts: {
    auto?: boolean;
    key?: string;
    vars?: Record<string, string | number | null>;
    shown?: InstId[];
  } = {},
): T | undefined {
  if (step.choice !== undefined) return step.choice as T;
  if (options.length === 0) throw new Error(`no options for choice: ${prompt}`);
  if (opts.auto && options.length === 1) return options[0].value as T;
  g.s.pending = {
    seq: ++g.s.seq,
    inv: invId,
    kind,
    prompt,
    ...(opts.key ? { promptKey: opts.key, promptVars: opts.vars ?? {} } : {}),
    options,
    ...(opts.shown?.length ? { shown: opts.shown } : {}),
    step: { ...step },
  };
  return undefined;
}

/**
 * A tapped-decks game waits, before a draw from a deck during play, for the drawing investigator to tap it: a pending
 * `draw` choice with the one option "draw" (a recorded choice, so replays stay exact). True when the draw may go ahead:
 * the game doesn't ask for taps, it is setup (the opening hands) or the scenario has ended, or the tap has come.
 */
export function tapToDraw(
  g: G,
  step: Step,
  invId: InvId,
  deck: "player" | "encounter",
  n: number,
): boolean {
  if (!g.s.tapDecks || g.s.phase === "setup" || g.s.phase === "ended") return true;
  const label = deck === "player" ? "Tap your deck to draw" : "Tap the encounter deck to draw";
  return (
    ask(g, step, invId, "draw", label, [{ id: "draw", label: "Draw", value: `draw:${deck}` }], {
      key: `tapDeck.${deck}${n > 1 ? ".many" : ""}`,
      vars: { deck, n },
    }) !== undefined
  );
}

export function nextId(g: G) {
  return `c${g.s.nextId++}`;
}

/** create a new card instance (setup, or cards entering the game mid-scenario) */
export function createCard(g: G, code: string, zone: Zone, owner: InvId | null = null): InstId {
  if (!g.db.cards[code]) throw new Error(`unknown card ${code}`);
  const id = nextId(g);
  putCardIn(g.s, {
    id,
    code,
    owner,
    controller: owner,
    zone,
    exhausted: false,
    revealed: false,
    damage: 0,
    horror: 0,
    clues: 0,
    doom: 0,
    uses: 0,
    resources: 0,
    location: null,
    engagedWith: null,
    attachedTo: null,
  });
  const key = pileKey(zone, owner);
  if (key) pileRec(g, key).push(id);
  return id;
}

// ---------- card movement ----------
/** take a card out of the pile its zone says it sits in */
function removeFromPile(g: G, id: InstId) {
  const c = cardRec(g, id);
  const piles = g.s.world.piles;
  const take = (name: PileName | null) => {
    const pile = name ? piles[name] : undefined;
    const at = pile ? pile.indexOf(id) : -1;
    if (at >= 0) pile!.splice(at, 1);
    return at >= 0;
  };
  // the pile the zone and owner name; a card put in another investigator's pile (or a side deck, whose name isn't in
  // the zone) is found by its kind
  const named = pileKey(c.zone, c.owner);
  if (!take(named)) {
    const kind =
      c.zone === "deck" || c.zone === "hand" || c.zone === "discard"
        ? `${c.zone}:`
        : c.zone === "sideDeck"
          ? "sideDeck:"
          : null;
    if (kind) for (const name of pilesNamed(g.s, kind)) if (take(name)) break;
  }
  if (g.s.act === id) g.s.act = null;
  if (g.s.agenda === id) g.s.agenda = null;
}

const IN_PLAY: Zone[] = [
  "play",
  "threat",
  "location",
  "enemy",
  "attached",
  "act",
  "agenda",
  "investigator",
];
export const isInPlay = (c: CardInst) => IN_PLAY.includes(c.zone);

/** move a card instance to a zone; resets tokens when leaving play */
export function moveCard(
  g: G,
  id: InstId,
  zone: Zone,
  opts: { inv?: InvId | null; top?: boolean; location?: InstId | null } = {},
) {
  const c = cardRec(g, id);
  const leavingPlay = isInPlay(c) && !IN_PLAY.includes(zone);
  removeFromPile(g, id);
  if (leavingPlay) {
    // discard attachments
    for (const other of allCardRecs(g)) {
      if (
        other.attachedTo === id ||
        (other.zone === "attached" && other.location === id && c.zone === "location")
      ) {
        moveCard(g, other.id, other.owner ? "discard" : "encounterDiscard", { inv: other.owner });
      }
    }
    // a card that re-enters play is a new copy: its "limit per period" starts unused (Grimoire, Limits and Maximums)
    for (const k of Object.keys(g.s.usage)) if (k.startsWith(`${id}:`)) delete g.s.usage[k];
    Object.assign(c, {
      exhausted: false,
      damage: 0,
      horror: 0,
      clues: 0,
      doom: 0,
      uses: 0,
      resources: 0,
      engagedWith: null,
      attachedTo: null,
    });
    if (c.owner) c.controller = c.owner;
  }
  c.zone = zone;
  if (zone !== "enemy" && zone !== "attached") c.location = opts.location ?? null;
  else if (opts.location !== undefined) c.location = opts.location;
  if (zone !== "enemy") c.engagedWith = null;
  const owner = opts.inv ?? c.owner;
  const at = (arr: InstId[]) => (opts.top ? arr.unshift(id) : arr.push(id));
  switch (zone) {
    case "deck":
    case "hand":
    case "discard":
      if (!owner) throw new Error(`card ${id} has no owner for ${zone}`);
      // discard pile: last = top; deck: index 0 = top
      if (zone === "deck") at(pileRec(g, `deck:${owner}`));
      else if (zone === "discard") pileRec(g, `discard:${owner}`).push(id);
      else pileRec(g, `hand:${owner}`).push(id);
      break;
    case "encounterDeck":
      at(pileRec(g, "encounterDeck"));
      break;
    case "encounterDiscard":
      pileRec(g, "encounterDiscard").push(id);
      break;
    case "act":
      g.s.act = id;
      break;
    case "agenda":
      g.s.agenda = id;
      break;
  }
}

/** shuffle a card into its owner's deck */
export function shuffleIntoDeck(g: G, id: InstId, owner: InvId) {
  moveCard(g, id, "deck", { inv: owner });
  shuffleDeck(g, owner);
  emit(g, "shuffle", `${def(g, id).name} is shuffled into ${invName(g, owner)}'s deck`, {
    inv: owner,
    card: id,
  });
}

/** an investigator's deck and discard pile, or the encounter deck and discard */
const pilesOf = (g: G, owner: InvId | "encounter") =>
  owner === "encounter"
    ? {
        deck: pileRec(g, "encounterDeck"),
        discard: pileRec(g, "encounterDiscard"),
        zone: "encounterDeck" as const,
      }
    : {
        deck: pileRec(g, `deck:${owner}`),
        discard: pileRec(g, `discard:${owner}`),
        zone: "deck" as const,
      };

/** the discard pile goes back into its deck, in its order, and the deck is shuffled */
export function reshuffleDiscard(g: G, owner: InvId | "encounter") {
  const p = pilesOf(g, owner);
  for (const id of p.discard.slice())
    moveCard(g, id, p.zone, owner === "encounter" ? {} : { inv: owner });
  shuffleDeck(g, owner);
}

/** put cards on top of an investigator's deck from wherever they are, `ids[0]` ending on top */
export function putOnTop(g: G, owner: InvId, ids: InstId[]) {
  for (const id of ids.slice().reverse()) moveCard(g, id, "deck", { inv: owner, top: true });
}

/** take cards out of an investigator's deck, shuffle the rest, and put them back on top, `ids[0]` on top */
export function shuffleThenTop(g: G, owner: InvId, ids: InstId[]) {
  for (const id of ids) moveCard(g, id, "limbo");
  shuffleDeck(g, owner);
  putOnTop(g, owner, ids);
}

/** discard a card to its owner's discard pile or the encounter discard */
export function discard(g: G, id: InstId) {
  const c = card(g, id);
  const d = def(g, id);
  if (c.owner) moveCard(g, id, "discard", { inv: c.owner });
  else moveCard(g, id, "encounterDiscard");
  emit(g, "discard", `${d.name} is discarded`, { card: id });
}

// ---------- queries ----------
/** the cards in a zone, in creation order: read off the zone table, so a view is made only for the cards that match */
export function cardsIn(g: G, zone: Zone): CardView[] {
  const zones = g.s.world.tables.zone;
  const out: CardView[] = [];
  for (const id in zones) if (zones[id] === zone) out.push(cardRec(g, id));
  return out;
}
/** the cards in any of the zones, in creation order (as `cardsIn`, for several zones) */
function cardsInAny(g: G, zones: ReadonlySet<Zone>): CardInst[] {
  const table = g.s.world.tables.zone;
  const out: CardInst[] = [];
  for (const id in table) if (zones.has(table[id])) out.push(cardRec(g, id));
  return out;
}
export const locations = (g: G) => cardsIn(g, "location");
export const enemies = (g: G) => cardsIn(g, "enemy");
export const enemiesAt = (g: G, loc: InstId | null) => enemies(g).filter((e) => e.location === loc);
export const engagedWith = (g: G, i: InvId) =>
  enemies(g).filter(
    (e) =>
      e.engagedWith === i ||
      (isMassive(g, e.id) && e.location === invRecIf(g, i)?.location && !e.exhausted),
  );
export const invsAt = (g: G, loc: InstId | null) =>
  activeInvs(g).filter((i) => invRec(g, i).location === loc);
export const findByCode = (g: G, code: string, zones?: Zone[]): CardView | undefined =>
  allCardRecs(g).find((c) => c.code === code && (!zones || zones.includes(c.zone)));
export const locationByCode = (g: G, code: string) => findByCode(g, code, ["location"]);
export const locationByName = (g: G, nm: string) =>
  locations(g).find((l) => def(g, l.id).name === nm);
export const hasTrait = (g: G, id: InstId, trait: string) => def(g, id).traits.includes(trait);
export const isElite = (g: G, id: InstId) => hasTrait(g, id, "Elite");
export const hasKeyword = (g: G, id: InstId, kw: CardDef["keywords"][number]) =>
  def(g, id).keywords.includes(kw);
/** an aloof enemy can only be attacked while it is engaged with an investigator */
export const attackable = (g: G, id: InstId) =>
  !hasKeyword(g, id, "aloof") || !!cardRecIf(g, id)?.engagedWith;
/** a unique card cannot be played or put into play while a card with its title is in play (Grimoire, Unique) */
export function uniqueInPlay(g: G, id: InstId): boolean {
  const d = def(g, id);
  return (
    !!d.unique &&
    allCardRecs(g).some(
      (c) =>
        c.id !== id &&
        ["play", "threat", "enemy", "attached"].includes(c.zone) &&
        g.db.cards[c.code].name === d.name,
    )
  );
}
/** clues the act asks for, as a group (Infinity when it has none to spend) */
export function actClueCost(g: G): number {
  if (!g.s.act) return Infinity;
  const d = def(g, g.s.act);
  if (!d.actClues) return Infinity;
  return d.actClues * (d.actCluesPerInvestigator ? g.s.order.length : 1);
}
/** clues the group may spend (Masked Hunter blocks engaged investigators) */
export function spendableGroupClues(g: G) {
  return activeInvs(g)
    .filter((x) => !hasFlag(g, x, "cannotSpendClues"))
    .reduce((n, x) => n + inv(g, x).clues, 0);
}
/** the group can advance the act by spending clues, in any player window (Grimoire, Act Deck and Agenda Deck) */
export const canAdvanceAct = (g: G) =>
  !!g.s.act &&
  (def(g, g.s.act).actAdvance ?? "turn") === "turn" &&
  spendableGroupClues(g) >= actClueCost(g);
export const isMassive = (g: G, id: InstId) => hasKeyword(g, id, "massive");
export const controlled = (g: G, i: InvId) => cardsIn(g, "play").filter((c) => c.controller === i);
export const threatArea = (g: G, i: InvId) =>
  cardsIn(g, "threat").filter((c) => c.controller === i);

export function matchesFilter(g: G, code: string, f: CardFilter): boolean {
  const d = defOf(g, code);
  const arr = <T>(v: T | T[] | undefined) =>
    v === undefined ? undefined : Array.isArray(v) ? v : [v];
  if (f.type && !arr(f.type)!.includes(d.type)) return false;
  if (f.trait && !arr(f.trait)!.some((t) => d.traits.includes(t))) return false;
  if (f.code && !arr(f.code)!.includes(code)) return false;
  if (f.unique !== undefined && d.unique !== f.unique) return false;
  if (f.weakness !== undefined && !!d.subtype !== f.weakness) return false;
  if (f.elite !== undefined && d.traits.includes("Elite") !== f.elite) return false;
  if (f.faction && !arr(f.faction)!.includes(d.faction)) return false;
  if (f.maxXp !== undefined && (d.xp ?? 0) > f.maxXp) return false;
  return true;
}

// ---------- map ----------
export function connections(g: G, loc: InstId): InstId[] {
  const scen = g.db.scenarios[g.s.scenarioId];
  const code = card(g, loc).code;
  const extra = connectionsAdded.get(g) ?? [];
  const codes = new Set<string>();
  for (const [a, b] of [...scen.connections, ...extra]) {
    if (a === code) codes.add(b);
    if (b === code) codes.add(a);
  }
  for (const [a, b] of scen.oneWay ?? []) if (a === code) codes.add(b);
  return locations(g)
    .filter((l) => codes.has(l.code) && l.id !== loc)
    .map((l) => l.id);
}

/** connections() for read-only callers (the UI) that hold a state rather than an engine context */
export const connectionsOf = (db: ContentDb, s: GameState, loc: InstId): InstId[] =>
  connections({ s, db, events: [] }, loc);

/** BFS distances from a location */
export function distances(g: G, from: InstId): Map<InstId, number> {
  const dist = new Map<InstId, number>([[from, 0]]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of connections(g, cur)) {
      if (!dist.has(n)) {
        dist.set(n, dist.get(cur)! + 1);
        q.push(n);
      }
    }
  }
  return dist;
}

/** next location on a shortest path from `from` toward any of `targets` (all ties) */
export function stepsToward(g: G, from: InstId, targets: InstId[]): InstId[] {
  if (targets.includes(from)) return [];
  let best = Infinity;
  const options: InstId[] = [];
  for (const n of connections(g, from)) {
    const d = distances(g, n);
    const min = Math.min(...targets.map((t) => d.get(t) ?? Infinity));
    if (min < best) {
      best = min;
      options.length = 0;
    }
    if (min === best && min !== Infinity) options.push(n);
  }
  return options;
}

// ---------- modifiers ----------
export interface AppliedMod {
  target: string;
  mod: Modifier;
  source: InstId | null;
}

const MOD_ZONES: ReadonlySet<Zone> = new Set<Zone>([
  "play",
  "threat",
  "attached",
  "location",
  "enemy",
  "act",
  "agenda",
  "investigator",
]);

/** a card the investigator can't play or commit now (Languor) */
export function cardBlocked(g: G, i: InvId, cardId: InstId): boolean {
  return allMods(g).some(
    (m) =>
      m.target === i &&
      m.mod.flag === "cannotPlayOrCommit" &&
      (!m.mod.filter || matchesFilter(g, card(g, cardId).code, m.mod.filter)),
  );
}

/** card instances whose text box is blank right now */
export function blankedCards(g: G): Set<InstId> {
  // blankText comes only from temporary effects (Mind Wipe) or card scripts (Stubborn Detective), never from constant abilities
  const out = new Set<InstId>();
  for (const t of g.s.tempMods) if (t.mod.flag === "blankText") out.add(t.target);
  for (const c of cardsInAny(g, MOD_ZONES)) {
    const fn = g.db.scripts[c.code]?.blanks;
    if (fn) for (const id of fn(g, c.id)) out.add(id);
  }
  return out;
}

export const isBlank = (g: G, id: InstId, blanked = blankedCards(g)) => blanked.has(id);

export function abilitiesOf(
  g: G,
  id: InstId,
  blanked?: Set<InstId>,
): (Ability & { run?: string })[] {
  if (isBlank(g, id, blanked)) return [];
  const c = card(g, id);
  const script = g.db.scripts[c.code];
  return [...def(g, id).abilities, ...(script?.abilities ?? [])];
}

/** all modifiers currently in effect */
export function allMods(g: G): AppliedMod[] {
  const out: AppliedMod[] = [];
  const blanked = blankedCards(g);
  for (const c of cardsInAny(g, MOD_ZONES)) {
    const abilities = c.zone === "location" && !c.revealed ? [] : abilitiesOf(g, c.id, blanked);
    for (const a of abilities) {
      if (a.kind !== "constant" || !a.modifiers) continue;
      if (a.condition && !checkCondition(g, a.condition, { source: c.id, you: c.controller }))
        continue;
      for (const mod of a.modifiers)
        for (const target of scopeTargets(g, c, mod)) out.push({ target, mod, source: c.id });
    }
    const script = g.db.scripts[c.code];
    if (script?.modifiers && !blanked.has(c.id))
      for (const m of script.modifiers(g, c.id)) out.push({ ...m, source: c.id });
  }
  for (const t of g.s.tempMods) out.push({ target: t.target, mod: t.mod, source: t.source });
  return out;
}

function scopeTargets(g: G, c: CardInst, mod: Modifier): string[] {
  switch (mod.scope ?? "controller") {
    case "controller":
      return c.controller ? [c.controller] : [];
    case "investigatorsAtLocation": {
      const loc = c.controller
        ? invRecIf(g, c.controller)?.location
        : c.zone === "location"
          ? c.id
          : c.zone === "enemy" || c.zone === "attached"
            ? c.location
            : null;
      return invsAt(g, loc ?? null);
    }
    case "attachedLocation":
      return c.location ? [c.location] : [];
    case "self":
      return [c.id];
    case "allEnemies":
      return enemies(g).map((e) => e.id);
    case "tester":
      return g.s.skillTest ? [g.s.skillTest.inv] : [];
  }
}

function modApplies(g: G, mod: Modifier, target: string): boolean {
  const when = mod.when ?? "always";
  if (when === "always") return true;
  const t = g.s.skillTest;
  if (!t || t.inv !== target) return false;
  if (when === "skillTest") return true;
  return (
    (when === "investigating" && t.kind === "investigate") ||
    (when === "fighting" && t.kind === "fight") ||
    (when === "evading" && t.kind === "evade")
  );
}

export function modSum(g: G, target: string, stat: ModStat, mods = allMods(g)): number {
  let sum = 0;
  for (const m of mods) {
    if (m.target !== target || m.mod.stat !== stat || !modApplies(g, m.mod, target)) continue;
    sum += (m.mod.value ?? 0) * (m.mod.perInvestigator ? playerCount(g) : 1);
  }
  return sum;
}

export const hasFlag = (g: G, target: string, flag: Modifier["flag"], mods = allMods(g)) =>
  mods.some((m) => m.target === target && m.mod.flag === flag && modApplies(g, m.mod, target));

export function baseSkill(g: G, i: InvId, skill: Skill): number {
  return def(g, inv(g, i).cardId).skills![skill];
}

export function skillValue(g: G, i: InvId, skill: Skill): number {
  const mods = allMods(g);
  let v = baseSkill(g, i, skill) + modSum(g, i, skill, mods);
  if (
    (skill === "combat" || skill === "agility") &&
    hasFlag(g, i, "intellectForCombatAndAgility", mods)
  ) {
    v = Math.max(v, baseSkill(g, i, "intellect") + modSum(g, i, "intellect", mods));
  }
  return Math.max(0, v);
}

export const maxHealth = (g: G, i: InvId) =>
  (def(g, inv(g, i).cardId).health ?? 0) + modSum(g, i, "health");
export const maxSanity = (g: G, i: InvId) =>
  (def(g, inv(g, i).cardId).sanity ?? 0) + modSum(g, i, "sanity");
export const remainingHealth = (g: G, i: InvId) => maxHealth(g, i) - inv(g, i).damage;
export const remainingSanity = (g: G, i: InvId) => maxSanity(g, i) - inv(g, i).horror;

export function enemyStat(
  g: G,
  id: InstId,
  stat: "fight" | "evade" | "damage" | "horror" | "health",
): number {
  const e = def(g, id).enemy!;
  const modStat: ModStat =
    stat === "health"
      ? "enemyHealth"
      : stat === "damage"
        ? "enemyDamage"
        : stat === "horror"
          ? "enemyHorror"
          : stat;
  let base = e[stat];
  if (base === null) return Infinity; // no printed value: can't be fought, evaded or defeated by damage
  if (stat === "health" && e.healthPerInvestigator) base *= playerCount(g);
  return Math.max(0, base + modSum(g, id, modStat));
}

export function shroud(g: G, loc: InstId): number {
  const base = def(g, loc).shroud;
  if (base === null) return Infinity; // the text defines it: can't be investigated
  return Math.max(0, (base ?? 0) + modSum(g, loc, "shroud"));
}

export function addTempMod(
  g: G,
  mod: Modifier,
  target: string,
  until: "test" | "turn" | "phase" | "round",
  source: InstId | null = null,
) {
  g.s.tempMods.push({ id: g.s.seq++, mod, target, until, source });
}
export function expireMods(g: G, until: "test" | "turn" | "phase" | "round") {
  g.s.tempMods = g.s.tempMods.filter((t) => t.until !== until);
}

// ---------- costs ----------
export function canPay(g: G, i: InvId, cardId: InstId, cost: Cost | undefined): boolean {
  if (!cost) return true;
  const c = card(g, cardId);
  const me = inv(g, i);
  if (cost.exhaust && c.exhausted) return false;
  if (cost.uses && c.uses < cost.uses) return false;
  if (cost.resources && me.resources < cost.resources) return false;
  if (
    cost.resourcesPerInvestigator &&
    me.resources < cost.resourcesPerInvestigator * playerCount(g)
  )
    return false;
  if (cost.resourcesOrUses && c.uses < cost.resourcesOrUses && me.resources < cost.resourcesOrUses)
    return false;
  if (cost.clues && (me.clues < cost.clues || hasFlag(g, i, "cannotSpendClues"))) return false;
  if (cost.cluesPerInvestigator) {
    const total = activeInvs(g).reduce((n, x) => n + inv(g, x).clues, 0);
    if (total < cost.cluesPerInvestigator * playerCount(g)) return false;
  }
  if (cost.discardFromHand && me.hand.filter((h) => h !== cardId).length < cost.discardFromHand)
    return false;
  return true;
}

// ---------- conditions ----------

export function checkCondition(g: G, c: Condition, ctx: EffCtx): boolean {
  const you = ctx.you ?? null;
  const yourLoc = you ? (invRecIf(g, you)?.location ?? null) : null;
  if ("all" in c) return c.all.every((x) => checkCondition(g, x, ctx));
  if ("any" in c) return c.any.some((x) => checkCondition(g, x, ctx));
  if ("not" in c) return !checkCondition(g, c.not, ctx);
  if ("yourTurn" in c) return g.s.active === you && g.s.phase === "investigation";
  if ("cluesOnYourLocation" in c) {
    const n = yourLoc ? card(g, yourLoc).clues : 0;
    return c.cluesOnYourLocation === "none" ? n === 0 : n > 0;
  }
  if ("youHaveClues" in c) {
    const n = you ? inv(g, you).clues : 0;
    return c.youHaveClues === "none" ? n === 0 : n > 0;
  }
  if ("enemyAtYourLocation" in c) {
    const f = c.enemyAtYourLocation;
    return enemiesAt(g, yourLoc).some((e) => f === true || matchesFilter(g, e.code, f));
  }
  if ("enemyInPlay" in c)
    return allCardRecs(g).some(
      (x) => x.zone === "enemy" && matchesFilter(g, x.code, c.enemyInPlay),
    );
  if ("exhaustedEnemyAtYourLocation" in c) return enemiesAt(g, yourLoc).some((e) => e.exhausted);
  if ("onlyEngagedEnemy" in c)
    return !!you && engagedWith(g, you).length === 1 && engagedWith(g, you)[0].id === ctx.enemy;
  if ("eventEnemy" in c)
    return !!ctx.enemy && matchesFilter(g, card(g, ctx.enemy).code, c.eventEnemy);
  if ("eventInvestigatorIsYou" in c) return ctx.inv === you;
  if ("eventAtYourLocation" in c) {
    const evLoc = ctx.location ?? (ctx.inv ? invRecIf(g, ctx.inv)?.location : null);
    return !!evLoc && evLoc === yourLoc;
  }
  if ("testKind" in c) return g.s.skillTest?.kind === c.testKind;
  if ("failedBy" in c) return ctx.failBy !== undefined && ctx.failBy <= c.failedBy.max;
  if ("succeededBy" in c) return ctx.succeedBy !== undefined && ctx.succeedBy >= c.succeededBy.min;
  if ("tokenIs" in c) return !!ctx.token && c.tokenIs.includes(ctx.token);
  if ("tokenNegative" in c) return !!ctx.token && ctx.token.startsWith("-");
  if ("resources" in c) return !!you && inv(g, you).resources >= c.resources.min;
  if ("assetInPlay" in c)
    return !!you && controlled(g, you).some((a) => matchesFilter(g, a.code, c.assetInPlay));
  if ("controlsCard" in c)
    return !!you && controlled(g, you).some((a) => a.code === c.controlsCard);
  if ("scenarioFlag" in c) return !!named(g, c.scenarioFlag);
  if ("phase" in c) return g.s.phase === c.phase;
  if ("selfHasClues" in c) return !!ctx.source && card(g, ctx.source).clues > 0;
  if ("engaged" in c) return !!you && engagedWith(g, you).length > 0;
  if ("yourSkillTest" in c) return !!g.s.skillTest && g.s.skillTest.inv === you;
  if ("eventCard" in c)
    return (
      !!ctx.card &&
      !!cardRecIf(g, ctx.card) &&
      matchesFilter(g, card(g, ctx.card).code, c.eventCard)
    );
  if ("firstAction" in c) return !!you && g.s.active === you && inv(g, you).actionsTaken === 0;
  if ("eventSource" in c)
    return (
      !!ctx.card &&
      !!cardRecIf(g, ctx.card) &&
      matchesFilter(g, card(g, ctx.card).code, c.eventSource)
    );
  if ("eventFromYourLocation" in c) return !!ctx.from && ctx.from === yourLoc;
  if ("eventEnemyInPlay" in c) return !!ctx.enemy && cardRecIf(g, ctx.enemy)?.zone === "enemy";
  if ("enemyNearby" in c) {
    if (!yourLoc) return false;
    const d = distances(g, yourLoc);
    return enemies(g).some(
      (e) =>
        !!e.location &&
        (d.get(e.location) ?? Infinity) <= c.enemyNearby.range &&
        (!c.enemyNearby.nonElite || !isElite(g, e.id)),
    );
  }
  if ("defeatedHealthThisTurn" in c)
    return !!you && inv(g, you).defeatedHealth >= c.defeatedHealthThisTurn.min;
  if ("testSource" in c) {
    const src = g.s.skillTest?.source;
    return !!src && !!cardRecIf(g, src) && matchesFilter(g, card(g, src).code, c.testSource);
  }
  if ("remainingSanity" in c) return !!you && remainingSanity(g, you) <= c.remainingSanity.max;
  if ("eventEnemyExhausted" in c) return !!ctx.enemy && !!cardRecIf(g, ctx.enemy)?.exhausted;
  if ("eventEnemyAttackedYouThisRound" in c)
    return !!ctx.enemy && !!you && attacked.get(g, [ctx.enemy, you]) === g.s.round;
  if ("eventCardIsSelf" in c) return !!ctx.card && ctx.card === ctx.source;
  if ("canPay" in c) return !!you && !!ctx.source && canPay(g, you, ctx.source, c.canPay);
  if ("testTokens" in c) return !!g.s.skillTest?.tokens.some((t) => c.testTokens.includes(t));
  if ("eventAtThisLocation" in c)
    return !!ctx.inv && !!ctx.source && invRecIf(g, ctx.inv)?.location === ctx.source;
  if ("script" in c) {
    const own = ctx.source ? cardRecIf(g, ctx.source)?.code : undefined;
    const fn =
      (own ? g.db.scripts[own]?.conditions?.[c.script] : undefined) ??
      g.db.scripts[g.s.scenarioId]?.conditions?.[c.script];
    return !!fn?.(g, ctx);
  }
  if ("controlled" in c) return !!ctx.source && !!card(g, ctx.source).controller === c.controlled;
  if ("exhausted" in c) return !!ctx.source && card(g, ctx.source).exhausted === c.exhausted;
  return false;
}
