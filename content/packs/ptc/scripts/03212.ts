// Opéra Garnier (A Phantom of Truth, version I) — while you investigate it, the skill icons committed to the test count
// twice.
import {
  type CardScript,
  currentTest,
  def,
  type GameContext,
  type InstId,
} from "../../../../src/engine/api";

/** the investigation of this location under way, if any */
export const investigatingHere = (game: GameContext, self: InstId) => {
  const t = currentTest(game);
  return t?.kind === "investigate" && t.target === self ? t : null;
};

export default {
  modifiers(game: GameContext, self: InstId) {
    const t = investigatingHere(game, self);
    if (!t || t.committedCancelled) return [];
    const icons = t.committed.reduce((n, id) => {
      const i = def(game, id).icons ?? {};
      return n + (i[t.skill] ?? 0) + (i.wild ?? 0);
    }, 0);
    return icons ? [{ target: t.inv, mod: { stat: "testValue", value: icons } }] : [];
  },
} satisfies CardScript;
