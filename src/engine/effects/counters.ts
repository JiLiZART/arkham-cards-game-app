/** Small shared vocabulary of The Forgotten Age's locations: a clue turned to doom, a named scenario counter. */
import { addCounter, cardIf, def, emit, inv, type GameContext } from "../context";
import { scenarioCounter } from "../world/flags";
import { EVENT } from "../events/event";
import { amt } from "./targets";
import type { EffectOf, EffectRun } from "./types";

/** one clue on the location flipped to its doom side (Ancient Hall, Grand Chamber) */
function flipClueToDoomEffect(game: GameContext, run: EffectRun<EffectOf<"flipClueToDoom">>) {
  const at = run.effect.at === "self" ? run.ctx.source : inv(game, run.you).location;
  const loc = at ? cardIf(game, at) : undefined;
  if (!loc || loc.clues < 1) return;
  addCounter(game, loc.id, "clues", -1);
  addCounter(game, loc.id, "doom", 1);
  emit(game, EVENT.Doom, `A clue on ${def(game, loc.id).name} turns to doom`, { card: loc.id });
}

/** a named scenario counter set or raised (The Depths of Yoth's depth level) */
function counterEffect(game: GameContext, run: EffectRun<EffectOf<"setCounter" | "addCounter">>) {
  const { op, name } = run.effect;
  const n = amt(game, run.effect.amount, run.ctx);
  scenarioCounter.set(
    game,
    name,
    (op === "addCounter" ? (scenarioCounter.get(game, name) ?? 0) : 0) + n,
  );
}

export const counterEffects = {
  flipClueToDoom: flipClueToDoomEffect,
  setCounter: counterEffect,
  addCounter: counterEffect,
};
