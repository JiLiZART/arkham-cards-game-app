// Rift Seeker (Black Stars Rise) — Forced: after it attacks you, take 1 more damage and 1 more horror, or place 1 doom
// on each agenda in play. [action] Place 1 doom on each agenda in play and take 2 horror: Parley. Discard it.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  dealDamage,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "forced", trigger: "enemyAttacked", run: "aftermath" },
    {
      kind: "action",
      designator: "parley",
      usableBy: "atLocation",
      label: "Rift Seeker: 1 doom on each agenda and take 2 horror to discard it",
      cost: { takeHorror: 2 },
      effects: [{ op: "placeDoom", amount: 1, on: "eachAgenda" }, { op: "discardSelf" }],
    },
  ],
  fns: {
    aftermath(game: GameContext, run: ScriptRun) {
      const pick = run.choose<string>(
        [
          {
            id: "hurt",
            label: "Take 1 additional damage and 1 additional horror",
            value: "hurt",
            key: "option.bsrRiftHurt",
          },
          {
            id: "doom",
            label: "Place 1 doom on each agenda in play",
            value: "doom",
            key: "option.bsrRiftDoom",
          },
        ],
        { text: "Rift Seeker: choose one", key: "bsrRiftSeeker" },
      );
      queue(
        game,
        pick === "hurt"
          ? dealDamage({ inv: run.you, damage: 1, horror: 1, direct: false, source: run.source })
          : resolveEffect({
              effect: { op: "placeDoom", amount: 1, on: "eachAgenda" },
              ctx: { you: run.you, source: run.source },
            }),
      );
    },
  },
} satisfies CardScript;
