import type { Ability, CardDef, CardFilter, Condition, Modifier, ModStat, Skill } from "../content/schema";
import type {
  CardInst, ChoiceOption, ContentDb, EffCtx, GameEvent, GameState, InstId, InvId, InvState, PendingChoice, Step, Zone,
} from "./types";

/** engine context passed to every rule: mutable (immer draft) state + static content */
export interface G {
  s: GameState;
  db: ContentDb;
  events: GameEvent[];
}

export const LOG_LIMIT = 300;

// ---------- basic accessors ----------
export const card = (g: G, id: InstId): CardInst => {
  const c = g.s.cards[id];
  if (!c) throw new Error(`no card instance ${id}`);
  return c;
};
export const def = (g: G, id: InstId): CardDef => defOf(g, card(g, id).code);
export const defOf = (g: G, code: string): CardDef => {
  const d = g.db.cards[code];
  if (!d) throw new Error(`no card def ${code}`);
  return d;
};
export const inv = (g: G, id: InvId): InvState => {
  const i = g.s.invs[id];
  if (!i) throw new Error(`no investigator ${id}`);
  return i;
};
export const name = (g: G, id: InstId) => def(g, id).name;
export const invName = (g: G, id: InvId) => g.s.invs[id]?.name ?? id;

export const activeInvs = (g: G): InvId[] => g.s.order.filter((i) => g.s.invs[i].status === "playing");
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
  emit(g, "step", who ? `${invName(g, who)}: ${step}` : step, { ...(who ? { inv: who } : {}), data: { step, phase: g.s.phase } });
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
  g: G, step: Step, invId: InvId, kind: PendingChoice["kind"], prompt: string, options: ChoiceOption[],
  opts: { auto?: boolean; key?: string; vars?: Record<string, string | number | null> } = {},
): T | undefined {
  if (step.choice !== undefined) return step.choice as T;
  if (options.length === 0) throw new Error(`no options for choice: ${prompt}`);
  if (opts.auto && options.length === 1) return options[0].value as T;
  g.s.pending = { seq: ++g.s.seq, inv: invId, kind, prompt, ...(opts.key ? { promptKey: opts.key, promptVars: opts.vars ?? {} } : {}), options, step: { ...step } };
  return undefined;
}

export function nextId(g: G) {
  return `c${g.s.nextId++}`;
}

/** create a new card instance (setup, or cards entering the game mid-scenario) */
export function createCard(g: G, code: string, zone: Zone, owner: InvId | null = null): InstId {
  if (!g.db.cards[code]) throw new Error(`unknown card ${code}`);
  const id = nextId(g);
  g.s.cards[id] = {
    id, code, owner, controller: owner, zone, exhausted: false, revealed: false,
    damage: 0, horror: 0, clues: 0, doom: 0, uses: 0, resources: 0, location: null, engagedWith: null, attachedTo: null,
  };
  if (zone === "hand" && owner) inv(g, owner).hand.push(id);
  if (zone === "deck" && owner) inv(g, owner).deck.push(id);
  if (zone === "encounterDeck") g.s.encounterDeck.push(id);
  return id;
}

// ---------- card movement ----------
const PILES = ["deck", "hand", "discard"] as const;

function removeFromPiles(g: G, id: InstId) {
  const s = g.s;
  const del = (arr: InstId[]) => {
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1);
  };
  for (const i of Object.values(s.invs)) for (const p of PILES) del(i[p]);
  del(s.encounterDeck);
  del(s.encounterDiscard);
  del(s.actDeck);
  del(s.agendaDeck);
  for (const d of Object.values(s.sideDecks)) del(d);
  if (s.act === id) s.act = null;
  if (s.agenda === id) s.agenda = null;
}

const IN_PLAY: Zone[] = ["play", "threat", "location", "enemy", "attached", "act", "agenda", "investigator"];
export const isInPlay = (c: CardInst) => IN_PLAY.includes(c.zone);

