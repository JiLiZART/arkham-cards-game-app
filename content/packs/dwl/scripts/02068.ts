// All In (The House Always Wins, act 3) — while Dr. Morgan is controlled by no one, an investigator at his location may
// parley (willpower 3): a clue on him, and with 1 [per_investigator] clues on him they take control of him; when each
// undefeated investigator has resigned, the scenario's script routes to R2 (resigned with him) or R1
import {
  card,
  type CardScript,
  def,
  emit,
  type EffCtx,
  findByCode,
  type GameContext,
  inv,
  playerCount,
  addCounter,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

/** the story ally, at your location and controlled by no one */
const here = (game: GameContext, code: string, ctx: EffCtx) => {
  const ally = findByCode(game, code, [ZONE.Attached]);
  return ally && !ally.controller && !!ctx.you && ally.location === inv(game, ctx.you).location
    ? ally
    : undefined;
};

/** the act's parley with a story ally (Dr. Morgan, Peter Clover), the clues it places and the control it gives */
export const parley = (code: string, label: string) => ({
  ability: {
    kind: "action" as const,
    designator: "parley" as const,
    label,
    usableBy: "anyone" as const,
    condition: { script: "near" },
    effects: [
      {
        op: "skillTest" as const,
        skill: "willpower" as const,
        difficulty: 3,
        onSuccess: [{ op: "script" as const, fn: "persuade" }],
      },
    ],
  },
  near: (game: GameContext, ctx: EffCtx) => !!here(game, code, ctx),
  persuade(game: GameContext, run: ScriptRun) {
    const ally = here(game, code, run.ctx);
    if (!ally) return;
    addCounter(game, ally.id, "clues", 1);
    emit(game, EVENT.Clues, `1 clue is placed on ${def(game, ally.id).name}`, {
      card: ally.id,
      data: { n: 1, placed: true },
    });
    if (card(game, ally.id).clues >= playerCount(game))
      queue(
        game,
        resolveEffect({ effect: { op: "takeControl" }, ctx: { you: run.you, source: ally.id } }),
      );
  },
});

const morgan = parley("02080", "All In: parley with Dr. Francis Morgan (willpower 3)");

export default {
  abilities: [morgan.ability],
  conditions: { near: morgan.near },
  fns: { persuade: morgan.persuade },
} satisfies CardScript;
