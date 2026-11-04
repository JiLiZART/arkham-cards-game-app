import { randInt, shuffle } from "./world/rng";
import type { CardDef, ChaosToken } from "../content/schema";
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
  deckPile,
  pileRead,
  pileRec,
} from "./world/store";
import type { EventType } from "./events/event";
import type {
  CardInst,
  CardView,
  EffCtx,
  GameContext,
  InvView,
  ChoiceOption,
  GameEvent,
  GameState,
  InstId,
  InvId,
  InvState,
  PendingChoice,
  Step,
  PileName,
} from "./world/types";
import { EVENT } from "./events/event";
import { PHASE, CHOICE, PILE } from "./world/constants";

/** The engine context's accessors, counters and setters, events and the step queue: what every rule builds on (ADR-0022, ADR-0025). */

export type { GameContext } from "./world/types";

export const LOG_LIMIT = 300;

// ---------- basic accessors ----------
/** a card instance, read-only (ADR-0022): change it through the setters below */
export const card = (game: GameContext, id: InstId): CardView => cardRec(game, id);
export const def = (game: GameContext, id: InstId): CardDef => defOf(game, card(game, id).code);
export const defOf = (game: GameContext, code: string): CardDef => {
  const d = game.db.cards[code];
  if (!d) throw new Error(`no card def ${code}`);
  return d;
};
/** an investigator, read-only (ADR-0022): change them through the setters below */
export const inv = (game: GameContext, id: InvId): InvView => {
  const v = invViewIn(game.s, id);
  if (!v) throw new Error(`no investigator ${id}`);
  return v;
};
export const name = (game: GameContext, id: InstId) => def(game, id).name;

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

export type { PileName } from "./world/types";
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
export const cardIf = (game: GameContext, id: InstId | null | undefined): CardView | undefined =>
  cardRecIf(game, id);
/** every card instance, in creation order */
export const allCards = (game: GameContext): readonly CardView[] => allCardRecs(game);
/** an investigator, or undefined when the id is absent or names none */
export const invIf = (game: GameContext, id: InvId | null | undefined): InvView | undefined =>
  invOfIf(game.s, id);
/** an act deck's current card (deck `a`: a one-deck scenario's act) */
export const currentAct = (game: GameContext, deck = "a"): InstId | null =>
  game.s.acts[deck] ?? null;
/** an agenda deck's current card (deck `a`: a one-deck scenario's agenda) */
export const currentAgenda = (game: GameContext, deck = "a"): InstId | null =>
  game.s.agendas[deck] ?? null;
/** every act deck's current card, by deck name in deck order */
export const currentActs = (game: GameContext): Readonly<Record<string, InstId | null>> =>
  game.s.acts;
/** every agenda deck's current card, by deck name in deck order */
export const currentAgendas = (game: GameContext): Readonly<Record<string, InstId | null>> =>
  game.s.agendas;
export const leadInvestigator = (game: GameContext) => game.s.lead;
/** every investigator in turn order, eliminated ones included */
export const turnOrder = (game: GameContext): readonly InvId[] => game.s.order;
export const currentPhase = (game: GameContext) => game.s.phase;
export const currentRound = (game: GameContext) => game.s.round;
export const difficultyOf = (game: GameContext) => game.s.difficulty;
/** the campaign log as the scenario began (read-only for scripts) */
export const campaignLogOf = (game: GameContext): Readonly<Record<string, unknown>> =>
  game.s.campaignLog;
/** the skill test under way, or null */
export const currentTest = (game: GameContext) => game.s.skillTest;
export const activeInvestigator = (game: GameContext) => game.s.active;
export const scenarioIdOf = (game: GameContext) => game.s.scenarioId;
export const logLength = (game: GameContext) => game.s.log.length;
/** the game waits for the lead investigator before each phase (the UI's games) */
export const pacesPhases = (game: GameContext) => !!game.s.pacePhases;
/** the event under this key was cancelled (an attack, a movement, a clue discovery) */
export const isCancelled = (game: GameContext, key: string) => game.s.cancelled.includes(key);

/** a key no other event has: `prefix` and the next number of the scenario's one counter */
export const nextKey = (game: GameContext, prefix: string) => `${prefix}${game.s.seq++}`;