/** move a card instance to a zone; resets tokens when leaving play */
export function moveCard(g: G, id: InstId, zone: Zone, opts: { inv?: InvId | null; top?: boolean; location?: InstId | null } = {}) {
  const c = card(g, id);
  const leavingPlay = isInPlay(c) && !IN_PLAY.includes(zone);
  removeFromPiles(g, id);
  if (leavingPlay) {
    // discard attachments
    for (const other of Object.values(g.s.cards)) {
      if (other.attachedTo === id || (other.zone === "attached" && other.location === id && c.zone === "location")) {
        moveCard(g, other.id, other.owner ? "discard" : "encounterDiscard", { inv: other.owner });
      }
    }
    Object.assign(c, { exhausted: false, damage: 0, horror: 0, clues: 0, doom: 0, uses: 0, resources: 0, engagedWith: null, attachedTo: null });
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
      if (zone === "deck") at(inv(g, owner)[zone]);
      else if (zone === "discard") inv(g, owner).discard.push(id);
      else inv(g, owner).hand.push(id);
      break;
    case "encounterDeck":
      at(g.s.encounterDeck);
      break;
    case "encounterDiscard":
      g.s.encounterDiscard.push(id);
      break;
    case "act":
      g.s.act = id;
      break;
    case "agenda":
      g.s.agenda = id;
      break;
  }
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
export const cardsIn = (g: G, zone: Zone) => Object.values(g.s.cards).filter((c) => c.zone === zone);
export const locations = (g: G) => cardsIn(g, "location");
export const enemies = (g: G) => cardsIn(g, "enemy");
export const enemiesAt = (g: G, loc: InstId | null) => enemies(g).filter((e) => e.location === loc);
export const engagedWith = (g: G, i: InvId) => enemies(g).filter((e) => e.engagedWith === i || (isMassive(g, e.id) && e.location === g.s.invs[i]?.location && !e.exhausted));
export const invsAt = (g: G, loc: InstId | null) => activeInvs(g).filter((i) => g.s.invs[i].location === loc);
export const findByCode = (g: G, code: string, zones?: Zone[]) =>
  Object.values(g.s.cards).find((c) => c.code === code && (!zones || zones.includes(c.zone)));
export const locationByCode = (g: G, code: string) => findByCode(g, code, ["location"]);
export const locationByName = (g: G, nm: string) => locations(g).find((l) => def(g, l.id).name === nm);
export const hasTrait = (g: G, id: InstId, trait: string) => def(g, id).traits.includes(trait);
export const isElite = (g: G, id: InstId) => hasTrait(g, id, "Elite");
export const hasKeyword = (g: G, id: InstId, kw: CardDef["keywords"][number]) => def(g, id).keywords.includes(kw);
export const isMassive = (g: G, id: InstId) => hasKeyword(g, id, "massive");
export const controlled = (g: G, i: InvId) => cardsIn(g, "play").filter((c) => c.controller === i);
export const threatArea = (g: G, i: InvId) => cardsIn(g, "threat").filter((c) => c.controller === i);

export function matchesFilter(g: G, code: string, f: CardFilter): boolean {
  const d = defOf(g, code);
  const arr = <T,>(v: T | T[] | undefined) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);
  if (f.type && !arr(f.type)!.includes(d.type)) return false;
  if (f.trait && !arr(f.trait)!.some((t) => d.traits.includes(t))) return false;
  if (f.code && !arr(f.code)!.includes(code)) return false;
  if (f.unique !== undefined && d.unique !== f.unique) return false;
  if (f.weakness !== undefined && !!d.subtype !== f.weakness) return false;
  if (f.elite !== undefined && d.traits.includes("Elite") !== f.elite) return false;
  return true;
}

