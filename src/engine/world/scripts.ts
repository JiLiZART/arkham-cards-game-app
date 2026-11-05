/**
 * The script registry: the only code that reads the loaded scripts (`db.scripts`; the content loader fills it). It
 * finds a card's or scenario's script, and a script function or condition by the one fallback rule: the card's own,
 * else the current scenario's. It only looks things up; calling them is the script adapter's (rules/scripts.ts).
 */
import type { CardScript, ContentDb, EffCtx, GameContext, ScriptFn } from "./types";

type Scripts = Pick<ContentDb, "scripts">;

/** the script of a card or scenario, if it has one */
export const scriptOf = (db: Scripts, code: string): CardScript | undefined => db.scripts[code];
export const hasScript = (db: Scripts, code: string): boolean => code in db.scripts;
/** every code with a script */
export const scriptCodes = (db: Scripts): string[] => Object.keys(db.scripts);

/** the function `fn` for a card: its own, else the scenario's, with the code it was found under */
export function scriptFnFor(
  db: Scripts,
  scenarioId: string,
  code: string,
  fn: string,
): { code: string; fn: ScriptFn } | undefined {
  const own = db.scripts[code]?.fns?.[fn];
  if (own) return { code, fn: own };
  const scen = db.scripts[scenarioId]?.fns?.[fn];
  return scen ? { code: scenarioId, fn: scen } : undefined;
}

/** the condition `name` for a card (or none): its own, else the scenario's */
export const conditionFor = (
  db: Scripts,
  scenarioId: string,
  code: string | undefined,
  name: string,
): ((game: GameContext, ctx: EffCtx) => boolean) | undefined =>
  (code ? db.scripts[code]?.conditions?.[name] : undefined) ??
  db.scripts[scenarioId]?.conditions?.[name];

/** at load time no scenario is current: is `fn` the card's own, or any of these scenarios'? */
export const scriptFnIn = (db: Scripts, code: string, fn: string, scenarioIds: string[]): boolean =>
  !!db.scripts[code]?.fns?.[fn] || scenarioIds.some((s) => !!db.scripts[s]?.fns?.[fn]);

const MEMBERS: Record<keyof CardScript, true> = {
  abilities: true,
  fns: true,
  conditions: true,
  icons: true,
  modifiers: true,
  extraPlayable: true,
  blanks: true,
  extraActionCost: true,
  wouldPlaceDoom: true,
  hooks: true,
  cancelsSearch: true,
  ignores: true,
};
/** every member a script may have (a new one fails the typecheck until it is listed) */
export const SCRIPT_MEMBERS = Object.keys(MEMBERS) as (keyof CardScript)[];
