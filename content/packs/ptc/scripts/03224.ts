// Deadly Fate (A Phantom of Truth) — test [willpower] (3); a failure discards the top of the encounter deck until an
// enemy is discarded: you draw that enemy, or it attacks you from the discard pile (its damage and horror dealt to
// you). No enemy discarded: 1 horror.
import {
  type CardScript,
  def,
  emit,
  invName,
  type GameContext,
  moveCard,
  pile,
  type ScriptRun,
  asString,
  discardTop,
  EVENT,
  ZONE,
  queue,
  dealDamage,
  runScript,
  spawn,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 3,
          onFail: [{ op: "script", fn: "fate" }],
        },
      ],
    },
  ],
  fns: {
    fate(game: GameContext, run: ScriptRun) {
      let enemy: string | undefined;
      while (!enemy && pile(game, "encounterDeck").length) {
        const [top] = discardTop(game, "encounter", 1);
        if (top && def(game, top).type === "enemy") enemy = top;
      }
      if (!enemy) {
        queue(
          game,
          dealDamage({ inv: run.you, damage: 0, horror: 1, direct: false, source: run.source }),
        );
        return;
      }
      queue(game, runScript({ code: "03224", fn: "drawOrAttack", ctx: run.ctx, args: enemy }));
    },
    drawOrAttack(game: GameContext, run: ScriptRun) {
      const enemy = asString(run.args);
      if (!enemy) return;
      const pick = run.choose<string>(
        [
          {
            id: "draw",
            label: `Draw ${def(game, enemy).name}`,
            value: "draw",
            key: "option.drawIt",
          },
          {
            id: "attack",
            label: `${def(game, enemy).name} attacks you`,
            value: "attack",
            key: "option.itAttacksYou",
          },
        ],
        { text: "Deadly Fate: choose one", key: "deadlyFate", vars: { card: enemy } },
        { auto: false, shown: [enemy] },
      );
      if (pick === "draw") {
        moveCard(game, enemy, ZONE.Limbo);
        queue(game, spawn({ enemy, inv: run.you }));
        return;
      }
      // an attack from the discard pile: the engine's attacks are by enemies in play, so its damage and horror are dealt
      emit(game, EVENT.Attack, `${def(game, enemy).name} attacks ${invName(game, run.you)}`, {
        inv: run.you,
        card: enemy,
      });
      queue(
        game,
        dealDamage({
          inv: run.you,
          damage: def(game, enemy).enemy?.damage ?? 0,
          horror: def(game, enemy).enemy?.horror ?? 0,
          direct: false,
          source: enemy,
          enemy,
        }),
      );
    },
  },
} satisfies CardScript;