/** how often a limited ability has been used in a period (the key names the card, the ability and the period) */
export const limitUses = (game: GameContext, key: string) => game.s.usage[key] ?? 0;
export const recordLimitUse = (game: GameContext, key: string) =>
  void (game.s.usage[key] = limitUses(game, key) + 1);
/** the number of the current turn, phase, round or test, for a limit's period */
export const periodCounter = (game: GameContext, per: "turn" | "phase" | "round" | "test") =>
  game.s.counters[per];
export const bumpCounter = (game: GameContext, per: "turn" | "phase" | "round" | "test") =>
  void game.s.counters[per]++;

/** a new phase begins */
export function setPhase(game: GameContext, phase: GameState["phase"]) {
  game.s.phase = phase;
  bumpCounter(game, "phase");
}
/** a new round begins */
export function startRound(game: GameContext) {
  game.s.round++;
  bumpCounter(game, "round");
}
/** whose turn it is (null: no one's) */
export const setActive = (game: GameContext, who: InvId | null) => void (game.s.active = who);
export const setLead = (game: GameContext, who: InvId) => void (game.s.lead = who);
/** the scenario ends with this resolution: nothing more resolves and no choice is pending */
export function endScenario(game: GameContext, resolution: string) {
  game.s.phase = PHASE.Ended;
  game.s.resolution = resolution;
  game.s.queue = [];
  game.s.pending = null;
}
/** a scenario pile, top first for the decks (read-only: move cards with moveCard) */
export const pile = (
  game: GameContext,
  name: "encounterDeck" | "encounterDiscard" | "actDeck" | "agendaDeck",
): readonly InstId[] => pileRead(game.s, name);
/** an act or agenda deck's cards under its current one, top first (deck `a`: a one-deck scenario's) */
export const deckCards = (
  game: GameContext,
  kind: "act" | "agenda",
  deck = "a",
): readonly InstId[] => pileRead(game.s, deckPile(kind, deck));
/** the named tokens (`ward`, `scrap`) a card or an investigator holds */
export const tokensOn = (game: GameContext, holder: InstId | InvId, name: string): number =>
  game.s.world.tables.tokens[`${holder}:${name}`] ?? 0;
/** every name of named token a card or an investigator holds, with how many (a state read, for the UI and the log) */
export const namedTokensOf = (
  s: Pick<GameState, "world">,
  holder: InstId | InvId,
): [string, number][] =>
  Object.entries(s.world.tables.tokens)
    .filter(([k, n]) => k.startsWith(`${holder}:`) && n > 0)
    .map(([k, n]) => [k.slice(holder.length + 1), n]);
/** add (or with a negative `n`, take) named tokens; never below none; returns how many it holds now */
export function addTokens(
  game: GameContext,
  holder: InstId | InvId,
  name: string,
  n: number,
): number {
  const t = game.s.world.tables.tokens;
  const now = Math.max(0, (t[`${holder}:${name}`] ?? 0) + n);
  if (now) t[`${holder}:${name}`] = now;
  else delete t[`${holder}:${name}`];
  return now;
}
/** a card leaving play loses its named tokens */
export function clearTokens(game: GameContext, holder: InstId) {
  const t = game.s.world.tables.tokens;
  for (const k of Object.keys(t)) if (k.startsWith(`${holder}:`)) delete t[k];
}
/** the facedown cards beneath a card, top first (none: an empty list) */
export const cardsBeneath = (game: GameContext, holder: InstId): readonly InstId[] =>
  pileRead(game.s, `beneath:${holder}`);
export const sideDeck = (game: GameContext, name: string): readonly InstId[] =>
  pileRead(game.s, `sideDeck:${name}`);

// ---------- what scripts change besides cards, counters and flags ----------
/** the event under this key doesn't happen (an attack, a token's effect) */
export function cancelEvent(game: GameContext, key: string) {
  game.s.cancelled.push(key);
}
export function addChaosTokens(game: GameContext, tokens: ChaosToken[]) {
  game.s.chaosBag.push(...tokens);
}
/** put an investigator at a location without moving (no move triggers) */
export function placeInvestigator(game: GameContext, i: InvId, loc: InstId | null) {
  invRec(game, i).location = loc;
}
/** the vehicle an investigator is in (null: none) */
export const inVehicle = (game: GameContext, i: InvId): InstId | null =>
  invRec(game, i).vehicle ?? null;
