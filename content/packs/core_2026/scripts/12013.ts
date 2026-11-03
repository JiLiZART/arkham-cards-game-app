// Isabelle Barnes — take 1 direct horror to commit a skill from your discard pile; after the test it is shuffled into your deck
import {
  canCommit,
  cardIf,
  type CardScript,
  currentTest,
  def,
  emit,
  flags,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  setController,
  shuffleIntoDeck,
  EVENT,
  ZONE,
  CHOICE,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

export default {
  fns: {
    fromDiscard(game: GameContext, run: ScriptRun) {
      const t = currentTest(game);
      const you = run.you;
      if (!t) return;
      const skills = inv(game, you).discard.filter(
        (id) => def(game, id).type === "skill" && canCommit(game, you, id, t),
      );
      if (!skills.length) return;
      const pick = run.choose<InstId>(
        skills.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { text: "Isabelle: commit a skill from your discard pile", key: "chooseFromDiscard" },
        { kind: CHOICE.Generic, who: you },
      );
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
      queue(
        game,
        dealDamage({
          inv: you,
          damage: 0,
          horror: 1,
          direct: true,
          source: run.ctx.source ?? null,
        }),
      );
    },
    reshuffle(game: GameContext, run: ScriptRun) {
      const id = flags.isabelle.get(game, String(run.ctx.testId));
      if (!id) return;
      flags.isabelle.clear(game, String(run.ctx.testId));
      const c = cardIf(game, id);
      if (c?.owner && c.zone === "discard") shuffleIntoDeck(game, id, c.owner);
    },
  },
} satisfies CardScript;