// ---------- map ----------
export function connections(g: G, loc: InstId): InstId[] {
  const scen = g.db.scenarios[g.s.scenarioId];
  const code = card(g, loc).code;
  const extra = (g.s.flags.connections as [string, string][] | undefined) ?? [];
  const codes = new Set<string>();
  for (const [a, b] of [...scen.connections, ...extra]) {
    if (a === code) codes.add(b);
    if (b === code) codes.add(a);
  }
  for (const [a, b] of scen.oneWay ?? []) if (a === code) codes.add(b);
  return locations(g).filter((l) => codes.has(l.code) && l.id !== loc).map((l) => l.id);
}

/** connections() for read-only callers (the UI) that hold a state rather than an engine context */
export const connectionsOf = (db: ContentDb, s: GameState, loc: InstId): InstId[] => connections({ s, db, events: [] }, loc);

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

const MOD_ZONES: Zone[] = ["play", "threat", "attached", "location", "enemy", "act", "agenda", "investigator"];

/** card instances whose text box is blank right now */
export function blankedCards(g: G): Set<InstId> {
  // blankText comes only from temporary effects (Mind Wipe) or card scripts (Stubborn Detective), never from constant abilities
  const out = new Set<InstId>();
  for (const t of g.s.tempMods) if (t.mod.flag === "blankText") out.add(t.target);
  for (const c of Object.values(g.s.cards)) {
    const fn = g.db.scripts[c.code]?.blanks;
    if (fn && MOD_ZONES.includes(c.zone)) for (const id of fn(g, c.id)) out.add(id);
  }
  return out;
}

export const isBlank = (g: G, id: InstId, blanked = blankedCards(g)) => blanked.has(id);

export function abilitiesOf(g: G, id: InstId, blanked?: Set<InstId>): (Ability & { run?: string })[] {
  if (isBlank(g, id, blanked)) return [];
  const c = card(g, id);
  const script = g.db.scripts[c.code];
  return [...def(g, id).abilities, ...(script?.abilities ?? [])];
}

/** all modifiers currently in effect */
export function allMods(g: G): AppliedMod[] {
  const out: AppliedMod[] = [];
  const blanked = blankedCards(g);
  for (const c of Object.values(g.s.cards)) {
    if (!MOD_ZONES.includes(c.zone)) continue;
    const abilities = c.zone === "location" && !c.revealed ? [] : abilitiesOf(g, c.id, blanked);
    for (const a of abilities) {
      if (a.kind !== "constant" || !a.modifiers) continue;
      if (a.condition && !checkCondition(g, a.condition, { source: c.id, you: c.controller })) continue;
      for (const mod of a.modifiers) for (const target of scopeTargets(g, c, mod)) out.push({ target, mod, source: c.id });
    }
    const script = g.db.scripts[c.code];
    if (script?.modifiers && !blanked.has(c.id)) for (const m of script.modifiers(g, c.id)) out.push({ ...m, source: c.id });
  }
  for (const t of g.s.tempMods) out.push({ target: t.target, mod: t.mod, source: t.source });
  return out;
}

