// The Terrifying Truth (The Last King, agenda 2) — when it would advance by its doom: instead, all doom in play is
// removed and one of the Sickening Reality cards beneath the scenario reference card, at random, is resolved; with none
// left there it advances to 2b, (→R3).
import {
  allCards,
  type CardScript,
  cardsBeneath,
  emit,
  type GameContext,
  type HookRun,
  randomInt,
  setCounter,
  EVENT,
  ZONE,
  queue,
  resolveStory,
} from "../../../../src/engine/api";

const DOOM_ZONES: string[] = [
  ZONE.Agenda,
  ZONE.Act,
  ZONE.Enemy,
  ZONE.Location,
  ZONE.Play,
  ZONE.Attached,
  ZONE.Threat,
];

export default {
  abilities: [{ kind: "revelation", effects: [{ op: "resolution", id: "R3" }] }],
  hooks: {
    doomThreshold(game: GameContext, run: HookRun) {
      const scenario = allCards(game).find((c) => c.zone === ZONE.Scenario);
      const pile = scenario ? cardsBeneath(game, scenario.id) : [];
      if (!pile.length) return false;
      for (const c of allCards(game))
        if (c.doom && DOOM_ZONES.includes(c.zone)) setCounter(game, c.id, "doom", 0);
      emit(game, EVENT.Doom, "All doom in play is removed");
      queue(game, resolveStory({ card: pile[randomInt(game, pile.length)], you: run.you }));
      return true;
    },
  },
} satisfies CardScript;
