// Spires of Carcosa — attached to your location with 2 doom on that location; [action] Investigate: a success removes
// 1 doom from the location instead of discovering clues; with no doom on the location it is discarded (checked after
// its investigation and as each phase ends).
import {
  addCounter,
  card,
  cardIf,
  type CardScript,
  def,
  discard,
  emit,
  type GameContext,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";

const host = (game: GameContext, id: string) => {
  const c = cardIf(game, id);
  return c?.zone === ZONE.Attached ? c.location : null;
};
/** discarded once its location has no doom */
function check(game: GameContext, id: string) {
  const loc = host(game, id);
  if (cardIf(game, id)?.zone === ZONE.Attached && (!loc || card(game, loc).doom === 0))
    discard(game, id);
}

export default {
  abilities: [
    { kind: "revelation", run: "attach" },
    {
      kind: "action",
      designator: "investigate",
      label: "Spires of Carcosa: investigate to remove 1 doom",
      run: "investigate",
    },
    { kind: "forced", trigger: "phaseEnds", run: "check" },
  ],
  fns: {
    attach(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({ effect: { op: "attachToLocation", where: "yours" }, ctx: run.ctx }),
        runScript({ code: "03091", fn: "doom", ctx: run.ctx }),
      );
    },
    doom(game: GameContext, run: ScriptRun) {
      const loc = host(game, run.source);
      if (!loc) return;
      addCounter(game, loc, "doom", 2);
      emit(game, EVENT.Doom, `2 doom is placed on ${def(game, loc).name}`, {
        card: loc,
        data: { n: 2 },
      });
    },
    investigate(game: GameContext, run: ScriptRun) {
      const ctx = { ...run.ctx, you: run.you, source: run.source };
      queue(
        game,
        resolveEffect({
          effect: { op: "investigate", insteadOfClues: [{ op: "script", fn: "undoom" }] },
          ctx,
        }),
        runScript({ code: "03091", fn: "check", ctx }),
      );
    },
    undoom(game: GameContext, run: ScriptRun) {
      const loc = host(game, run.source);
      if (!loc || card(game, loc).doom === 0) return;
      addCounter(game, loc, "doom", -1);
      emit(game, EVENT.Doom, `1 doom is removed from ${def(game, loc).name}`, {
        card: loc,
        data: { n: -1 },
      });
    },
    check(game: GameContext, run: ScriptRun) {
      check(game, run.source);
    },
  },
} satisfies CardScript;
