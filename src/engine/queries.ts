import { attacked, baseRaised, named, rememberedFact, role } from "./world/flags";
import { keywordName, type Keyword } from "../content/schema";
import type {
  Amount,
  Ability,
  BeneathOf,
  Spawn,
  TokenHolder,
  Placement,
  CardDef,
  CardFilter,
  Condition,
  Cost,
  Modifier,
  ModStat,
  Skill,
} from "../content/schema";
import { allCardRecs, cardRec, cardRecIf, invRec, invRecIf } from "./world/store";
import type {
  CardInst,
  CardView,
  GameContext,
  ContentDb,
  EffCtx,
  EnemyMove,
  GameState,
  InstId,
  InvId,
  Zone,
} from "./world/types";
import {
  activeInvs,
  allCards,
  card,
  cardsBeneath,
  tokensOn,
  currentAct,
  currentActs,
  currentAgenda,
  def,
  defOf,
  inv,
  playerCount,
} from "./context";
import { SCENARIO_CARD, ZONE, isOneOf } from "./world/constants";
import { conditionFor, scriptOf } from "./world/scripts";

/** Questions about the game: zones, the map, modifiers, costs and conditions (ADR-0025). */

// ---------- queries ----------
/** the cards in a zone, in creation order: read off the zone table, so a view is made only for the cards that match */
export function cardsIn(game: GameContext, zone: Zone): CardView[] {
  const zones = game.s.world.tables.zone;
  const out: CardView[] = [];
  for (const id in zones) if (zones[id] === zone) out.push(cardRec(game, id));
  return out;
}
/** the cards in any of the zones, in creation order (as `cardsIn`, for several zones) */
function cardsInAny(game: GameContext, zones: ReadonlySet<Zone>): CardInst[] {
  const table = game.s.world.tables.zone;
  const out: CardInst[] = [];
  for (const id in table) if (zones.has(table[id])) out.push(cardRec(game, id));
  return out;
}
export const locations = (game: GameContext) => cardsIn(game, ZONE.Location);
export const enemies = (game: GameContext) => cardsIn(game, ZONE.Enemy);
export const enemiesAt = (game: GameContext, loc: InstId | null) =>
  enemies(game).filter((e) => e.location === loc);
export const engagedWith = (game: GameContext, i: InvId) =>
  enemies(game).filter(
    (e) =>
      e.engagedWith === i ||
      (isMassive(game, e.id) && e.location === invRecIf(game, i)?.location && !e.exhausted),
  );
export const invsAt = (game: GameContext, loc: InstId | null) =>
  activeInvs(game).filter((i) => invRec(game, i).location === loc);
export const findByCode = (game: GameContext, code: string, zones?: Zone[]): CardView | undefined =>
  allCardRecs(game).find((c) => c.code === code && (!zones || zones.includes(c.zone)));
export const locationByCode = (game: GameContext, code: string) =>
  findByCode(game, code, [ZONE.Location]);
export const locationByName = (game: GameContext, nm: string) =>
  locations(game).find((l) => def(game, l.id).name === nm);
export const hasTrait = (game: GameContext, id: InstId, trait: string) =>
  def(game, id).traits.includes(trait);
/** Elite by its traits, or a constant ability makes it gain Elite (Imperceptible Creature) */
export const isElite = (game: GameContext, id: InstId) =>
  hasTrait(game, id, "Elite") || hasFlag(game, id, "elite");
/** whether the card's own keywords hold this one (a plain keyword, or the name of one with an argument) */
export const hasKeyword = (game: GameContext, id: InstId, kw: string) =>
  def(game, id).keywords.some((k) => keywordName(k) === kw);
/** the arguments of the keywords that carry one */
export interface KeywordArgs {
  patrol: Spawn;
  swarming: Amount;
  bonded: string;
  predator: string;
  researched: { log: string };
}
/**
 * A keyword's argument: the card's own, else one a constant ability grants it (an agenda's "each enemy gains Patrol");
 * undefined when it has none.
 */
export function keywordArg<K extends keyof KeywordArgs>(
  game: GameContext,
  id: InstId,
  name: K,
): KeywordArgs[K] | undefined {
  const own = (k: Keyword) =>
    typeof k === "object" && name in k ? (k as Record<K, KeywordArgs[K]>)[name] : undefined;
  for (const k of def(game, id).keywords) {
    const v = own(k);
    if (v !== undefined) return v;
  }
  for (const m of allMods(game))
    if (m.target === id && m.mod.keyword) {
      const v = own(m.mod.keyword);
      if (v !== undefined) return v;
    }
  return undefined;
}
/**
 * aloof by its own keywords, or a constant ability grants it (The Clover Club: "each [[Criminal]] enemy gains Aloof"),
 * unless one takes it away (Raise the Stakes: "loses aloof")
 */
export const isAloof = (game: GameContext, id: InstId) =>
  (hasKeyword(game, id, "aloof") ||
    allMods(game).some((m) => m.target === id && m.mod.keyword === "aloof")) &&
  !hasFlag(game, id, "notAloof");
/** an aloof enemy can only be attacked while it is engaged with an investigator; some only with one card (`by`) */
export const attackable = (game: GameContext, id: InstId, by?: InstId | null, who?: InvId) =>
  attackableBy(game, id, by) &&
  (!isAloof(game, id) || !!cardRecIf(game, id)?.engagedWith) &&
  // "You cannot attack [[Possessed]] enemies" (Gift of Madness (Pity))
  (!who ||
    !allMods(game).some(
      (m) =>
        m.target === who &&
        m.mod.flag === "cannotAttack" &&
        (!m.mod.filter || matchesFilter(game, def(game, id).code, m.mod.filter)),
    ));
