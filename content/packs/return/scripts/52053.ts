// Malformed Skeleton (Return to The Pallid Mask) — Hunter. Forced: when it would resolve its hunter keyword (the enemy
// phase's hunter moves) with no investigator within 2 locations, it moves instead to the Catacombs location (an
// unrevealed one) nearest to an investigator, the lead choosing among equals, and makes no hunter move this phase.
// Forced: when it attacks you, it deals either its damage or its horror (you choose), not both.
import {
  activeInvs,
  card,
  type CardScript,
  currentPhase,
  currentRound,
  def,
  distances,
  type EffCtx,
  emit,
  EVENT,
  flags,
  type GameContext,
  type InstId,
  inv,
  leadInvestigator,
  locations,
  PHASE,
  queue,
  resolveEffect,
  type ScriptRun,
  setCardLocation,
} from "../../../../src/engine/api";

const held = (game: GameContext, self: InstId) => `rtpmSkeletonHeld:${self}:${currentRound(game)}`;
const spots = (game: GameContext) => activeInvs(game).flatMap((i) => inv(game, i).location ?? []);

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "phaseBegins",
      condition: { all: [{ phase: "enemy" }, { script: "stranded" }] },
      run: "wander",
    },
    {
      kind: "forced",
      trigger: "attackDealsDamage",
      condition: { script: "itsAttack" },
      run: "either",
    },
  ],
  conditions: {
    /** ready, unengaged, and no investigator within 2 locations */
    stranded: (game: GameContext, ctx: EffCtx) => {
      const self = ctx.source ? card(game, ctx.source) : null;
      if (!self?.location || self.exhausted || self.engagedWith) return false;
      const d = distances(game, self.location, self.id);
      return !spots(game).some((l) => (d.get(l) ?? Infinity) <= 2);
    },
    itsAttack: (game: GameContext, ctx: EffCtx) => !!ctx.enemy && ctx.enemy === ctx.source,
  },
  modifiers: (game: GameContext, id: InstId) =>
    currentPhase(game) === PHASE.Enemy && flags.named(game, held(game, id))
      ? [{ target: id, mod: { flag: "cannotMove" as const } }]
      : [],
  fns: {
    wander(game: GameContext, run: ScriptRun) {
      const at = spots(game);
      const reach = (l: InstId) => {
        const d = distances(game, l);
        return Math.min(...at.map((x) => d.get(x) ?? Infinity));
      };
      const hidden = locations(game).filter((l) => !l.revealed);
      flags.setNamed(game, held(game, run.source), true);
      if (!hidden.length || !at.length) return;
      const near = Math.min(...hidden.map((l) => reach(l.id)));
      if (near === Infinity) return;
      const to = run.chooseCard(
        hidden.filter((l) => reach(l.id) === near).map((l) => l.id),
        { text: "Malformed Skeleton moves to which Catacombs?", key: "malformedSkeleton" },
        { who: leadInvestigator(game) },
      );
      setCardLocation(game, run.source, to);
      emit(game, EVENT.EnemyMove, `${def(game, run.source).name} moves to ${def(game, to).name}`, {
        card: run.source,
      });
    },
    either(game: GameContext, run: ScriptRun) {
      const you = run.ctx.inv ?? run.you;
      const keep = run.choose<"damage" | "horror">(
        [
          {
            id: "damage",
            label: "It deals its damage only",
            value: "damage",
            key: "option.malformedSkeleton.damage",
          },
          {
            id: "horror",
            label: "It deals its horror only",
            value: "horror",
            key: "option.malformedSkeleton.horror",
          },
        ],
        { text: "Malformed Skeleton: its damage or its horror?", key: "malformedSkeletonAttack" },
        { who: you },
      );
      queue(
        game,
        resolveEffect({
          effect: {
            op: "preventDamage",
            amount: 99,
            kind: keep === "damage" ? "horror" : "damage",
          },
          ctx: { ...run.ctx, you },
        }),
      );
    },
  },
} satisfies CardScript;
