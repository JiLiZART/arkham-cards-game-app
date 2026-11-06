// The King in Yellow — in the threat area it cannot leave play (cards.json) except by its reaction: after a successful
// test to which Minh Thi Phan committed at least 6 icons matching the skill tested, it is discarded
import {
  card,
  type CardScript,
  currentTest,
  def,
  type EffCtx,
  emit,
  EVENT,
  flags,
  type GameContext,
  moveCard,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const MINH = "03002";

/** the matching icons (the tested skill's, and wild) Minh committed to the test under way */
function minhIcons(game: GameContext): number {
  const t = currentTest(game);
  if (!t) return 0;
  return t.committed.reduce((n, c, k) => {
    if (t.committers[k] !== MINH) return n;
    const printed = def(game, c).icons;
    const gained = flags.gainedIcons.get(game, c) ?? {};
    return (
      n +
      (printed[t.skill] ?? 0) +
      (printed.wild ?? 0) +
      (gained[t.skill] ?? 0) +
      (gained.wild ?? 0)
    );
  }, 0);
}

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "skillTestSucceeded",
      label: "The King in Yellow: discard it",
      usableBy: "anyone",
      condition: { script: "sixIcons" },
      run: "discardIt",
    },
  ],
  conditions: {
    sixIcons: (game: GameContext, ctx: EffCtx) =>
      !!ctx.source && card(game, ctx.source).controller === ctx.you && minhIcons(game) >= 6,
  },
  fns: {
    discardIt(game: GameContext, run: ScriptRun) {
      // "it cannot leave play except through the [reaction] ability below": this is that way out
      moveCard(game, run.source, ZONE.Discard, { inv: card(game, run.source).owner, ownWay: true });
      emit(game, EVENT.Discard, "The King in Yellow is discarded", { card: run.source });
    },
  },
} satisfies CardScript;