/** an enemy that can be attacked and damaged only with one card's ability, and this isn't it (Brood of Yog-Sothoth) */
export const attackableBy = (game: GameContext, id: InstId, by?: InstId | null) => {
  const only = def(game, id).onlyAttackableBy;
  return !only || (!!by && cardRecIf(game, by)?.code === only);
};
/** a unique card cannot be played or put into play while a card with its title is in play (Grimoire, Unique) */
export function uniqueInPlay(game: GameContext, id: InstId): boolean {
  const d = def(game, id);
  return (
    !!d.unique &&
    allCardRecs(game).some(
      (c) =>
        c.id !== id &&
        isOneOf(c.zone, ZONE.Play, ZONE.Threat, ZONE.Enemy, ZONE.Attached) &&
        game.db.cards[c.code].name === d.name,
    )
  );
}
/** clues an act deck's current act asks for, as a group (Infinity when it has none to spend) */
export function actClueCost(game: GameContext, deck = "a"): number {
  const act = currentAct(game, deck);
  if (!act) return Infinity;
  const d = def(game, act);
  if (!d.actClues) return Infinity;
  return d.actClues * (d.actCluesPerInvestigator ? game.s.order.length : 1);
}
/** clues the group may spend (Masked Hunter blocks engaged investigators) */
export function spendableGroupClues(game: GameContext, among?: readonly InvId[]) {
  return (among ?? activeInvs(game))
    .filter((x) => !hasFlag(game, x, "cannotSpendClues"))
    .reduce((n, x) => n + inv(game, x).clues, 0);
}
/** who may spend clues to advance an act: each investigator who can spend clues (only those at its place, if it names one) */
export function actSpenders(game: GameContext, deck = "a"): InvId[] {
  const act = currentAct(game, deck);
  const at = act ? def(game, act).actSpendAt : undefined;
  return activeInvs(game).filter((x) => {
    const loc = invRec(game, x).location;
    return !hasFlag(game, x, "cannotSpendClues") && (!at || (!!loc && def(game, loc).name === at));
  });
}
/** the act decks the group can advance by spending clues, in deck order (Grimoire, Act Deck and Agenda Deck) */
export const advanceableActs = (game: GameContext): string[] =>
  Object.entries(currentActs(game))
    .filter(
      ([deck, act]) =>
        !!act &&
        (def(game, act).actAdvance ?? "turn") === "turn" &&
        actSpenders(game, deck).reduce((n, x) => n + invRec(game, x).clues, 0) >=
          actClueCost(game, deck),
    )
    .map(([deck]) => deck);
/** the group can advance an act by spending clues, in any player window */
export const canAdvanceAct = (game: GameContext) => advanceableActs(game).length > 0;
/** massive by its own keywords, or a constant ability grants it (Shadow-spawned with 3 resources) */
export const isMassive = (game: GameContext, id: InstId) => gainsKeyword(game, id, "massive");
/** a keyword by the card's own keywords, or one a constant ability grants it (Hired Gun: Hunter, peril, surge) */
export const gainsKeyword = (game: GameContext, id: InstId, kw: string) =>
  hasKeyword(game, id, kw) || allMods(game).some((m) => m.target === id && m.mod.keyword === kw);
/** an enemy's prey instruction: its own, else one a constant ability grants it (Hired Gun: "Prey - Most resources") */
export const preyOf = (game: GameContext, enemy: InstId) =>
  def(game, enemy).prey ?? allMods(game).find((m) => m.target === enemy && m.mod.prey)?.mod.prey;
export const controlled = (game: GameContext, i: InvId) =>
  cardsIn(game, ZONE.Play).filter((c) => c.controller === i);
export const threatArea = (game: GameContext, i: InvId) =>
  cardsIn(game, ZONE.Threat).filter((c) => c.controller === i);

export function matchesFilter(game: GameContext, code: string, f: CardFilter): boolean {
  const d = defOf(game, code);
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
  if (f.keyword && !d.keywords.some((k) => keywordName(k) === f.keyword)) return false;
  if (f.notName && d.name === f.notName) return false;
  return true;
}

// ---------- map ----------
/**
 * The locations connected to a location instance (ADR: engine-location-instances-grid): the printed connections of its
 * card, which hold for every copy (the scenario's code pairs and one-way pairs); the links added to this instance at
 * runtime (two-way and one-way); and, when the scenario's adjacency is orthogonal, the locations on cells sharing a
 * side with its cell. Only locations in play.
 */
export function connections(game: GameContext, loc: InstId, enemy: EnemyMove = false): InstId[] {
  const scen = game.db.scenarios[game.s.scenarioId];
  const code = card(game, loc).code;
  const codes = new Set<string>();
  for (const [a, b] of scen.connections) {
    if (a === code) codes.add(b);
    if (b === code) codes.add(a);
  }
  for (const [a, b] of scen.oneWay ?? []) if (a === code) codes.add(b);
  const t = game.s.world.tables;
  const linked = new Set([...(t.links[loc] ?? []), ...(t.oneWay[loc] ?? [])]);
  // what the scenario's cards connect now (Echoes of the Past's Passageways)
  for (const l of scriptOf(game.db, game.s.scenarioId)?.hooks?.connections?.(game, loc, enemy) ??
    [])
    linked.add(l);
  const here = t.cell[loc];
  const side = (l: InstId) => {
    const c = t.cell[l];
    return !!here && !!c && Math.abs(c[0] - here[0]) + Math.abs(c[1] - here[1]) === 1;
  };
  const grid = scen.adjacency === "orthogonal";
  return locations(game)
    .filter((l) => l.id !== loc && (codes.has(l.code) || linked.has(l.id) || (grid && side(l.id))))
    .map((l) => l.id);
}

/** a location instance's cell on the map, `[col, row]` (null: none, out of play) */
export const cellOf = (game: GameContext, loc: InstId): [number, number] | null =>
  game.s.world.tables.cell[loc] ?? null;
/** the location in play at a cell */
export const locationAt = (game: GameContext, cell: [number, number]): InstId | null =>
  locations(game).find((l) => {
    const c = cellOf(game, l.id);
    return !!c && c[0] === cell[0] && c[1] === cell[1];
  })?.id ?? null;
/** the locations on cells sharing a side with this one's, whatever the scenario's adjacency */
export function adjacent(game: GameContext, loc: InstId): InstId[] {
  const c = cellOf(game, loc);
  if (!c) return [];
  return locations(game)
    .filter((l) => {
      const o = cellOf(game, l.id);
      return !!o && Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) === 1;
    })
    .map((l) => l.id);
}
/** the locations in a row, or a column, left to right / top to bottom */
export const inRow = (game: GameContext, row: number): InstId[] =>
  locations(game)
    .filter((l) => cellOf(game, l.id)?.[1] === row)
    .sort((a, b) => cellOf(game, a.id)![0] - cellOf(game, b.id)![0])
    .map((l) => l.id);
