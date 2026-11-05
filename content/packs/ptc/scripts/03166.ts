// Planning the Escape (The Unspeakable Oath, act 3) — the unrevealed side of the [[Arkham Asylum]] locations is
// ignored (its data); four of the six remembered plans advance it (the scenario's `checkObjectives`). Back: the
// encounter discard pile and every enemy beneath the act deck are shuffled into the encounter deck; with 3 or more
// Monsters among them, the investigator with the lowest [willpower] discards from the encounter deck until a Monster
// enemy is discarded and draws it.
import {
  activeInvs,
  cardsBeneath,
  type CardScript,
  def,
  emit,
  type GameContext,
  type InstId,
  leadInvestigator,
  moveCard,
  reshuffleDiscard,
  skillValue,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

/** "Shuffle the encounter discard pile and each enemy beneath the act deck into the encounter deck"; the Monsters moved */
export function underActToDeck(game: GameContext, act: InstId | null | undefined): number {
  const under = act ? [...cardsBeneath(game, act)] : [];
  let monsters = 0;
  for (const id of under) {
    if (def(game, id).type !== "enemy") continue;
    if (def(game, id).traits.includes("Monster")) monsters++;
    moveCard(game, id, ZONE.EncounterDeck);
  }
  reshuffleDiscard(game, "encounter");
  emit(
    game,
    EVENT.Shuffle,
    "The enemies beneath the act deck are shuffled into the encounter deck",
  );
  return monsters;
}

export default {
  abilities: [{ kind: "revelation", run: "aWayOut" }],
  fns: {
    aWayOut(game: GameContext, run: ScriptRun) {
      const act = run.source; // the advancing act, out of the act deck while its back resolves
      const moving = act
        ? cardsBeneath(game, act).filter((id) => def(game, id).traits.includes("Monster"))
        : [];
      let who = run.you;
      if (moving.length >= 3) {
        const low = Math.min(...activeInvs(game).map((i) => skillValue(game, i, "willpower")));
        who = run.chooseInvestigator(
          activeInvs(game).filter((i) => skillValue(game, i, "willpower") === low),
          { text: "The investigator with the lowest willpower", key: "tuoLowestWillpower" },
          { who: leadInvestigator(game) },
        );
      }
      const n = underActToDeck(game, act);
      if (n >= 3)
        queue(
          game,
          resolveEffect({
            effect: {
              op: "discardEncounterUntil",
              filter: { type: "enemy", trait: "Monster" },
              then: "youDraw",
            },
            ctx: { ...run.ctx, you: who },
          }),
        );
    },
  },
} satisfies CardScript;
