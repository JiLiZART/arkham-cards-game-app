// Twin Suns (A Phantom of Truth) — test [intellect] (4); a failure: remove 1 doom from the current agenda, or take 1
// horror for each point you failed by (the doom only while the agenda has some).
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
  dealDamage,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [
        {
          op: "skillTest",
          skill: "intellect",
          difficulty: 4,
          onFail: [{ op: "script", fn: "eclipse" }],
        },
      ],
    },
  ],
  fns: {
    eclipse(game: GameContext, run: ScriptRun) {
      const agenda = currentAgenda(game);
      const failBy = run.ctx.failBy ?? 0;
      const doom = !!agenda && card(game, agenda).doom > 0;
      const pick = doom
        ? run.choose<string>(
            [
              {
                id: "doom",
                label: "Remove 1 doom from the current agenda",
                value: "doom",
                key: "option.removeAgendaDoom",
              },
              {
                id: "horror",
                label: `Take ${failBy} horror`,
                value: "horror",
                key: "option.takeHorrorN",
                vars: { n: failBy },
              },
            ],
            { text: "Twin Suns: choose one", key: "twinSuns" },
            { auto: false },
          )
        : "horror";
      if (pick === "doom" && agenda) {
        addCounter(game, agenda, "doom", -1);
        emit(game, EVENT.Doom, "1 doom is removed from the agenda", {
          card: agenda,
          data: { n: -1 },
        });
        return;
      }
      if (failBy)
        queue(
          game,
          dealDamage({
            inv: run.you,
            damage: 0,
            horror: failBy,
            direct: false,
            source: run.source,
          }),
        );
    },
  },
} satisfies CardScript;