function scopeTargets(g: G, c: CardInst, mod: Modifier): string[] {
  switch (mod.scope ?? "controller") {
    case "controller":
      return c.controller ? [c.controller] : [];
    case "investigatorsAtLocation": {
      const loc = c.controller ? g.s.invs[c.controller]?.location : c.zone === "location" ? c.id : null;
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
  if ((skill === "combat" || skill === "agility") && hasFlag(g, i, "intellectForCombatAndAgility", mods)) {
    v = Math.max(v, baseSkill(g, i, "intellect") + modSum(g, i, "intellect", mods));
  }
  return Math.max(0, v);
}

export const maxHealth = (g: G, i: InvId) => (def(g, inv(g, i).cardId).health ?? 0) + modSum(g, i, "health");
export const maxSanity = (g: G, i: InvId) => (def(g, inv(g, i).cardId).sanity ?? 0) + modSum(g, i, "sanity");
export const remainingHealth = (g: G, i: InvId) => maxHealth(g, i) - inv(g, i).damage;
export const remainingSanity = (g: G, i: InvId) => maxSanity(g, i) - inv(g, i).horror;

export function enemyStat(g: G, id: InstId, stat: "fight" | "evade" | "damage" | "horror" | "health"): number {
  const e = def(g, id).enemy!;
  const modStat: ModStat = stat === "health" ? "enemyHealth" : stat === "damage" ? "enemyDamage" : stat === "horror" ? "enemyHorror" : stat;
  let base = e[stat];
  if (stat === "health" && e.healthPerInvestigator) base *= playerCount(g);
  return Math.max(0, base + modSum(g, id, modStat));
}

export function shroud(g: G, loc: InstId): number {
  return Math.max(0, (def(g, loc).shroud ?? 0) + modSum(g, loc, "shroud"));
}

export function addTempMod(g: G, mod: Modifier, target: string, until: "test" | "turn" | "phase" | "round", source: InstId | null = null) {
  g.s.tempMods.push({ id: g.s.seq++, mod, target, until, source });
}
export function expireMods(g: G, until: "test" | "turn" | "phase" | "round") {
  g.s.tempMods = g.s.tempMods.filter((t) => t.until !== until);
}

// ---------- conditions ----------

export function checkCondition(g: G, c: Condition, ctx: EffCtx): boolean {
  const you = ctx.you ?? null;
  const yourLoc = you ? g.s.invs[you]?.location ?? null : null;
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
  if ("exhaustedEnemyAtYourLocation" in c) return enemiesAt(g, yourLoc).some((e) => e.exhausted);
  if ("onlyEngagedEnemy" in c) return !!you && engagedWith(g, you).length === 1 && engagedWith(g, you)[0].id === ctx.enemy;
  if ("eventEnemy" in c) return !!ctx.enemy && matchesFilter(g, card(g, ctx.enemy).code, c.eventEnemy);
  if ("eventInvestigatorIsYou" in c) return ctx.inv === you;
  if ("eventAtYourLocation" in c) {
    const evLoc = ctx.location ?? (ctx.inv ? g.s.invs[ctx.inv]?.location : null);
    return !!evLoc && evLoc === yourLoc;
  }
  if ("testKind" in c) return g.s.skillTest?.kind === c.testKind;
  if ("failedBy" in c) return ctx.failBy !== undefined && ctx.failBy <= c.failedBy.max;
  if ("succeededBy" in c) return ctx.succeedBy !== undefined && ctx.succeedBy >= c.succeededBy.min;
  if ("tokenIs" in c) return !!ctx.token && c.tokenIs.includes(ctx.token);
  if ("tokenNegative" in c) return !!ctx.token && /^-/.test(ctx.token);
  if ("resources" in c) return !!you && inv(g, you).resources >= c.resources.min;
  if ("assetInPlay" in c) return !!you && controlled(g, you).some((a) => matchesFilter(g, a.code, c.assetInPlay));
  if ("controlsCard" in c) return !!you && controlled(g, you).some((a) => a.code === c.controlsCard);
  if ("scenarioFlag" in c) return !!g.s.flags[c.scenarioFlag];
  if ("phase" in c) return g.s.phase === c.phase;
  if ("selfHasClues" in c) return !!ctx.source && card(g, ctx.source).clues > 0;
  if ("engaged" in c) return !!you && engagedWith(g, you).length > 0;
  if ("yourSkillTest" in c) return !!g.s.skillTest && g.s.skillTest.inv === you;
  if ("eventCard" in c) return !!ctx.card && !!g.s.cards[ctx.card] && matchesFilter(g, card(g, ctx.card).code, c.eventCard);
  if ("controlled" in c) return !!ctx.source && !!card(g, ctx.source).controller === c.controlled;
  if ("exhausted" in c) return !!ctx.source && card(g, ctx.source).exhausted === c.exhausted;
  return false;
}
