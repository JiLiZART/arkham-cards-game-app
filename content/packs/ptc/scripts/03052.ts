// Backstage (Curtain Call) — revealed: 2 of the set-aside Backstage Doorways into play, at random; while you are there,
// each hidden treachery in your hand counts as 3 cards toward your hand size.
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import { doorways } from "./03050";

export default {
  abilities: [
    { kind: "forced", trigger: "revealed", run: "doorways" },
    {
      kind: "constant",
      modifiers: [{ stat: "hiddenHandWeight", value: 2, scope: "investigatorsAtLocation" }],
    },
  ],
  fns: {
    doorways(game: GameContext) {
      doorways(game, ["03056", "03057", "03058"]);
    },
  },
} satisfies CardScript;
