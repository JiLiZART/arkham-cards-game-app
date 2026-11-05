// Outer Wall (Black Stars Rise, version II) — while the current "c" agenda has more doom than the current "a" agenda,
// the skill icons on cards committed to skill tests at the Outer Wall count twice.
import {
  type CardScript,
  currentTest,
  def,
  type GameContext,
  type InstId,
  inv,
} from "../../../../src/engine/api";
import { agendaOf, doomOf } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  modifiers(game: GameContext, self: InstId) {
    const t = currentTest(game);
    if (!t || t.committedCancelled || inv(game, t.inv).location !== self) return [];
    if (!agendaOf(game, "a") || !agendaOf(game, "c") || doomOf(game, "c") <= doomOf(game, "a"))
      return [];
    const icons = t.committed.reduce((n, id) => {
      const i = def(game, id).icons ?? {};
      return n + (i[t.skill] ?? 0) + (i.wild ?? 0);
    }, 0);
    return icons ? [{ target: t.inv, mod: { stat: "testValue" as const, value: icons } }] : [];
  },
} satisfies CardScript;
