// Notre-Dame (A Phantom of Truth) — enemies there get -1 fight and +1 evade. [action]: test [willpower] (6); a success
// places 1 doom on the current agenda or removes 1 from it. (Group limit once per game.)
import {
  addCounter,
  card,
  type CardScript,
  currentAgenda,
  emit,
  type GameContext,
  type ScriptRun,
  EVENT,
  queue,
  checkDoom,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "constant",
      modifiers: [
        { stat: "fight", value: -1, scope: "enemiesAtLocation" },
        { stat: "evade", value: 1, scope: "enemiesAtLocation" },
      ],
    },
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Notre-Dame: test willpower (6) to place or remove 1 doom on the agenda",
      limit: { per: "game", count: 1, group: true },
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 6,
          onSuccess: [{ op: "script", fn: "prayer" }],
        },
      ],
    },
  ],
  fns: {
    prayer(game: GameContext, run: ScriptRun) {
      const agenda = currentAgenda(game);
      if (!agenda) return;
      const pick = card(game, agenda).doom
        ? run.choose<number>(
            [
              {
                id: "place",
                label: "Place 1 doom on the current agenda",
                value: 1,
                key: "option.placeAgendaDoom",
              },
              {
                id: "remove",
                label: "Remove 1 doom from the current agenda",
                value: -1,
                key: "option.removeAgendaDoom",
              },
            ],
            { text: "Notre-Dame: choose one", key: "notreDame" },
            { auto: false },
          )
        : 1;
      addCounter(game, agenda, "doom", pick);
      emit(
        game,
        EVENT.Doom,
        `${pick > 0 ? "1 doom is placed on" : "1 doom is removed from"} the agenda`,
        {
          card: agenda,
          data: { n: pick },
        },
      );
      if (pick > 0) queue(game, checkDoom());
    },
  },
} satisfies CardScript;