export const inColumn = (game: GameContext, col: number): InstId[] =>
  locations(game)
    .filter((l) => cellOf(game, l.id)?.[0] === col)
    .sort((a, b) => cellOf(game, a.id)![1] - cellOf(game, b.id)![1])
    .map((l) => l.id);
/** the cell one step in a direction from a cell */
export const cellToward = (
  c: [number, number],
  dir: "left" | "right" | "above" | "below",
): [number, number] =>
  dir === "left"
    ? [c[0] - 1, c[1]]
    : dir === "right"
      ? [c[0] + 1, c[1]]
      : dir === "above"
        ? [c[0], c[1] - 1]
        : [c[0], c[1] + 1];
/** the free cells sharing a side with a location's cell */
export function freeCellsAround(game: GameContext, loc: InstId): [number, number][] {
  const c = cellOf(game, loc);
  if (!c) return [];
  return (["left", "right", "above", "below"] as const)
    .map((d) => cellToward(c, d))
    .filter((x) => !locationAt(game, x));
}

/** connections() for read-only callers (the UI) that hold a state rather than an engine context */
export const connectionsOf = (db: ContentDb, s: GameState, loc: InstId): InstId[] =>
  connections({ s, db, events: [] }, loc);

/** BFS distances from a location */
export function distances(
  game: GameContext,
  from: InstId,
  enemy: EnemyMove = false,
): Map<InstId, number> {
  const dist = new Map<InstId, number>([[from, 0]]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of connections(game, cur, enemy)) {
      if (!dist.has(n)) {
        dist.set(n, dist.get(cur)! + 1);
        q.push(n);
      }
    }
  }
  return dist;
}

/** next location on a shortest path from `from` toward any of `targets` (all ties) */
export function stepsToward(
  game: GameContext,
  from: InstId,
  targets: InstId[],
  enemy: EnemyMove = false,
): InstId[] {
  if (targets.includes(from)) return [];
  let best = Infinity;
  const options: InstId[] = [];
  for (const n of connections(game, from, enemy)) {
    const d = distances(game, n, enemy);
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
  ZONE.Play,
  ZONE.Threat,
  ZONE.Attached,
  ZONE.Location,
  ZONE.Enemy,
  ZONE.Act,
  ZONE.Agenda,
  ZONE.Investigator,
]);

/** a card the investigator can't play or commit now (Languor) */
/**
 * A player card of a class other than the investigator's role (Lola Hayes: "only … Neutral cards or cards of your
 * role"); none while they have no role. Encounter cards have no class: their abilities stay open to her.
 */
export function offRole(game: GameContext, i: InvId, cardId: InstId): boolean {
  const r = role.get(game, i);
  const d = def(game, cardId);
  if (!r || !isOneOf(d.type, "asset", "event", "skill")) return false;
  const classes = d.factions ?? [d.faction];
  return !classes.includes("neutral") && !classes.includes(r);
}

export function cardBlocked(game: GameContext, i: InvId, cardId: InstId): boolean {
  if (offRole(game, i, cardId)) return true;
  return allMods(game).some(
    (m) =>
      m.target === i &&
      m.mod.flag === "cannotPlayOrCommit" &&
      (!m.mod.filter || matchesFilter(game, card(game, cardId).code, m.mod.filter)),
  );
}

/** card instances whose text box is blank right now */
export function blankedCards(game: GameContext): Set<InstId> {
  // blankText comes only from temporary effects (Mind Wipe) or card scripts (Stubborn Detective), never from constant abilities
  const out = new Set<InstId>();
  for (const t of game.s.tempMods) if (t.mod.flag === "blankText") out.add(t.target);
  for (const c of cardsInAny(game, MOD_ZONES)) {
    const fn = scriptOf(game.db, c.code)?.blanks;
    if (fn) for (const id of fn(game, c.id)) out.add(id);
  }
  return out;
}

export const isBlank = (game: GameContext, id: InstId, blanked = blankedCards(game)) =>
  blanked.has(id);

export function abilitiesOf(
  game: GameContext,
  id: InstId,
  blanked?: Set<InstId>,
): (Ability & { run?: string })[] {
  if (isBlank(game, id, blanked)) return [];
  const c = card(game, id);
  return [...def(game, id).abilities, ...(scriptOf(game.db, c.code)?.abilities ?? [])];
}

/**
 * a Hidden card in a hand, working as if in its holder's threat area: an encounter card held there, or a player's own
 * Hidden weakness (Unspeakable Oath)
 */
export const isHidden = (game: GameContext, id: InstId) => {
  const c = card(game, id);
  return c.zone === ZONE.Hand && (!c.owner || hasKeyword(game, id, "hidden"));
};
/** the Hidden cards in hands */
export const hiddenCards = (game: GameContext) =>
  cardsIn(game, ZONE.Hand).filter((c) => isHidden(game, c.id));

/** all modifiers currently in effect */
export function allMods(game: GameContext): AppliedMod[] {
  const out: AppliedMod[] = [];
  const blanked = blankedCards(game);
  for (const c of [...cardsInAny(game, MOD_ZONES), ...hiddenCards(game)]) {
    const abilities = c.zone === "location" && !c.revealed ? [] : abilitiesOf(game, c.id, blanked);
    for (const a of abilities) {
      if (a.kind !== "constant" || !a.modifiers) continue;
      if (a.condition && !checkCondition(game, a.condition, { source: c.id, you: c.controller }))
        continue;
      for (const mod of a.modifiers)
        for (const target of scopeTargets(game, c, mod)) out.push({ target, mod, source: c.id });
    }
    const script = scriptOf(game.db, c.code);
    if (script?.modifiers && !blanked.has(c.id))
      for (const m of script.modifiers(game, c.id)) out.push({ ...m, source: c.id });
  }
  // a player card's text that works from its owner's hand (Clasp of Black Onyx)
  for (const c of cardsIn(game, ZONE.Hand)) {
    const fn = c.owner ? scriptOf(game.db, c.code)?.inHandModifiers : undefined;
    if (fn) for (const m of fn(game, c.id)) out.push({ ...m, source: c.id });
  }
  for (const t of game.s.tempMods) out.push({ target: t.target, mod: t.mod, source: t.source });
  // a card immune to player card effects takes no modifier from one (Grimoire, Immune)
  const immune = new Set(
    out.filter((m) => m.mod.flag === "immuneToPlayerCards").map((m) => m.target),
  );
  return immune.size
    ? out.filter((m) => !immune.has(m.target) || !isPlayerCard(game, m.source))
    : out;
}

