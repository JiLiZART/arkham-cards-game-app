// Hastur (The Tattered King) (Dim Carcosa): prey most remaining sanity, hunter (data); damaged only by story cards.
// While an investigator with no remaining sanity attacks or evades him, each [elder_sign], +1, 0 or -1 they reveal is
// an [auto_fail]. With the King in Yellow's shared abilities (03332). Lord of Carcosa (03333) is the same.
import {
  type CardScript,
  currentTest,
  type EffCtx,
  type GameContext,
  remainingSanity,
  treatTokenAs,
} from "../../../../src/engine/api";
import { hastur } from "./03332";

const MILD = ["elderSign", "+1", "0", "-1"];

export const tattered = {
  abilities: [
    ...hastur.abilities,
    {
      kind: "forced" as const,
      trigger: "tokenRevealed" as const,
      condition: { script: "insaneAgainstHim" },
      run: "autoFail",
    },
  ],
  conditions: {
    ...hastur.conditions,
    insaneAgainstHim(game: GameContext, ctx: EffCtx) {
      const t = currentTest(game);
      return (
        !!t &&
        (t.kind === "fight" || t.kind === "evade") &&
        t.target === ctx.source &&
        remainingSanity(game, t.inv) === 0 &&
        MILD.includes(String(ctx.token ?? t.tokens.at(-1)))
      );
    },
  },
  fns: {
    ...hastur.fns,
    autoFail(game: GameContext) {
      treatTokenAs(game, "autoFail");
    },
  },
};

export default tattered satisfies CardScript;
