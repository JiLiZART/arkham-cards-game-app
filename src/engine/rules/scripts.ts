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
  leadInvestigator,
  resolvesFor,
  scenarioIdOf,
} from "../context";
import { CHOICE } from "../world/constants";
import type {
  ChoiceOption,
  ChooseOpts,
  InstId,
  InvId,
  ScriptFn,
  ScriptPrompt,
  ScriptRun,
  Step,
} from "../world/types";

type ScriptStep = Extract<Step, { t: "Script" }>;

/** thrown by a choice verb that has to wait; caught only by `runScript` */
class Waiting {}
const WAITING = new Waiting();

/** the script function a Script step names: the card's own, else the scenario's */
export const scriptFn = (game: GameContext, code: string, fn: string): ScriptFn | undefined =>
  game.db.scripts[code]?.fns?.[fn] ?? game.db.scripts[scenarioIdOf(game)]?.fns?.[fn];

export interface RunOpts {
  /** the function to call, when the caller has found it itself (a token's `run`, a setup step) */
  fn?: ScriptFn;
  /** called outside a Script step (a token, the setup): nothing can wait on a choice */
  direct?: boolean;
}

/** build the run for `step` and call its script function */
export function runScript(game: GameContext, step: ScriptStep, opts: RunOpts = {}): void {
  if (!resolvesFor(game, step.ctx)) return;
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
