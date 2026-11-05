// Faculty Offices (The Night is Still Young) — unrevealed: you cannot move into it; revealed: a Humanoid enemy from the
// encounter deck or discard pile spawns here; objective: investigators here spend 2 [per_investigator] clues, as a
// group: (→R1)
import {
  type CardScript,
  def,
  type EffCtx,
  type GameContext,
  pile,
  shuffleDeck,
  ZONE,
  type ScriptRun,
  queue,
  endScenario,
  spawn,
} from "../../../../src/engine/api";
import { canSpendHere, locked, spendHere } from "./02052";

export default {
  modifiers: locked,
  abilities: [
    { kind: "forced", trigger: "revealed", run: "humanoid" },
    {
      kind: "fast",
      label: "Faculty Offices: spend 2 clues per investigator, as a group (→R1)",
      usableBy: "atLocation",
      condition: { script: "canSpend" },
      run: "objective",
    },
  ],
  conditions: {
    canSpend: (game: GameContext, ctx: EffCtx) => !!ctx.source && canSpendHere(game, ctx.source, 2),
  },
  fns: {
    humanoid(game: GameContext, run: ScriptRun) {
      const found = [
        ...pile(game, ZONE.EncounterDeck),
        ...pile(game, ZONE.EncounterDiscard),
      ].filter((id) => def(game, id).type === "enemy" && def(game, id).traits.includes("Humanoid"));
      const pick = found.length
        ? run.chooseCard(found, {
            text: "Choose a Humanoid enemy to spawn in the Faculty Offices",
            key: "facultyOfficesHumanoid",
          })
        : undefined;
      shuffleDeck(game, "encounter");
      if (pick) queue(game, spawn({ enemy: pick, inv: run.you, at: run.source }));
    },
    objective(game: GameContext, run: ScriptRun) {
      spendHere(game, run, run.source, 2);
      queue(game, endScenario({ id: "R1" }));
    },
  },
} satisfies CardScript;