/** an asset, event, skill or investigator: a player card, by its type (Grimoire, Card Types) */
export function isPlayerCard(game: GameContext, id: string | null | undefined): boolean {
  if (!id || !cardRecIf(game, id)) return false;
  return isOneOf(def(game, id).type, "asset", "event", "skill", "investigator");
}

/** the card is immune to the effects of `source` (Realms Beyond: Yog-Sothoth is immune to player card effects) */
export const immuneTo = (game: GameContext, target: string, source: string | null | undefined) =>
  isPlayerCard(game, source) && hasFlag(game, target, "immuneToPlayerCards");

/** where a modifier's source is: its controller's location, the location itself, or where the enemy or attachment is */
const sourceLocation = (game: GameContext, c: CardInst): InstId | null =>
  // a player card attached to a location is there, wherever its controller goes (Hiding Spot)
  (c.zone === "attached" && !c.attachedTo
    ? c.location
    : c.controller
      ? invRecIf(game, c.controller)?.location
      : c.zone === "location"
        ? c.id
        : c.zone === "enemy" || c.zone === "attached"
          ? c.location
          : null) ?? null;

function scopeTargets(game: GameContext, c: CardInst, mod: Modifier): string[] {
  switch (mod.scope ?? "controller") {
    case "controller":
      return c.controller ? [c.controller] : [];
    case "investigatorsAtLocation":
      return invsAt(game, sourceLocation(game, c));
    case "enemiesAtLocation":
      // a keyword granted to some of them only (Hiding Spot: "each non-[[Elite]] enemy … gains aloof")
      return enemiesAt(game, sourceLocation(game, c))
        .filter((e) => !mod.keyword || !mod.filter || matchesFilter(game, e.code, mod.filter))
        .map((e) => e.id);
    case "attachedLocation":
      return c.location ? [c.location] : [];
    case "self":
      return [c.id];
    case "allEnemies":
      return enemies(game).map((e) => e.id);
    case "tester":
      return game.s.skillTest ? [game.s.skillTest.inv] : [];
  }
}

function modApplies(game: GameContext, mod: Modifier, target: string): boolean {
  // an enemy's fight or evade with a filter: only while the test against it uses a card matching it (Avian Thrall)
  if (mod.filter && (mod.stat === "fight" || mod.stat === "evade")) {
    const t = game.s.skillTest;
    const src = t?.source ? cardRecIf(game, t.source) : undefined;
    return !!t && t.target === target && !!src && matchesFilter(game, src.code, mod.filter);
  }
  const when = mod.when ?? "always";
  if (when === "always") return true;
  const t = game.s.skillTest;
  if (!t || t.inv !== target) return false;
  if (when === "skillTest") return true;
  return (
    (when === "investigating" && t.kind === "investigate") ||
    (when === "fighting" && t.kind === "fight") ||
    (when === "evading" && t.kind === "evade") ||
    (when === "parleying" && !!t.ctx.parley)
  );
}

export function modSum(
  game: GameContext,
  target: string,
  stat: ModStat,
  mods = allMods(game),
): number {
  let sum = 0;
  for (const m of mods) {
    if (m.target !== target || m.mod.stat !== stat || !modApplies(game, m.mod, target)) continue;
    sum += (m.mod.value ?? 0) * (m.mod.perInvestigator ? playerCount(game) : 1);
  }
  return sum;
}

export const hasFlag = (
  game: GameContext,
  target: string,
  flag: Modifier["flag"],
  mods = allMods(game),
) =>
  mods.some((m) => m.target === target && m.mod.flag === flag && modApplies(game, m.mod, target));

/** the card may ready: not an asset whose controller's assets cannot ready (Wracked by Nightmares) */
export function canReady(game: GameContext, id: InstId, mods = allMods(game)): boolean {
  const c = card(game, id);
  return !(
    def(game, id).type === "asset" &&
    !!c.controller &&
    hasFlag(game, c.controller, "assetsCannotReady", mods)
  );
}

/** clues may be placed on the location (Ascending the Hill: not on non-[[Altered]] ones) */
export const canPlaceClues = (game: GameContext, loc: InstId) =>
  !hasFlag(game, loc, "cannotPlaceClues");

/** the investigator can't gain resources: forbidden outright (Museum Entrance), or by an engaged enemy (O'Bannion's Thug) */
export function cannotGainResources(game: GameContext, i: InvId): boolean {
  const mods = allMods(game);
  return (
    hasFlag(game, i, "cannotGainResources", mods) ||
    engagedWith(game, i).some((e) => hasFlag(game, e.id, "cannotGainResourcesWhileEngaged", mods))
  );
}

/** no card may leave the investigator's discard pile: their own flag, or an enemy engaged with them (Graveyard Ghouls) */
export function discardLocked(game: GameContext, i: InvId): boolean {
  const mods = allMods(game);
  return (
    hasFlag(game, i, "cardsCannotLeaveDiscard", mods) ||
    engagedWith(game, i).some((e) => hasFlag(game, e.id, "cardsCannotLeaveDiscard", mods))
  );
}

/** the modifiers in effect for an investigator, less those of cards whose text they ignore ("Jazz" Mulligan) */
export function modsFor(game: GameContext, i: InvId): AppliedMod[] {
  const ignored = new Set<InstId>();
  for (const c of cardsInAny(game, MOD_ZONES)) {
    const fn = scriptOf(game.db, c.code)?.ignores;
    if (fn) for (const id of fn(game, c.id, i)) ignored.add(id);
  }
  return allMods(game).filter((m) => !m.source || !ignored.has(m.source));
}

/** the skill cards an investigator owns committed to the skill test under way (Try and Try Again) */
export const committedSkillsOf = (game: GameContext, i: InvId | null | undefined): InstId[] =>
  (game.s.skillTest?.committed ?? []).filter(
    (c) =>
      !!i &&
      cardRecIf(game, c)?.zone === ZONE.Commit &&
      cardRecIf(game, c)?.owner === i &&
      def(game, c).type === "skill",
  );

