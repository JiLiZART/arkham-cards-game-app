// The Pit Below (The Pallid Mask) — attaches to your location, +1 shroud; with a copy already there it is discarded and
// gains surge instead. Forced: at the end of the round, each investigator at that location takes 3 damage, then it is
// discarded.
import {
  allCards,
  card,
  type CardScript,
  discard,
  flags,
  type GameContext,
  inv,
  invsAt,
  type ScriptRun,
  ZONE,
  queue,
  dealDamage,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "revelation", run: "pit" },
    { kind: "constant", modifiers: [{ stat: "shroud", value: 1, scope: "attachedLocation" }] },
    { kind: "forced", trigger: "roundEnds", run: "fall" },
  ],
  fns: {
    pit(game: GameContext, run: ScriptRun) {
      const here = inv(game, run.you).location;
      const copy = allCards(game).some(
        (c) =>
          c.code === "03262" &&
          c.zone === ZONE.Attached &&
          c.location === here &&
          c.id !== run.source,
      );
      if (copy) {
        flags.surge.set(game, run.source, true);
        return;
      }
      queue(
        game,
        resolveEffect({ effect: { op: "attachToLocation", where: "yours" }, ctx: run.ctx }),
      );
    },
    fall(game: GameContext, run: ScriptRun) {
      const at = card(game, run.source).location;
      queue(
        game,
        ...(at ? invsAt(game, at) : []).map((i) =>
          dealDamage({ inv: i, damage: 3, horror: 0, direct: false, source: run.source }),
        ),
        runScript({ code: "03262", fn: "gone", ctx: run.ctx }),
      );
    },
    gone(game: GameContext, run: ScriptRun) {
      if (card(game, run.source).zone === ZONE.Attached) discard(game, run.source);
    },
  },
} satisfies CardScript;