/** the vehicle an investigator is in (null: none) */
export function setVehicle(game: GameContext, i: InvId, vehicle: InstId | null) {
  const me = invRec(game, i);
  if (vehicle) me.vehicle = vehicle;
  else delete me.vehicle;
}
/** the enemy is engaged with the investigator (null: no one), with no engage triggers */
export function setEngaged(game: GameContext, enemy: InstId, i: InvId | null) {
  cardRec(game, enemy).engagedWith = i;
}

// ---------- chance, from the scenario's seeded generator ----------
/** a random whole number from 0 to n - 1 */
export const randomInt = (game: GameContext, n: number) => randInt(game.s, n);
/** shuffle a script's own list in place */
export function shuffleList<T>(game: GameContext, list: T[]) {
  shuffle(game.s, list);
}
/** shuffle an investigator's deck or the encounter deck */
export function shuffleDeck(game: GameContext, owner: InvId | "encounter") {
  shuffle(game.s, pileRec(game, owner === "encounter" ? PILE.EncounterDeck : `deck:${owner}`));
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
function holder(game: GameContext, id: InvId | InstId, k: Counter): Record<Counter, number> {
  const i = invRecIf(game, id);
  if (i) {
    if (CARD_ONLY.includes(k)) throw new Error(`investigator ${id} holds no ${k}`);
    return i as unknown as Record<Counter, number>;
  }
  const c = cardRecIf(game, id);
  if (!c) throw new Error(`no card or investigator ${id}`);
  if (INV_ONLY.includes(k)) throw new Error(`card ${id} holds no ${k}`);
  return c as unknown as Record<Counter, number>;
}

export const counter = (game: GameContext, id: InvId | InstId, k: Counter): number =>
  holder(game, id, k)[k];

/** set a counter as given (no clamping: a rule clamps where it must) */
export function setCounter(game: GameContext, id: InvId | InstId, k: Counter, v: number) {
  holder(game, id, k)[k] = v;
}

/** add to a counter (negative to remove) and return the new value */
export function addCounter(game: GameContext, id: InvId | InstId, k: Counter, n: number): number {
  const h = holder(game, id, k);
  h[k] += n;
  return h[k];
}

// ---------- card fields ----------
export const exhaust = (game: GameContext, id: InstId) => void (cardRec(game, id).exhausted = true);
export const ready = (game: GameContext, id: InstId) => void (cardRec(game, id).exhausted = false);
/** turn a location (or anything revealed) face up */
export const reveal = (game: GameContext, id: InstId) => void (cardRec(game, id).revealed = true);
/** where an enemy or an attachment is (the card of a location), without moving it through zones */
export const setCardLocation = (game: GameContext, id: InstId, loc: InstId | null) =>
  void (cardRec(game, id).location = loc);
/** the investigator who controls the card (null: no one) */
export const setController = (game: GameContext, id: InstId, who: InvId | null) =>
  void (cardRec(game, id).controller = who);
export const setOwner = (game: GameContext, id: InstId, who: InvId | null) =>
  void (cardRec(game, id).owner = who);
/** the card is another card now (a story asset that transforms: Elokoss's two sides) */
export const setCode = (game: GameContext, id: InstId, code: string) =>
  void (cardRec(game, id).code = code);
/** the card is attached to another (null: to none) */
export const attachTo = (game: GameContext, id: InstId, to: InstId | null) =>
  void (cardRec(game, id).attachedTo = to);

// ---------- investigator fields ----------
/** a new turn's actions: how many, and the restricted ones the investigator's cards grant */
export function beginActions(
  game: GameContext,
  i: InvId,
  left: number,
  restricted: InvState["restrictedActions"],
) {
  const me = invRec(game, i);
  me.actionsTaken = 0;
  me.actionsLeft = left;
  me.restrictedActions = restricted.map((r) => ({ ...r }));
}
/** a restricted action only some cards can use (Daisy's Tome action) */
export function grantRestricted(
  game: GameContext,
  i: InvId,
  r: InvState["restrictedActions"][number],
) {
  invRec(game, i).restrictedActions.push({ ...r });
}
/** use up `n` of the investigator's restricted action at `index` */
export function spendRestricted(game: GameContext, i: InvId, index: number, n: number) {
  invRec(game, i).restrictedActions[index].left -= n;
}
/** an action of this designator was taken: it counts for "first time each round" and "first action" */
export function noteAction(game: GameContext, i: InvId, designator: string) {
  const me = invRec(game, i);
  me.actionsThisRound.push(designator);
  me.actionsTaken++;
}
export function clearRoundActions(game: GameContext) {
  for (const i of allInvRecs(game)) i.actionsThisRound = [];
}
export function clearTurnDone(game: GameContext) {
  for (const i of allInvRecs(game)) i.turnDone = false;
}
export function clearDefeatedHealth(game: GameContext) {
  for (const i of allInvRecs(game)) i.defeatedHealth = 0;
}
export const setTurnDone = (game: GameContext, i: InvId, done: boolean) =>
  void (invRec(game, i).turnDone = done);
/** an investigator resigns or is defeated (by damage or horror) */
export function setStatus(
  game: GameContext,
  i: InvId,
  status: InvState["status"],
  by?: "damage" | "horror",
) {
  const me = invRec(game, i);
  me.status = status;
  if (by) me.defeatedBy = by;
}

// ---------- deck order ----------
/** put cards on top of a deck in the order given (`ids[0]` on top), the rest of the deck below them in its order */
export function arrangeOnTop(
  game: GameContext,
  owner: InvId | "encounter",
  ids: readonly InstId[],
) {
  const deck = pileRec(game, owner === "encounter" ? PILE.EncounterDeck : `deck:${owner}`);
  deck.splice(0, deck.length, ...ids, ...deck.filter((id) => !ids.includes(id)));
}

export const invName = (game: GameContext, id: InvId) => invRecIf(game, id)?.name ?? id;

export const activeInvs = (game: GameContext): InvId[] =>
  game.s.order.filter((i) => invRec(game, i).status === "playing");
export const playerCount = (game: GameContext) => game.s.order.length; // per-investigator values use starting count

// ---------- events ----------
export function emit(
  game: GameContext,
  type: EventType,
  text: string,
  extra: Partial<GameEvent> = {},
) {
  const e: GameEvent = { type, text, ...extra };
  game.events.push(e);
  game.s.log.push(e);
  if (game.s.log.length > LOG_LIMIT) game.s.log.splice(0, game.s.log.length - LOG_LIMIT);
}

/** marks the start of an automated step of a phase in the log (the UI's captions); never a choice */
export function logStep(game: GameContext, step: string, who?: string) {
  emit(game, EVENT.Step, who ? `${invName(game, who)}: ${step}` : step, {
    ...(who ? { inv: who } : {}),
    data: { step, phase: game.s.phase },
  });
}

// ---------- queue ----------
/** push steps so that steps[0] resolves first */
export function push(game: GameContext, ...steps: Step[]) {
  for (let i = steps.length - 1; i >= 0; i--) game.s.queue.push(steps[i]);
}

/**
 * Ask a player. Returns the chosen value when the step is re-run with an answer,
 * otherwise records a pending choice and returns undefined (handler must return).
 * With `auto`, a single option is chosen without asking.
 */
/** an effect resolves for its investigator unless they have been eliminated mid-effect (an attack of opportunity) */
export const resolvesFor = (game: GameContext, ctx: EffCtx): boolean =>
  !ctx.you || !invOfIf(game.s, ctx.you) || invOf(game.s, ctx.you).status === "playing";

export function ask<T = unknown>(
  game: GameContext,
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
  game.s.pending = {
    seq: ++game.s.seq,
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
  game: GameContext,
  step: Step,
  invId: InvId,
  deck: "player" | "encounter",
  n: number,
): boolean {
  if (!game.s.tapDecks || game.s.phase === "setup" || game.s.phase === "ended") return true;
  const label = deck === "player" ? "Tap your deck to draw" : "Tap the encounter deck to draw";
  return (
    ask(
      game,
      step,
      invId,
      CHOICE.Draw,
      label,
      [{ id: "draw", label: "Draw", value: `draw:${deck}` }],
      {
        key: `tapDeck.${deck}${n > 1 ? ".many" : ""}`,
        vars: { deck, n },
      },
    ) !== undefined
  );
}

export function nextId(game: GameContext) {
  return `c${game.s.nextId++}`;
}