/** the printed value, or what a card in play raises it to (The Red-Gloved Man) */
export function baseSkill(game: GameContext, i: InvId, skill: Skill): number {
  const printed = def(game, inv(game, i).cardId).skills![skill];
  let v = printed;
  for (const [id, r] of Object.entries(baseRaised.get(game) ?? {})) {
    const c = cardRecIf(game, id);
    if (c?.zone === ZONE.Play && c.controller === i && r.skills.includes(skill))
      v = Math.max(v, r.to);
  }
  return v;
}

export function skillValue(game: GameContext, i: InvId, skill: Skill): number {
  const mods = allMods(game);
  let v = baseSkill(game, i, skill) + modSum(game, i, skill, mods);
  if (
    (skill === "combat" || skill === "agility") &&
    hasFlag(game, i, "intellectForCombatAndAgility", mods)
  ) {
    v = Math.max(v, baseSkill(game, i, "intellect") + modSum(game, i, "intellect", mods));
  }
  return Math.max(0, v);
}

export const maxHealth = (game: GameContext, i: InvId) =>
  (def(game, inv(game, i).cardId).health ?? 0) + modSum(game, i, "health");
export const maxSanity = (game: GameContext, i: InvId) =>
  (def(game, inv(game, i).cardId).sanity ?? 0) + modSum(game, i, "sanity");
export const remainingHealth = (game: GameContext, i: InvId) =>
  maxHealth(game, i) - inv(game, i).damage;
/** never below 0: in Dim Carcosa horror may exceed sanity, and "remaining sanity" is then 0 */
export const remainingSanity = (game: GameContext, i: InvId) =>
  Math.max(0, maxSanity(game, i) - inv(game, i).horror);

export function enemyStat(
  game: GameContext,
  id: InstId,
  stat: "fight" | "evade" | "damage" | "horror" | "health",
): number {
  const e = def(game, id).enemy!;
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
  if (stat === "health" && e.healthPerInvestigator) base *= playerCount(game);
  return Math.max(0, base + modSum(game, id, modStat));
}

export function shroud(game: GameContext, loc: InstId): number {
  const base = def(game, loc).shroud;
  if (base === null) return Infinity; // the text defines it: can't be investigated
  return Math.max(0, (base ?? 0) + modSum(game, loc, "shroud"));
}

export function addTempMod(
  game: GameContext,
  mod: Modifier,
  target: string,
  until: "test" | "turn" | "phase" | "round",
  source: InstId | null = null,
  /** it ends with the next attack against its target enemy, if that comes first (Expose Weakness) */
  nextAttack?: boolean,
  /** it ends with its target's next skill test, or the next card they play it applies to (Fieldwork, Improvisation) */
  next?: "test" | "play",
) {
  game.s.tempMods.push({
    id: game.s.seq++,
    mod,
    target,
    until,
    source,
    ...(nextAttack ? { nextAttack: true as const } : {}),
    ...(next ? { next } : {}),
  });
}
/** the modifiers "of the next card you play" that this card, played by `i`, spends (Improvisation) */
export function endNextPlayMods(game: GameContext, i: InvId, code: string) {
  game.s.tempMods = game.s.tempMods.filter(
    (m) =>
      !(
        m.next === "play" &&
        m.target === i &&
        (!m.mod.filter || matchesFilter(game, code, m.mod.filter))
      ),
  );
}
/** the temporary modifiers a card's effect gave end now ("while resolving that card's revelation": "Let me handle this!") */
export function removeTempMods(game: GameContext, source: InstId) {
  game.s.tempMods = game.s.tempMods.filter((m) => m.source !== source);
}
export function expireMods(game: GameContext, until: "test" | "turn" | "phase" | "round") {
  game.s.tempMods = game.s.tempMods.filter((t) => t.until !== until);
}

// ---------- costs ----------
export function canPay(
  game: GameContext,
  i: InvId,
  cardId: InstId,
  cost: Cost | undefined,
): boolean {
  if (!cost) return true;
  const c = card(game, cardId);
  const me = inv(game, i);
  if (cost.exhaust && c.exhausted) return false;
  if (cost.uses && c.uses < cost.uses) return false;
  if (cost.resources && me.resources < cost.resources) return false;
  if (
    cost.resourcesPerInvestigator &&
    me.resources < cost.resourcesPerInvestigator * playerCount(game)
  )
    return false;
  if (cost.resourcesOrUses && c.uses < cost.resourcesOrUses && me.resources < cost.resourcesOrUses)
    return false;
  if (cost.clues && (me.clues < cost.clues || hasFlag(game, i, "cannotSpendClues"))) return false;
  if (cost.cluesPerInvestigator) {
    const total = activeInvs(game).reduce((n, x) => n + inv(game, x).clues, 0);
    if (total < cost.cluesPerInvestigator * playerCount(game)) return false;
  }
  if (cost.discardFromHand && me.hand.filter((h) => h !== cardId).length < cost.discardFromHand)
    return false;
  if (cost.actions && actionsLeft(game, i) < cost.actions) return false;
  return true;
}

// ---------- conditions ----------

/** the actions the investigator has left in their turn (none outside it, or for no one) */
export const actionsLeft = (game: GameContext, i: InvId | null) =>
  !!i && game.s.active === i && game.s.phase === "investigation" ? invRec(game, i).actionsLeft : 0;

/** how many of these facts the scenario remembers ("remember that you …") */
export const rememberedCount = (game: GameContext, keys: readonly string[]) =>
  keys.filter((k) => rememberedFact.get(game, k)).length;

