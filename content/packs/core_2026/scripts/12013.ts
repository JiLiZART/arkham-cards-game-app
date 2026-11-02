// Isabelle Barnes — take 1 direct horror to commit a skill from your discard pile; after the test it is shuffled into your deck
import {
  ask,
  canCommit,
  cardIf,
  type CardScript,
  currentTest,
  def,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  push,
  setController,
  shuffleIntoDeck,
  type Step,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    fromDiscard(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const t = currentTest(game);
      const you = ctx.you!;
      if (!t) return;
      const skills = inv(game, you).discard.filter(
        (id) => def(game, id).type === "skill" && canCommit(game, you, id, t),
      );
      if (!skills.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        you,
        CHOICE.Generic,
        "Isabelle: commit a skill from your discard pile",
        skills.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { auto: true, key: "chooseFromDiscard" },
      );
      if (pick === undefined) return;
      moveCard(game, pick, ZONE.Commit);
      setController(game, pick, you);
      t.committed.push(pick);
      t.committers.push(you);
      flags.isabelle.set(game, String(t.id), pick);
      emit(
        game,
        EVENT.Commit,
        `${inv(game, you).name} commits ${def(game, pick).name} from the discard pile`,
        {
          inv: you,
          card: pick,
        },
      );
      push(game, {
        t: STEP.AssignDamage,
        inv: you,
        damage: 0,
        horror: 1,
        direct: true,
        source: ctx.source ?? null,
      });
    },
    reshuffle(game: GameContext, ctx: EffCtx) {
      const id = flags.isabelle.get(game, String(ctx.testId));
      if (!id) return;
      flags.isabelle.clear(game, String(ctx.testId));
      const c = cardIf(game, id);
      if (c?.owner && c.zone === "discard") shuffleIntoDeck(game, id, c.owner);
    },
  },
} satisfies CardScript;
