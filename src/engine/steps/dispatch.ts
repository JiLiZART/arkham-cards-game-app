/**
 * The resolution stack (ADR-0021, ADR-0025): `run` pops queued steps and hands each to the handler registered for its
 * kind, until a choice is needed or the queue is empty. Every step kind has exactly one handler, taking that kind of
 * step; the rules modules and the effects own the handlers, this module only collects them.
 */
import { addCounter, def, type GameContext, invOf, invOfIf, push } from "../context";
import { handlers as effectHandlers } from "../effects";
import { finishEvent, handlers as cardHandlers } from "../rules/cards";
import { elusive, exhaustEnemy, handlers as enemyHandlers } from "../rules/enemies";
import {
  basicInvestigate,
  endTurnCleanup,
  handlers as flowHandlers,
  readyAll,
  roundCleanup,
} from "../rules/round";
import {
  assetDefeatCheck,
  checkEngagement,
  chooseLead,
  handlers as invHandlers,
  removeDefeatedAsset,
  revealLocation,
} from "../rules/investigators";
import {
  allEliminated,
  finishRevelation,
  handlers as scenarioHandlers,
  nextAct,
  nextAgenda,
} from "../rules/scenario";
import { handlers as testHandlers, startTest } from "../rules/skillTest";
import type { EffCtx, Step } from "../world/types";

/** one handler per step kind, each taking exactly its own kind of step */
export type StepHandlers = {
  [K in Step["t"]]: (game: GameContext, step: Extract<Step, { t: K }>) => void;
};

// ---------- internal script functions (code "__engine") ----------
const ENGINE_FNS: Record<string, (game: GameContext, ctx: EffCtx, step: Step) => void> = {
  finishEvent: (game, ctx) => finishEvent(game, ctx),
  finishRevelation: (game, ctx) => finishRevelation(game, ctx.source!, ctx.you!),
  assetDefeatCheck: (game, ctx) => assetDefeatCheck(game, ctx.you!),
  removeDefeatedAsset: (game, ctx) => removeDefeatedAsset(game, ctx.source!),
  allEliminated: (game) => allEliminated(game),
  revealLocation: (game, ctx) => revealLocation(game, ctx.location!),
  checkEngagement: (game, ctx) => checkEngagement(game, ctx.inv!),
  investigate: (game, ctx) => basicInvestigate(game, ctx.you!, ctx.location!),
  basicFight: (game, ctx) =>
    startTest(game, {
      inv: ctx.you!,
      skill: "combat",
      kind: "fight",
      target: ctx.enemy!,
      label: `Fight ${def(game, ctx.enemy!).name}`,
      ctx,
    }),
  basicEvade: (game, ctx) =>
    startTest(game, {
      inv: ctx.you!,
      skill: "agility",
      kind: "evade",
      target: ctx.enemy!,
      label: `Evade ${def(game, ctx.enemy!).name}`,
      ctx,
    }),
  endTurnCleanup: (game, ctx) => endTurnCleanup(game, ctx.inv!),
  gainResource: (game, ctx) => {
    addCounter(game, ctx.inv!, "resources", 1);
  },
  roundCleanup: (game) => roundCleanup(game),
  exhaustEnemy: (game, ctx) => exhaustEnemy(game, ctx.enemy!),
  elusive: (game, ctx, step) => elusive(game, ctx.enemy!, step),
  readyAll: (game) => readyAll(game),
  chooseLead: (game, _ctx, step) => chooseLead(game, step),
  nextAgenda: (game, ctx) => nextAgenda(game, ctx.source!),
  nextAct: (game, ctx) => nextAct(game, ctx.source!),
};

const scriptHandler = (game: GameContext, step: Extract<Step, { t: "Script" }>) => {
  if (step.code === "__engine") {
    ENGINE_FNS[step.fn](game, step.ctx, step);
    return;
  }
  // as for data effects: an investigator eliminated mid-effect (an attack of opportunity) resolves nothing more of it
  const you = step.ctx.you;
  if (you && invOfIf(game.s, you) && invOf(game.s, you).status !== "playing") return;
  const fn =
    game.db.scripts[step.code]?.fns?.[step.fn] ??
    game.db.scripts[game.s.scenarioId]?.fns?.[step.fn];
  if (!fn) throw new Error(`missing script function ${step.code}.${step.fn}`);
  fn(game, step.ctx, step.args, step);
};

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