export function checkCondition(game: GameContext, c: Condition, ctx: EffCtx): boolean {
  const you = ctx.you ?? null;
  const yourLoc = you ? (invRecIf(game, you)?.location ?? null) : null;
  if ("all" in c) return c.all.every((x) => checkCondition(game, x, ctx));
  if ("any" in c) return c.any.some((x) => checkCondition(game, x, ctx));
  if ("not" in c) return !checkCondition(game, c.not, ctx);
  if ("yourTurn" in c) return game.s.active === you && game.s.phase === "investigation";
  if ("cluesOnYourLocation" in c) {
    const n = yourLoc ? card(game, yourLoc).clues : 0;
    return c.cluesOnYourLocation === "none" ? n === 0 : n > 0;
  }
  if ("youHaveClues" in c) {
    const n = you ? inv(game, you).clues : 0;
    return c.youHaveClues === "none" ? n === 0 : n > 0;
  }
  if ("enemyAtYourLocation" in c) {
    const f = c.enemyAtYourLocation;
    return enemiesAt(game, yourLoc).some((e) => f === true || matchesFilter(game, e.code, f));
  }
  if ("enemyInPlay" in c)
    return allCardRecs(game).some(
      (x) => x.zone === "enemy" && matchesFilter(game, x.code, c.enemyInPlay),
    );
  if ("exhaustedEnemyAtYourLocation" in c) return enemiesAt(game, yourLoc).some((e) => e.exhausted);
  if ("onlyEngagedEnemy" in c)
    return (
      !!you && engagedWith(game, you).length === 1 && engagedWith(game, you)[0].id === ctx.enemy
    );
  if ("eventEnemy" in c)
    return !!ctx.enemy && matchesFilter(game, card(game, ctx.enemy).code, c.eventEnemy);
  if ("eventInvestigatorIsYou" in c) return ctx.inv === you;
  if ("eventAtYourLocation" in c) {
    const evLoc = ctx.location ?? (ctx.inv ? invRecIf(game, ctx.inv)?.location : null);
    return !!evLoc && evLoc === yourLoc;
  }
  if ("testKind" in c) return game.s.skillTest?.kind === c.testKind;
  if ("failedBy" in c)
    return (
      ctx.failBy !== undefined &&
      ctx.failBy >= (c.failedBy.min ?? 0) &&
      ctx.failBy <= (c.failedBy.max ?? Infinity)
    );
  if ("succeededBy" in c) return ctx.succeedBy !== undefined && ctx.succeedBy >= c.succeededBy.min;
  if ("tokenIs" in c) return !!ctx.token && c.tokenIs.includes(ctx.token);
  if ("tokenNegative" in c) return !!ctx.token && ctx.token.startsWith("-");
  if ("resources" in c) return !!you && inv(game, you).resources >= c.resources.min;
  if ("assetInPlay" in c)
    return !!you && controlled(game, you).some((a) => matchesFilter(game, a.code, c.assetInPlay));
  if ("controlsCard" in c)
    return !!you && controlled(game, you).some((a) => a.code === c.controlsCard);
  if ("scenarioFlag" in c) return !!named(game, c.scenarioFlag);
  if ("phase" in c) return game.s.phase === c.phase;
  if ("selfHasClues" in c) return !!ctx.source && card(game, ctx.source).clues > 0;
  if ("selfHasHorror" in c) return !!ctx.source && card(game, ctx.source).horror > 0;
  if ("engaged" in c) return !!you && engagedWith(game, you).length > 0;
  if ("yourSkillTest" in c) return !!game.s.skillTest && game.s.skillTest.inv === you;
  if ("eventCard" in c)
    return (
      !!ctx.card &&
      !!cardRecIf(game, ctx.card) &&
      matchesFilter(game, card(game, ctx.card).code, c.eventCard)
    );
  if ("firstAction" in c)
    return !!you && game.s.active === you && inv(game, you).actionsTaken === 0;
  if ("eventSource" in c)
    return (
      !!ctx.card &&
      !!cardRecIf(game, ctx.card) &&
      matchesFilter(game, card(game, ctx.card).code, c.eventSource)
    );
  if ("eventFromYourLocation" in c) return !!ctx.from && ctx.from === yourLoc;
  if ("eventEnemyInPlay" in c) return !!ctx.enemy && cardRecIf(game, ctx.enemy)?.zone === "enemy";
  if ("enemyNearby" in c) {
    if (!yourLoc) return false;
    const d = distances(game, yourLoc);
    return enemies(game).some(
      (e) =>
        !!e.location &&
        (d.get(e.location) ?? Infinity) <= c.enemyNearby.range &&
        (!c.enemyNearby.nonElite || !isElite(game, e.id)),
    );
  }
  if ("defeatedHealthThisTurn" in c)
    return !!you && inv(game, you).defeatedHealth >= c.defeatedHealthThisTurn.min;
  if ("testSource" in c) {
    const src = game.s.skillTest?.source;
    return (
      !!src && !!cardRecIf(game, src) && matchesFilter(game, card(game, src).code, c.testSource)
    );
  }
  if ("remainingSanity" in c) {
    const n = you ? remainingSanity(game, you) : 0;
    return !!you && n >= (c.remainingSanity.min ?? 0) && n <= (c.remainingSanity.max ?? Infinity);
  }
  if ("selfHasDoom" in c) return !!ctx.source && card(game, ctx.source).doom > 0;
  if ("investigatorsAtThisLocation" in c) {
    const src = ctx.source ? cardRecIf(game, ctx.source) : undefined;
    const here = src ? (src.zone === ZONE.Location ? src.id : src.location) : null;
    const n = invsAt(game, here ?? null).length;
    const want = c.investigatorsAtThisLocation;
    return n >= (want.min ?? 0) && n <= (want.max ?? Infinity);
  }
  if ("inThreatArea" in c)
    return !!you && threatArea(game, you).some((x) => matchesFilter(game, x.code, c.inThreatArea));
  if ("eventEnemyExhausted" in c) return !!ctx.enemy && !!cardRecIf(game, ctx.enemy)?.exhausted;
  if ("eventEnemyAttackedYouThisRound" in c)
    return !!ctx.enemy && !!you && attacked.get(game, [ctx.enemy, you]) === game.s.round;
  if ("defeatedVia" in c) return ctx.via === c.defeatedVia;
  if ("eventCardIsSelf" in c) return !!ctx.card && ctx.card === ctx.source;
  if ("canPay" in c) return !!you && !!ctx.source && canPay(game, you, ctx.source, c.canPay);
  if ("tokens" in c) {
    const h = tokenHolder(game, c.tokens.on, ctx);
    const n = h ? tokensOn(game, h, c.tokens.name) : 0;
    return n >= (c.tokens.min ?? 0) && n <= (c.tokens.max ?? Infinity);
  }
  if ("horror" in c) {
    const n = you ? inv(game, you).horror : 0;
    return !!you && n >= (c.horror.min ?? 0) && n <= (c.horror.max ?? Infinity);
  }
  if ("damage" in c) {
    const n = you ? inv(game, you).damage : 0;
    return !!you && n >= (c.damage.min ?? 0) && n <= (c.damage.max ?? Infinity);
  }
  if ("beneath" in c) {
    const n = beneathCount(game, c.beneath.of, ctx);
    return n >= (c.beneath.min ?? 0) && n <= (c.beneath.max ?? Infinity);
  }
  if ("testTokens" in c) return !!game.s.skillTest?.tokens.some((t) => c.testTokens.includes(t));
  if ("discardPile" in c) {
    const n = you ? inv(game, you).discard.length : 0;
    return !!you && n >= (c.discardPile.min ?? 0) && n <= (c.discardPile.max ?? Infinity);
  }
  if ("testSkill" in c) return game.s.skillTest?.skill === c.testSkill;
  if ("players" in c) {
    const n = playerCount(game);
    return n >= (c.players.min ?? 0) && n <= (c.players.max ?? Infinity);
  }
  if ("yourLocationIs" in c)
    return !!yourLoc && matchesFilter(game, card(game, yourLoc).code, c.yourLocationIs);
  if ("agendaStage" in c) {
    const agenda = currentAgenda(game);
    const n = agenda ? (def(game, agenda).stage ?? 0) : 0;
    return n >= (c.agendaStage.min ?? 0) && n <= (c.agendaStage.max ?? Infinity);
  }
  if ("actionsLeft" in c) {
    const n = actionsLeft(game, you);
    return !!you && n >= (c.actionsLeft.min ?? 0) && n <= (c.actionsLeft.max ?? Infinity);
  }
  if ("eventAtThisLocation" in c) {
    // this location, or where this enemy (or card at a location) is
    const src = ctx.source ? cardRecIf(game, ctx.source) : undefined;
    const here = src?.zone === ZONE.Location ? src.id : src?.location;
    return !!ctx.inv && !!here && invRecIf(game, ctx.inv)?.location === here;
  }
  if ("testSourceIsSelf" in c) return !!ctx.source && game.s.skillTest?.source === ctx.source;
  if ("testEnemyEngagedWithYou" in c) {
    const target = game.s.skillTest?.target;
    return !!you && !!target && cardRecIf(game, target)?.engagedWith === you;
  }
  if ("testEnemyEngagedWithOther" in c) {
    const target = game.s.skillTest?.target;
    const engaged = target ? cardRecIf(game, target)?.engagedWith : null;
    return !!engaged && engaged !== you;
  }
  if ("committedSkillYouOwn" in c) return committedSkillsOf(game, you).length > 0;
  if ("resignInPlay" in c)
    return cardsInAny(game, MOD_ZONES).some(
      (x) =>
        !x.owner &&
        (x.zone !== ZONE.Location || x.revealed) &&
        abilitiesOf(game, x.id).some((a) => a.designator === "resign"),
    );
  if ("aloneAtYourLocation" in c) return !!you && invsAt(game, yourLoc).every((i) => i === you);
  if ("cardsInHand" in c) {
    const n = you ? inv(game, you).hand.length : 0;
    return !!you && n >= (c.cardsInHand.min ?? 0) && n <= (c.cardsInHand.max ?? Infinity);
  }
  if ("enemyNotEngagedWithYou" in c)
    return !!you && enemiesAt(game, yourLoc).some((e) => e.engagedWith !== you);
  if ("rememberedCount" in c) {
    const n = rememberedCount(game, c.rememberedCount.of);
    return n >= (c.rememberedCount.min ?? 0) && n <= (c.rememberedCount.max ?? Infinity);
  }
  if ("enemyWithDoom" in c)
    return c.enemyWithDoom === "testEnemy"
      ? !!ctx.enemy && (cardRecIf(game, ctx.enemy)?.doom ?? 0) > 0
      : enemiesAt(game, yourLoc).some((e) => e.doom > 0);
  if ("eventAmount" in c)
    return (
      ctx.x !== undefined &&
      ctx.x >= (c.eventAmount.min ?? 0) &&
      ctx.x <= (c.eventAmount.max ?? Infinity)
    );
  if ("cluesOnThisLocation" in c) {
    const src = ctx.source ? cardRecIf(game, ctx.source) : undefined;
    const here = src ? (src.zone === ZONE.Location ? src.id : src.location) : null;
    const n = here ? card(game, here).clues : 0;
    return !!here && (c.cluesOnThisLocation === "none" ? n === 0 : n > 0);
  }
  if ("hiddenCardsInHand" in c) {
    const n = you ? inv(game, you).hand.filter((h) => isHidden(game, h)).length : 0;
    return (
      !!you && n >= (c.hiddenCardsInHand.min ?? 0) && n <= (c.hiddenCardsInHand.max ?? Infinity)
    );
  }
  if ("actionThisTurn" in c)
    return !!you && inv(game, you).actionsThisRound.includes(c.actionThisTurn);
  if ("enemyAtThisLocation" in c) {
    const src = ctx.source ? cardRecIf(game, ctx.source) : undefined;
    const here = src ? (src.zone === ZONE.Location ? src.id : src.location) : null;
    const want = c.enemyAtThisLocation.exhausted;
    return !!here && enemiesAt(game, here).some((e) => want === undefined || e.exhausted === want);
  }
  if ("attackOfOpportunity" in c) return !!ctx.aoo;
  if ("defeatCause" in c) return !!ctx.cause && c.defeatCause.includes(ctx.cause);
  if ("anyTurn" in c) return !!game.s.active && game.s.phase === "investigation";
  if ("enteredPlayThisTurn" in c) {
    // the card was played (and so entered play) since the current turn began
    const turn = game.s.log.findLastIndex((e) => e.type === "turn");
    return (
      !!game.s.active &&
      turn >= 0 &&
      game.s.log.slice(turn).some((e) => e.type === "play" && e.card === ctx.source)
    );
  }
  if ("script" in c) {
    const own = ctx.source ? cardRecIf(game, ctx.source)?.code : undefined;
    const fn = conditionFor(game.db, game.s.scenarioId, own, c.script);
    return !!fn?.(game, ctx);
  }
  if ("controlled" in c)
    return !!ctx.source && !!card(game, ctx.source).controller === c.controlled;
  if ("exhausted" in c) return !!ctx.source && card(game, ctx.source).exhausted === c.exhausted;
  return false;
}

