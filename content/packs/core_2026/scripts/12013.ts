// Isabelle Barnes — take 1 direct horror to commit a skill from your discard pile; after the test it is shuffled into your deck
import {
  ask,
  canCommit,
  card,
  cardIf,
  type CardScript,
  currentTest,
  def,
  type EffCtx,
  emit,
  flags,
  type G,
  type InstId,
  inv,
  moveCard,
  push,
  shuffleIntoDeck,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    fromDiscard(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const t = currentTest(g);
      const you = ctx.you!;
      if (!t) return;
      const skills = inv(g, you).discard.filter(
        (id) => def(g, id).type === "skill" && canCommit(g, you, id, t),
      );
      if (!skills.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        you,
        "generic",
        "Isabelle: commit a skill from your discard pile",
        skills.map((id) => ({ id, label: def(g, id).name, card: id, value: id })),
        { auto: true, key: "chooseFromDiscard" },
      );
      if (pick === undefined) return;
      moveCard(g, pick, "commit");
      card(g, pick).controller = you;
      t.committed.push(pick);
      t.committers.push(you);
      flags.isabelle.set(g, String(t.id), pick);
      emit(g, "commit", `${inv(g, you).name} commits ${def(g, pick).name} from the discard pile`, {
        inv: you,
        card: pick,
      });
      push(g, {
        t: "AssignDamage",
        inv: you,
        damage: 0,
        horror: 1,
        direct: true,
        source: ctx.source ?? null,
      });
    },
    reshuffle(g: G, ctx: EffCtx) {
      const id = flags.isabelle.get(g, String(ctx.testId));
      if (!id) return;
      flags.isabelle.clear(g, String(ctx.testId));
      const c = cardIf(g, id);
      if (c?.owner && c.zone === "discard") shuffleIntoDeck(g, id, c.owner);
    },
  },
} satisfies CardScript;
