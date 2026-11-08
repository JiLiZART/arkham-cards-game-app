// Grand Guignol, Theatre of the Great Puppet (Return to A Phantom of Truth) — [action] spend 5 resources: place 1 doom on
// the current agenda, or remove 1 from it (group limit once per game).
import {
  addCounter,
  card,
  type CardScript,
  currentAgenda,
  emit,
  EVENT,
  type GameContext,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Grand Guignol: spend 5 resources to place or remove 1 doom on the current agenda",
      cost: { resources: 5 },
      limit: { per: "game", count: 1, group: true },
      run: "puppet",
    },
  ],
  fns: {
    puppet(game: GameContext, run: ScriptRun) {
      const agenda = currentAgenda(game);
      if (!agenda) return;
      const how = run.choose<"place" | "remove">(
        [
          {
            id: "place",
            label: "Place 1 doom on the current agenda",
            value: "place",
            key: "option.grandGuignol.place",
          },
          ...(card(game, agenda).doom > 0
            ? [
                {
                  id: "remove",
                  label: "Remove 1 doom from the current agenda",
                  value: "remove" as const,
                  key: "option.grandGuignol.remove",
                },
              ]
            : []),
        ],
        { text: "Grand Guignol: choose one", key: "grandGuignol" },
      );
      if (how === "place") {
        queue(
          game,
          resolveEffect({
            effect: { op: "placeDoom", amount: 1, on: "agenda" },
            ctx: run.ctx,
          }),
          resolveEffect({ effect: { op: "checkDoom" }, ctx: run.ctx }),
        );
        return;
      }
      addCounter(game, agenda, "doom", -1);
      emit(game, EVENT.Doom, "1 doom is removed from the current agenda", {
        card: agenda,
        data: { n: -1 },
      });
    },
  },
} satisfies CardScript;