/** the card a beneath pile is named by: this card, the current act or agenda, the scenario card, your location */
export function holderOf(game: GameContext, of: BeneathOf, ctx: EffCtx): InstId | null {
  switch (of) {
    case "self":
      return ctx.source ?? null;
    case "act":
      return currentAct(game);
    case "agenda":
      return currentAgenda(game);
    case "scenario":
      return SCENARIO_CARD;
    case "yourLocation":
      return ctx.you ? inv(game, ctx.you).location : null;
  }
}
/** who holds named tokens: this card, you, your location */
export function tokenHolder(game: GameContext, on: TokenHolder, ctx: EffCtx): string | null {
  if (on === "self") return ctx.source ?? null;
  if (on === "you") return ctx.you ?? null;
  return ctx.you ? inv(game, ctx.you).location : null;
}
/** how many cards lie beneath the card a pile is named by */
export const beneathCount = (game: GameContext, of: BeneathOf, ctx: EffCtx): number => {
  const h = holderOf(game, of, ctx);
  return h ? cardsBeneath(game, h).length : 0;
};

/** the locations an enemy may spawn at by a spawn expression, from the drawer's location (shared with Patrol) */
export function spawnTargets(
  game: GameContext,
  expr: Exclude<Spawn, string>,
  from: InstId | null,
): InstId[] {
  if (expr.or)
    return [
      ...new Set(
        expr.or.flatMap((x) => (typeof x === "string" ? [] : spawnTargets(game, x, from))),
      ),
    ];
  let out = locations(game).filter(
    (l) =>
      (!expr.name || def(game, l.id).name === expr.name) &&
      (!expr.trait || def(game, l.id).traits.includes(expr.trait)) &&
      (!expr.empty || (invsAt(game, l.id).length === 0 && !enemiesAt(game, l.id).length)) &&
      (!expr.noElite || !enemiesAt(game, l.id).some((e) => isElite(game, e.id))) &&
      (!expr.clues || l.clues > 0) &&
      (!expr.enemyTrait ||
        enemiesAt(game, l.id).some((e) => def(game, e.id).traits.includes(expr.enemyTrait!))) &&
      (!expr.connected || (!!from && connections(game, from).includes(l.id))),
  );
  if (expr.mostClues && out.length) {
    const most = Math.max(...out.map((l) => l.clues));
    out = out.filter((l) => l.clues === most);
  }
  if (expr.unrevealed === "ifAble" && out.some((l) => !l.revealed))
    out = out.filter((l) => !l.revealed);
  if ((expr.nearest || expr.farthest) && out.length) {
    const to = expr.to ?? "you";
    // the places measured from: the drawer's location, or every location holding (or being) a card of that code or trait
    const origins =
      to === "you"
        ? from
          ? [from]
          : []
        : to === "investigators"
          ? activeInvs(game).flatMap((i) => inv(game, i).location ?? [])
          : allCards(game)
              .filter((c) =>
                "code" in to ? c.code === to.code : def(game, c.id).traits.includes(to.trait),
              )
              .map((c) => (c.zone === ZONE.Location ? c.id : c.location))
              .filter((x): x is InstId => !!x);
    const maps = origins.map((o) => distances(game, o));
    const d = (l: InstId) => Math.min(...maps.map((m) => m.get(l) ?? Infinity));
    if (maps.length) {
      const best = expr.nearest
        ? Math.min(...out.map((l) => d(l.id)))
        : Math.max(...out.map((l) => d(l.id)));
      out = out.filter((l) => d(l.id) === best);
    }
  }
  return out.map((l) => l.id);
}

