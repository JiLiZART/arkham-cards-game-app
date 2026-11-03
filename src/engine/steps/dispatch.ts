/**
 * The resolution stack (ADR-0021, ADR-0025): `run` pops queued steps and hands each to the handler registered for its
 * kind, until a choice is needed or the queue is empty. Every step kind has exactly one handler, taking that kind of
 * step; the rules modules and the effects own the handlers, this module only collects them.
 */
import { type GameContext, push } from "../context";
import { handlers as effectHandlers } from "../effects";
import { handlers as cardHandlers } from "../rules/cards";
import { runScript } from "../rules/scripts";
import { handlers as enemyHandlers } from "../rules/enemies";
import { handlers as flowHandlers } from "../rules/round";
import { handlers as invHandlers } from "../rules/investigators";
import { handlers as scenarioHandlers } from "../rules/scenario";
import { handlers as testHandlers } from "../rules/skillTest";
import type { Step } from "../world/types";

/** one handler per step kind, each taking exactly its own kind of step */
export type StepHandlers = {
  [K in Step["t"]]: (game: GameContext, step: Extract<Step, { t: K }>) => void;
};

/** a content script function, through the adapter (rules/scripts.ts); the engine's own deferred rules are step kinds */
const scriptHandler = (game: GameContext, step: Extract<Step, { t: "Script" }>) =>
  runScript(game, step);

const forEachInvHandler = (game: GameContext, step: Extract<Step, { t: "ForEachInv" }>) => {
  push(game, ...step.invs.map((i) => ({ ...step.step, inv: i }) as Step));
};

export const STEP_HANDLERS: StepHandlers = {
  ...flowHandlers,
  ...cardHandlers,
  ...invHandlers,
  ...enemyHandlers,
  ...testHandlers,
  ...scenarioHandlers,
  ...effectHandlers,
  Script: scriptHandler,
  ForEachInv: forEachInvHandler,
  Setup: () => {},
  ChooseTurnOrder: () => {},
};

const MAX_STEPS = 20000;

/** resolve queued steps until a choice is needed or the queue is empty */
export function run(game: GameContext) {
  let n = 0;
  const recent: string[] = [];
  while (!game.s.pending && game.s.queue.length && game.s.phase !== "ended") {
    if (++n > MAX_STEPS)
      throw new Error(`engine loop limit exceeded; recent steps: ${recent.join(" ")}`);
    const step = game.s.queue.pop()!;
    if (n > MAX_STEPS - 30)
      recent.push(
        step.t +
          ("trigger" in step ? `:${step.trigger}` : "") +
          ("fn" in step ? `:${step.fn}` : ""),
      );
    // TypeScript can't correlate the handler it indexes with the step it was indexed by
    const handle = STEP_HANDLERS[step.t] as ((game: GameContext, step: Step) => void) | undefined;
    if (!handle) throw new Error(`no handler for step ${step.t}`);
    handle(game, step);
  }
}
