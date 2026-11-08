/**
 * The script adapter: the only code that builds a script run and calls a script function (ADR-0027). It resolves the
 * run's investigator, applies the eliminated guard data effects use, and owns re-entry after a choice: a choice verb
 * that has to wait for the player stops the script with a private signal, and the step runs again from the top once
 * the choice is made (as `ask` always worked).
 */
import {
  ask,
  def,
  type GameContext,
  inv,
  invName,
  isCancelled,
  leadInvestigator,
  resolvesFor,
  scenarioIdOf,
} from "../context";
import { CHOICE } from "../world/constants";
import type {
  ChoiceOption,
  ChooseOpts,
  EffCtx,
  HookRun,
  InstId,
  InvId,
  ScriptFn,
  ScriptPrompt,
  ScriptRun,
  ScriptHooks,
  Step,
} from "../world/types";
import { scriptFnFor, scriptOf } from "../world/scripts";

type ScriptStep = Extract<Step, { t: "Script" }>;

/** thrown by a choice verb that has to wait; caught only by `runScript` */
class Waiting {}
const WAITING = new Waiting();

/** the script function a Script step names: the card's own, else the scenario's */
export const scriptFn = (game: GameContext, code: string, fn: string): ScriptFn | undefined =>
  scriptFnFor(game.db, scenarioIdOf(game), code, fn)?.fn;

export interface RunOpts {
  /** the function to call, when the caller has found it itself (a token's `run`, a setup step) */
  fn?: ScriptFn;
  /** called outside a Script step (a token, the setup): nothing can wait on a choice */
  direct?: boolean;
}

/** build the run for `step` and call its script function */
export function runScript(game: GameContext, step: ScriptStep, opts: RunOpts = {}): void {
  if (!resolvesFor(game, step.ctx)) return;
  if (step.unless && isCancelled(game, step.unless)) return;
  const fn = opts.fn ?? scriptFn(game, step.code, step.fn);
  if (!fn) throw new Error(`missing script function ${step.code}.${step.fn}`);
  const you = step.ctx.you ?? leadInvestigator(game);

  const choose = <T>(options: ChoiceOption[], prompt: ScriptPrompt, o: ChooseOpts = {}): T => {
    const auto = o.auto ?? true;
    if (opts.direct && step.choice === undefined && !(auto && options.length === 1))
      throw new Error(`${step.code}.${step.fn}: a choice can't wait outside a Script step`);
    const v = ask<T>(game, step, o.who ?? you, o.kind ?? CHOICE.Target, prompt.text, options, {
      auto,
      key: prompt.key,
      vars: prompt.vars,
      shown: o.shown,
    });
    if (v === undefined) throw WAITING;
    return v;
  };

  const run: ScriptRun = {
    you,
    get source(): InstId {
      const s = step.ctx.source;
      if (!s)
        throw new Error(`${step.code}.${step.fn} read its source card, but the step has none`);
      return s;
    },
    step,
    ctx: step.ctx,
    args: step.args,
    choose,
    chooseCard: (ids: InstId[], prompt: ScriptPrompt, o?: ChooseOpts) =>
      choose<InstId>(
        ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        prompt,
        o,
      ),
    chooseInvestigator: (invs: InvId[], prompt: ScriptPrompt, o?: ChooseOpts) =>
      choose<InvId>(
        invs.map((i) => ({ id: i, label: invName(game, i), card: inv(game, i).cardId, value: i })),
        prompt,
        o,
      ),
  };

  try {
    fn(game, run);
  } catch (e) {
    if (e !== WAITING) throw e;
  }
}

type ScenarioHook =
  | "checkObjectives"
  | "ended"
  | "allEliminated"
  | "spawnRedirect"
  | "locationLeavesPlay"
  | "wouldBeDefeated"
  | "patrolTarget"
  | "actAdvanced";
type CardHook =
  | "setup"
  | "gameEnd"
  | "eventFinished"
  | "healHorror"
  | "storyResolved"
  | "doomThreshold"
  | "eliminated";
type AfterGame<F> = F extends (game: GameContext, ...a: infer A) => unknown ? A : never;
type AfterRun<F> = F extends (game: GameContext, run: HookRun, ...a: infer A) => unknown
  ? A
  : never;
type Returns<F> = F extends (...a: never[]) => infer R ? R : never;

/** does the current scenario's script have this hook */
export const hasScenarioHook = (game: GameContext, name: ScenarioHook): boolean =>
  !!scriptOf(game.db, scenarioIdOf(game))?.hooks?.[name];

/** fire a hook of the current scenario's script; undefined when it has none */
export function fireScenarioHook<K extends ScenarioHook>(
  game: GameContext,
  name: K,
  ...args: AfterGame<ScriptHooks[K]>
): Returns<ScriptHooks[K]> | undefined {
  const hook = scriptOf(game.db, scenarioIdOf(game))?.hooks?.[name];
  if (!hook) return undefined;
  // TypeScript can't correlate the hook it indexed with the arguments typed by the same name
  return (hook as (game: GameContext, ...a: unknown[]) => Returns<ScriptHooks[K]>)(game, ...args);
}

/** fire a hook of the script of `code` (a card or an investigator); `ctx` names the card (`source`) and its controller */
export function fireCardHook<K extends CardHook>(
  game: GameContext,
  code: string,
  name: K,
  ctx: EffCtx,
  ...args: AfterRun<ScriptHooks[K]>
): Returns<ScriptHooks[K]> | undefined {
  const hook = scriptOf(game.db, code)?.hooks?.[name];
  if (!hook) return undefined;
  const run: HookRun = {
    you: ctx.you ?? leadInvestigator(game),
    get source(): InstId {
      if (!ctx.source)
        throw new Error(`${code}.hooks.${name} read its source card, but there is none`);
      return ctx.source;
    },
    ctx,
  };
  return (hook as (game: GameContext, run: HookRun, ...a: unknown[]) => Returns<ScriptHooks[K]>)(
    game,
    run,
    ...args,
  );
}

/** "when the game ends" abilities of these cards: at the resolution, or for an eliminated investigator's weaknesses */
export function fireGameEnd(
  game: GameContext,
  cards: readonly { id: InstId; code: string; controller: InvId | null }[],
) {
  for (const c of cards) fireCardHook(game, c.code, "gameEnd", { source: c.id, you: c.controller });
}

// a script's own continuation arguments arrive as `unknown` (typed in engine-typed-continuations); these narrow them
/** a field of an object argument, or undefined */
export const argField = (args: unknown, key: string): unknown =>
  typeof args === "object" && args !== null && key in args
    ? (args as Record<string, unknown>)[key]
    : undefined;
export const asNumber = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
export const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
export const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export const handlers = { Script: (game: GameContext, step: ScriptStep) => runScript(game, step) };