/** of these investigators, those nearest to a card in play matching the filter (Prey - nearest to a Cultist) */
export function nearestTo(game: GameContext, filter: CardFilter, candidates: InvId[]): InvId[] {
  const places = allCards(game)
    .filter((c) => isInPlayZone(c.zone) && matchesFilter(game, c.code, filter))
    .map((c) => (c.zone === ZONE.Location ? c.id : c.location))
    .filter((x): x is InstId => !!x);
  if (!places.length) return candidates;
  const maps = places.map((p) => distances(game, p));
  const d = (i: InvId) => {
    const loc = inv(game, i).location;
    return loc ? Math.min(...maps.map((m) => m.get(loc) ?? Infinity)) : Infinity;
  };
  const best = Math.min(...candidates.map(d));
  return candidates.filter((i) => d(i) === best);
}
const isInPlayZone = (z: string) =>
  z === ZONE.Enemy || z === ZONE.Location || z === ZONE.Play || z === ZONE.Attached;

/** the swarm cards of a swarming enemy: the player cards facedown beneath it, top first */
export const swarmOf = (game: GameContext, host: InstId): InstId[] =>
  cardsBeneath(game, host).filter((id) => !!card(game, id).owner);

/** an investigator's bonded cards waiting set aside (of this code, when given) */
export const bondedOf = (game: GameContext, i: InvId, code?: string) =>
  cardsIn(game, ZONE.SetAside).filter(
    (c) =>
      c.owner === i &&
      (!code || c.code === code) &&
      def(game, c.id).keywords.some((k) => typeof k === "object" && "bonded" in k),
  );

/** a location named in data: this card ("self"), your location ("yourLocation"), or the first location in play of a code */
export function locationRef(game: GameContext, ref: string, ctx: EffCtx): InstId | null {
  if (ref === "self") return ctx.source ?? null;
  if (ref === "yourLocation") return ctx.you ? inv(game, ctx.you).location : null;
  return locations(game).find((l) => l.code === ref)?.id ?? null;
}
/** the cell a placement names, when it names one cell (not a choice, not "free"); null when it can't be had */
export function placementCell(
  game: GameContext,
  at: Placement,
  ctx: EffCtx,
): [number, number] | null {
  if (Array.isArray(at)) return at;
  if (typeof at === "object" && "direction" in at) {
    const of = locationRef(game, at.of, ctx);
    const c = of ? cellOf(game, of) : null;
    return c ? cellToward(c, at.direction) : null;
  }
  return null;
}
