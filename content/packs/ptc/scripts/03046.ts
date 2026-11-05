// Awakening (Curtain Call, act 1) — back: one of the set-aside locations, at random, into play, and the set-aside The
// Man in the Pallid Mask spawns there. Which act 2 follows was drawn at random as the game began (the scenario's deck).
import {
  allCards,
  type CardScript,
  def,
  emit,
  findByCode,
  type GameContext,
  moveCard,
  randomInt,
  EVENT,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";
import { MITPM } from "./03059";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      const aside = allCards(game).filter(
        (c) => c.zone === ZONE.SetAside && def(game, c.id).type === "location",
      );
      if (!aside.length) return;
      const loc = aside[randomInt(game, aside.length)];
      moveCard(game, loc.id, ZONE.Location);
      emit(game, EVENT.Location, `${def(game, loc.id).name} is put into play`, { card: loc.id });
      const him = findByCode(game, MITPM, [ZONE.SetAside]);
      if (him) queue(game, spawn({ enemy: him.id, inv: null, at: loc.id }));
    },
  },
} satisfies CardScript;
