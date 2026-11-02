import { attacked, connections as connectionsAdded, named } from "./world/flags";
import type {
  Ability,
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
  GameState,
  InstId,
  InvId,
  Zone,
} from "./world/types";
import { activeInvs, card, def, defOf, inv, playerCount } from "./context";
import { ZONE, isOneOf } from "./world/constants";

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
export const isElite = (game: GameContext, id: InstId) => hasTrait(game, id, "Elite");
export const hasKeyword = (game: GameContext, id: InstId, kw: CardDef["keywords"][number]) =>
  def(game, id).keywords.includes(kw);
/** an aloof enemy can only be attacked while it is engaged with an investigator */
export const attackable = (game: GameContext, id: InstId) =>
  !hasKeyword(game, id, "aloof") || !!cardRecIf(game, id)?.engagedWith;
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
/** clues the act asks for, as a group (Infinity when it has none to spend) */
export function actClueCost(game: GameContext): number {
  if (!game.s.act) return Infinity;
  const d = def(game, game.s.act);
  if (!d.actClues) return Infinity;
  return d.actClues * (d.actCluesPerInvestigator ? game.s.order.length : 1);
}
/** clues the group may spend (Masked Hunter blocks engaged investigators) */
export function spendableGroupClues(game: GameContext) {
  return activeInvs(game)
    .filter((x) => !hasFlag(game, x, "cannotSpendClues"))
    .reduce((n, x) => n + inv(game, x).clues, 0);
}
/** the group can advance the act by spending clues, in any player window (Grimoire, Act Deck and Agenda Deck) */
export const canAdvanceAct = (game: GameContext) =>
  !!game.s.act &&
  (def(game, game.s.act).actAdvance ?? "turn") === "turn" &&
  spendableGroupClues(game) >= actClueCost(game);
export const isMassive = (game: GameContext, id: InstId) => hasKeyword(game, id, "massive");
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
  return true;
}

// ---------- map ----------
export function connections(game: GameContext, loc: InstId): InstId[] {
  const scen = game.db.scenarios[game.s.scenarioId];
  const code = card(game, loc).code;
  const extra = connectionsAdded.get(game) ?? [];
  const codes = new Set<string>();
  for (const [a, b] of [...scen.connections, ...extra]) {
    if (a === code) codes.add(b);
    if (b === code) codes.add(a);
  }
  for (const [a, b] of scen.oneWay ?? []) if (a === code) codes.add(b);
  return locations(game)
    .filter((l) => codes.has(l.code) && l.id !== loc)
    .map((l) => l.id);
}

/** connections() for read-only callers (the UI) that hold a state rather than an engine context */
export const connectionsOf = (db: ContentDb, s: GameState, loc: InstId): InstId[] =>
  connections({ s, db, events: [] }, loc);

/** BFS distances from a location */
export function distances(game: GameContext, from: InstId): Map<InstId, number> {
  const dist = new Map<InstId, number>([[from, 0]]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of connections(game, cur)) {
      if (!dist.has(n)) {
        dist.set(n, dist.get(cur)! + 1);
        q.push(n);
      }
    }
  }
  return dist;
}

/** next location on a shortest path from `from` toward any of `targets` (all ties) */
export function stepsToward(game: GameContext, from: InstId, targets: InstId[]): InstId[] {
  if (targets.includes(from)) return [];
  let best = Infinity;
  const options: InstId[] = [];
  for (const n of connections(game, from)) {
    const d = distances(game, n);
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
export function cardBlocked(game: GameContext, i: InvId, cardId: InstId): boolean {
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
    const fn = game.db.scripts[c.code]?.blanks;
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
  const script = game.db.scripts[c.code];
  return [...def(game, id).abilities, ...(script?.abilities ?? [])];
}

/** all modifiers currently in effect */
export function allMods(game: GameContext): AppliedMod[] {
  const out: AppliedMod[] = [];
  const blanked = blankedCards(game);
  for (const c of cardsInAny(game, MOD_ZONES)) {
    const abilities = c.zone === "location" && !c.revealed ? [] : abilitiesOf(game, c.id, blanked);
    for (const a of abilities) {
      if (a.kind !== "constant" || !a.modifiers) continue;
      if (a.condition && !checkCondition(game, a.condition, { source: c.id, you: c.controller }))
        continue;
      for (const mod of a.modifiers)
        for (const target of scopeTargets(game, c, mod)) out.push({ target, mod, source: c.id });
    }
    const script = game.db.scripts[c.code];
    if (script?.modifiers && !blanked.has(c.id))
      for (const m of script.modifiers(game, c.id)) out.push({ ...m, source: c.id });
  }
  for (const t of game.s.tempMods) out.push({ target: t.target, mod: t.mod, source: t.source });
  return out;
}

function scopeTargets(game: GameContext, c: CardInst, mod: Modifier): string[] {
  switch (mod.scope ?? "controller") {
    case "controller":
      return c.controller ? [c.controller] : [];
    case "investigatorsAtLocation": {
      const loc = c.controller
        ? invRecIf(game, c.controller)?.location
        : c.zone === "location"
          ? c.id
          : c.zone === "enemy" || c.zone === "attached"
            ? c.location
            : null;
      return invsAt(game, loc ?? null);
    }
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
  const when = mod.when ?? "always";
  if (when === "always") return true;
  const t = game.s.skillTest;
  if (!t || t.inv !== target) return false;
  if (when === "skillTest") return true;
  return (
    (when === "investigating" && t.kind === "investigate") ||
    (when === "fighting" && t.kind === "fight") ||
    (when === "evading" && t.kind === "evade")
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

export function baseSkill(game: GameContext, i: InvId, skill: Skill): number {
  return def(game, inv(game, i).cardId).skills![skill];
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
export const remainingSanity = (game: GameContext, i: InvId) =>
  maxSanity(game, i) - inv(game, i).horror;

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
) {
  game.s.tempMods.push({ id: game.s.seq++, mod, target, until, source });
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
  return true;
}

// ---------- conditions ----------

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
  if ("failedBy" in c) return ctx.failBy !== undefined && ctx.failBy <= c.failedBy.max;
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
  if ("remainingSanity" in c) return !!you && remainingSanity(game, you) <= c.remainingSanity.max;
  if ("eventEnemyExhausted" in c) return !!ctx.enemy && !!cardRecIf(game, ctx.enemy)?.exhausted;
  if ("eventEnemyAttackedYouThisRound" in c)
    return !!ctx.enemy && !!you && attacked.get(game, [ctx.enemy, you]) === game.s.round;
  if ("eventCardIsSelf" in c) return !!ctx.card && ctx.card === ctx.source;
  if ("canPay" in c) return !!you && !!ctx.source && canPay(game, you, ctx.source, c.canPay);
  if ("testTokens" in c) return !!game.s.skillTest?.tokens.some((t) => c.testTokens.includes(t));
  if ("eventAtThisLocation" in c)
    return !!ctx.inv && !!ctx.source && invRecIf(game, ctx.inv)?.location === ctx.source;
  if ("script" in c) {
    const own = ctx.source ? cardRecIf(game, ctx.source)?.code : undefined;
    const fn =
      (own ? game.db.scripts[own]?.conditions?.[c.script] : undefined) ??
      game.db.scripts[game.s.scenarioId]?.conditions?.[c.script];
    return !!fn?.(game, ctx);
  }
  if ("controlled" in c)
    return !!ctx.source && !!card(game, ctx.source).controller === c.controlled;
  if ("exhausted" in c) return !!ctx.source && card(game, ctx.source).exhausted === c.exhausted;
  return false;
}
