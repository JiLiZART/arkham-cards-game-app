/** The `Eff` step: one effect of a card or scenario, run by the handler for its `op`, with the families of handlers in this folder (ADR-0025). */
import {
  arrangeOnTop,
  ask,
  cardIf,
  currentPhase,
  type GameContext,
  leadInvestigator,
  resolvesFor,
  push,
} from "../context";
import type { InstId, Step } from "../world/types";
import { resourcesEffects } from "./resources";
import { damageEffects } from "./damage";
import { tokensEffects } from "./tokens";
import { placementEffects } from "./placement";
import { encounterEffects } from "./encounter";
import { searchEffects } from "./search";
import { testsEffects } from "./tests";
import { choicesEffects } from "./choices";
import { structureEffects } from "./structure";
import type { EffectHandlers, EffectRun, EffStep } from "./types";
import { opt } from "./targets";
import { CHOICE } from "../world/constants";
import { STEP } from "../steps/step";

export type { EffectHandlers } from "./types";

export const effectsHandler = (game: GameContext, step: Extract<Step, { t: "Effects" }>) => {
  push(game, ...step.effects.map((effect): Step => ({ t: STEP.Eff, effect, ctx: step.ctx })));
};

/** one card at a time, top down, until one is left: it goes under the others */
const arrangeTopHandler = (game: GameContext, step: Extract<Step, { t: "ArrangeTop" }>) => {
  const left = step.cards.filter((id) => !step.placed.includes(id));
  const pick =
    left.length > 1
      ? ask<InstId>(
          game,
          step,
          step.inv,
          CHOICE.Generic,
          `Choose the card to put ${step.placed.length ? "next" : "on top"}`,
          left.map((id) => opt(game, id)),
          { key: step.placed.length ? "arrangeNext" : "arrangeTop" },
        )
      : left[0];
  if (pick === undefined) return;
  const placed = [...step.placed, pick];
  if (placed.length < step.cards.length) {
    push(game, { ...step, placed, choice: undefined });
    return;
  }
  arrangeOnTop(game, step.deck, placed);
};
/** every effect the content schema allows, by its `op` */
export const EFFECT_HANDLERS: EffectHandlers = {
  ...resourcesEffects,
  ...damageEffects,
  ...tokensEffects,
  ...placementEffects,
  ...structureEffects,
  ...encounterEffects,
  ...searchEffects,
  ...testsEffects,
  ...choicesEffects,
};

export const effHandler = (game: GameContext, step: EffStep) => {
  if (currentPhase(game) === "ended") return;
  const e = step.effect;
  const ctx = step.ctx;
  if (!resolvesFor(game, ctx)) return;
  const you = ctx.you ?? leadInvestigator(game);
  const src = ctx.source ? cardIf(game, ctx.source) : undefined;
  // TypeScript can't correlate the handler it indexes with the effect it was indexed by
  const handle = EFFECT_HANDLERS[e.op] as (game: GameContext, run: EffectRun) => void;
  handle(game, { step, effect: e, ctx, you, src });
};

export const handlers = { Effects: effectsHandler, Eff: effHandler, ArrangeTop: arrangeTopHandler };
