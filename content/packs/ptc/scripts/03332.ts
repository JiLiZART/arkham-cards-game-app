// Hastur (The King in Yellow) (Dim Carcosa): at no location; damaged only by story cards (data). At the beginning of
// the enemy phase, if ready, he attacks each investigator in player order. [action] (any investigator): test
// [willpower] (X), X his fight; success exhausts him. Every version: his attack's horror in excess of your sanity also
// deals 1 damage; his defeat is recorded for act 3's back and advances act 3 (The King in Tatters).
import {
  card,
  cardIf,
  type CardScript,
  currentAct,
  type EffCtx,
  enemyStat,
  exhaust,
  flags,
  type GameContext,
  inv,
  maxSanity,
  type ScriptRun,
  queue,
  advanceAct,
  resolveEffect,
} from "../../../../src/engine/api";
import {
  DEFEATED,
  KING_IN_TATTERS,
} from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

/** what every Hastur shares: the excess horror's damage, and his defeat recorded */
export const hastur = {
  abilities: [
    {
      kind: "forced" as const,
      trigger: "damageOrHorrorTaken" as const,
      condition: { script: "excessHorror" },
      effects: [{ op: "takeDamage" as const, amount: 1 }],
    },
    { kind: "forced" as const, trigger: "enemyDefeatedSelf" as const, run: "defeated" },
  ],
  conditions: {
    /** "If Hastur's attack deals you horror in excess of your sanity" */
    excessHorror: (game: GameContext, ctx: EffCtx) =>
      ctx.enemy === ctx.source && !!ctx.inv && inv(game, ctx.inv).horror > maxSanity(game, ctx.inv),
  },
  fns: {
    defeated(game: GameContext, run: ScriptRun) {
      flags.rememberedFact.set(game, `${DEFEATED}:${card(game, run.source).code}`, true);
      if (cardIf(game, currentAct(game))?.code === KING_IN_TATTERS)
        queue(game, advanceAct({ by: "objective" }));
    },
  },
};

export default {
  abilities: [
    ...hastur.abilities,
    {
      kind: "forced",
      trigger: "phaseBegins",
      condition: { all: [{ phase: "enemy" }, { exhausted: false }] },
      effects: [{ op: "enemyAttack", enemy: "self", target: "each" }],
    },
    {
      kind: "action",
      usableBy: "anyone",
      label: "Hastur: test [willpower] (his fight) to exhaust him",
      run: "stare",
    },
  ],
  conditions: hastur.conditions,
  fns: {
    ...hastur.fns,
    stare(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: enemyStat(game, run.source, "fight"),
            onSuccess: [{ op: "script", fn: "exhaustHim" }],
          },
          ctx: { ...run.ctx, you: run.you, source: run.source },
        }),
      );
    },
    exhaustHim(game: GameContext, run: ScriptRun) {
      exhaust(game, run.source);
    },
  },
} satisfies CardScript;
