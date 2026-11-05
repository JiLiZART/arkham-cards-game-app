// Dormitories — unrevealed: you cannot move into it; objective: investigators here spend 3 [per_investigator] clues, as a
// group: (→R2)
import {
  addCounter,
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  type InstId,
  inv,
  invsAt,
  playerCount,
  type ScriptRun,
  queue,
  endScenario,
} from "../../../../src/engine/api";

/** an unrevealed location whose back says "you cannot move into" it (the campus's locked doors) */
export function locked(game: GameContext, id: InstId) {
  const c = card(game, id);
  return c.zone === "location" && !c.revealed
    ? [{ target: id, mod: { flag: "cannotMoveInto" as const } }]
    : [];
}

/** the clues the investigators at a location hold between them */
const cluesHere = (game: GameContext, loc: InstId) =>
  invsAt(game, loc).reduce((n, i) => n + inv(game, i).clues, 0);

/** investigators at the location may spend `per` [per_investigator] clues between them */
export const canSpendHere = (game: GameContext, loc: InstId, per: number) =>
  cluesHere(game, loc) >= per * playerCount(game);

/** spend `per` [per_investigator] clues from the investigators at the location, the one using it first */
export function spendHere(game: GameContext, run: ScriptRun, loc: InstId, per: number) {
  let n = per * playerCount(game);
  const here = invsAt(game, loc);
  for (const i of [run.you, ...here.filter((x) => x !== run.you)]) {
    if (!here.includes(i)) continue;
    const take = Math.min(n, inv(game, i).clues);
    addCounter(game, i, "clues", -take);
    n -= take;
  }
}

export default {
  modifiers: locked,
  abilities: [
    {
      kind: "fast",
      label: "Dormitories: spend 3 clues per investigator, as a group (→R2)",
      usableBy: "atLocation",
      condition: { script: "canSpend" },
      run: "objective",
    },
  ],
  conditions: {
    canSpend: (game: GameContext, ctx: EffCtx) => !!ctx.source && canSpendHere(game, ctx.source, 3),
  },
  fns: {
    objective(game: GameContext, run: ScriptRun) {
      spendHere(game, run, run.source, 3);
      queue(game, endScenario({ id: "R2" }));
    },
  },
} satisfies CardScript;
