/**
 * The scenario's flags (`state.flags`): facts about a card, an investigator or an event that the card record doesn't
 * hold, and a few facts about the whole scenario. This module owns every key format; engine modules and scripts read
 * and write flags only through it. Each family is `prefix:id` (or `prefix:id:id`); a global is a fixed name.
 */
import type { Effect } from "../../content/schema";
import type { EffCtx, FlagTables, GameState, InstId, InvId } from "./types";

/** anything holding a game state: the engine context, or `{ s }` around a state */
type HasState = { s: GameState };
type Ids = string | readonly string[];

/** the families about an entity, each stored in the table of its name (ADR-0024) */
type FlagTable = keyof FlagTables;
const MOVED: readonly FlagTable[] = [
  "noReady",
  "surge",
  "dying",
  "costMod",
  "tokens",
  "aside",
  "xp",
  "hunch",
  "hunchRevealed",
  "attacked",
  "noAttack",
];

/**
 * a family of flags under `prefix:`, keyed by one id or several, each holding a `V`: in the table of that name when
 * the family is about an entity, else in the scenario's flags
 */
function family<V, K extends Ids = string>(prefix: string, table?: FlagTable) {
  const key = (k: K) => `${prefix}:${typeof k === "string" ? k : k.join(":")}`;
  const slot = (k: K) => (typeof k === "string" ? k : k.join(":"));
  const store = (game: HasState) =>
    (table ? game.s.world.tables[table] : game.s.flags) as Record<string, unknown>;
  const at = table ? slot : key;
  const get = (game: HasState, k: K) => store(game)[at(k)] as V | undefined;
  const set = (game: HasState, k: K, v: V) => {
    store(game)[at(k)] = v;
  };
  const clear = (game: HasState, k: K) => {
    delete store(game)[at(k)];
  };
  /** read it and clear it: a value that lives until it is used once */
  const take = (game: HasState, k: K) => {
    const v = get(game, k);
    clear(game, k);
    return v;
  };
  return { key, get, set, clear, take };
}

/** a family of numbers that `add` counts up from nothing */
function counts<K extends Ids = string>(prefix: string, table?: FlagTable) {
  const f = family<number, K>(prefix, table);
  const add = (game: HasState, k: K, n: number) => {
    const v = (f.get(game, k) ?? 0) + n;
    f.set(game, k, v);
    return v;
  };
  return { ...f, add };
}

/** one flag under a fixed name */
function global<V>(name: string) {
  return {
    get: (game: HasState) => game.s.flags[name] as V | undefined,
    set: (game: HasState, v: V) => {
      game.s.flags[name] = v;
    },
    clear: (game: HasState) => {
      delete game.s.flags[name];
    },
  };
}

// ---------- about a card ----------
/** the enemy doesn't ready in the next upkeep */
export const noReady = family<true, InstId>("noReady", "noReady");
/** the treachery drawn has surge */
export const surge = family<true, InstId>("surge", "surge");
/** the asset is leaving play from damage or horror (its defeat already queued) */
export const dying = family<true, InstId>("dying", "dying");
/** added to the card's cost while it is played */
export const costMod = counts<InstId>("costMod", "costMod");
/** an enemy of this card code has been defeated this scenario */
export const defeated = family<true, string>("defeated");

// ---------- about an investigator ----------
/** opening-hand weaknesses set aside until the mulligan is done */
export const aside = family<InstId[], InvId>("aside", "aside");
/** experience the scenario adds to the investigator's total (negative to take it away) */
export const xp = counts<InvId>("xp", "xp");
/** Joe Diamond's hunch deck, and its revealed card */
export const hunch = family<InstId[], InvId>("hunch", "hunch");
export const hunchRevealed = family<InstId, InvId>("hunchRevealed", "hunchRevealed");

// ---------- about an enemy and an investigator ----------
/** the round the enemy last attacked the investigator */
export const attacked = family<number, readonly [InstId, InvId]>("attacked", "attacked");
/** the round in which the enemy can't attack the investigator */
export const noAttack = family<number, readonly [InstId, InvId]>("noAttack", "noAttack");

// ---------- about an event (an attack's or a test's key) ----------
/** damage and horror an attack's window has prevented, to take off when it is placed */
export const prevented = family<[number, number], string>("prevented");
/** extra damage an attack deals */
export const attackBonus = counts<string>("attackBonus");
/** extra damage dealt to an enemy */
export const damageBonus = counts<string>("damageBonus");
/** the card Isabelle Barnes chose for a test, by test id */
export const isabelle = family<InstId, string>("isabelle");

// ---------- campaign log entries a scenario leaves ----------
/** a campaign log entry to record at the scenario's end, by section ("" for the notes) and id */
export const logEntry = family<boolean, readonly [string, string]>("log");
/** a campaign log count to add at the scenario's end */
export const countEntry = family<number, readonly [string, string]>("count");

// ---------- about the scenario ----------
/** a peril card is resolving: other investigators can't help */
export const peril = global<true>("peril");
/** effects to resolve when an investigator's turn ends */
export const atTurnEnd = global<{ inv: InvId; effects: Effect[]; ctx: EffCtx }[]>("atTurnEnd");
/** connections a scenario added between locations, by card code */
export const connections = global<[string, string][]>("connections");
/** how many cards each investigator discards at random from the opening hand */
export const discardFromOpeningHands = global<number>("discardFromOpeningHands");
/** no vehicle may be entered: anywhere (true), or at these locations */
export const noVehicles = global<true | InstId[]>("noVehicles");
/** the round an investigator last entered (`<inv>:enter`) or left (`<inv>:leave`) a vehicle */
export const vehicleUsed = family<number>("vehicleUsed");
/** Smoke and Mirrors: the harbinger, and where the servant of flame went */
export const harbinger = global<InstId>("harbinger");
export const killedServant = global<true>("killedServant");
export const servantBeneath = global<true>("servantBeneath");
/** The Devourer Below: the final act is both act and agenda */
export const devourer = global<true>("devourer");

/** a scenario flag a condition names (`scenarioFlag` in card data) */
export const named = (game: HasState, name: string) => game.s.flags[name];

/** the log and count entries a scenario left for the campaign log, in the order they were set */
export function campaignNotes(
  s: GameState,
): { kind: "log" | "count"; section: string; id: string; value: unknown }[] {
  const out: { kind: "log" | "count"; section: string; id: string; value: unknown }[] = [];
  for (const [k, value] of Object.entries(s.flags)) {
    const m = /^(log|count):([^:]*):(.+)$/.exec(k);
    if (!m || value === undefined || value === false) continue;
    out.push({ kind: m[1] as "log" | "count", section: m[2], id: m[3], value });
  }
  return out;
}

/**
 * The scenario's flags as they were before the families about an entity moved into tables: every entry under its old
 * `prefix:id` key. What a recording keeps, so the corpus doesn't depend on where the facts are stored.
 */
export function flagsForSnapshot(s: GameState): Record<string, unknown> {
  const out: Record<string, unknown> = { ...s.flags };
  for (const table of MOVED)
    for (const [k, v] of Object.entries(s.world.tables[table])) out[`${table}:${k}`] = v;
  return out;
}
