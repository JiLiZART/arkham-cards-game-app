// Opéra Garnier (A Phantom of Truth, version II) — while you investigate it, your skill's base value counts twice.
import {
  baseSkill,
  type CardScript,
  type GameContext,
  type InstId,
} from "../../../../src/engine/api";
import { investigatingHere } from "./03212";

export default {
  modifiers(game: GameContext, self: InstId) {
    const t = investigatingHere(game, self);
    return t
      ? [{ target: t.inv, mod: { stat: "testValue", value: baseSkill(game, t.inv, t.skill) } }]
      : [];
  },
} satisfies CardScript;
