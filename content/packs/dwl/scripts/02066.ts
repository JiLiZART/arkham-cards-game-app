// Beginner's Luck (The House Always Wins, act 1) — when you reveal a chaos token you may treat it as any other token in
// the bag, and you have "cheated" (group limit once per round); back: the Darkened Hall into play, and on agenda 1 a
// Criminal enemy from the encounter deck spawns there
import {
  cardIf,
  type CardScript,
  chaosBag,
  currentAgenda,
  flags,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
  treatTokenAs,
} from "../../../../src/engine/api";
import { putLocationIntoPlay } from "./02043";

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "tokenRevealed",
      label: "Beginner's Luck: cheat (treat the token as another in the bag)",
      limit: { per: "round", count: 1, group: true },
      run: "cheat",
    },
    { kind: "revelation", run: "back" },
  ],
  fns: {
    cheat(game: GameContext, run: ScriptRun) {
      const tokens = [...new Set(chaosBag(game))];
      if (!tokens.length) return;
      const token = run.choose<(typeof tokens)[number]>(
        tokens.map((t) => ({ id: t, label: t, value: t })),
        { text: "Treat the token as which other token of the bag?", key: "cheatToken" },
        { auto: false },
      );
      treatTokenAs(game, token);
      flags.remembered.set(game, ["cheated", run.you], true);
    },
    back(game: GameContext, run: ScriptRun) {
      putLocationIntoPlay(game, "02074");
      if (cardIf(game, currentAgenda(game))?.code !== "02063") return;
      queue(
        game,
        resolveEffect({
          effect: {
            op: "discardEncounterUntil",
            filter: { type: "enemy", trait: "Criminal" },
            then: "spawnAt",
            at: "Darkened Hall",
          },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
