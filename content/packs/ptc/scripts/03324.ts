// The King in Tatters (Dim Carcosa, act 3): [fast] with no clues on your location, each investigator's clues leave the
// game and your location flips to its story, which resolves (the scenario's flipLocation). Objective: Hastur is
// defeated (his own forced ability advances it). Back (Fin): the version defeated decides the resolution.
import {
  activeInvs,
  addCounter,
  type CardScript,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  inv,
  type ScriptRun,
  EVENT,
  queue,
  endScenario,
} from "../../../../src/engine/api";
import {
  canFlip,
  DEFEATED,
  flipLocation,
  HASTURS,
} from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  abilities: [
    {
      kind: "fast",
      usableBy: "anyone",
      label: "The King in Tatters: flip your location over",
      condition: { all: [{ cluesOnYourLocation: "none" }, { script: "canFlipHere" }] },
      run: "flipHere",
    },
    { kind: "revelation", run: "fin" },
  ],
  conditions: {
    canFlipHere: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && canFlip(game, inv(game, ctx.you).location),
  },
  fns: {
    flipHere(game: GameContext, run: ScriptRun) {
      const loc = inv(game, run.you).location;
      if (!canFlip(game, loc)) return;
      for (const i of activeInvs(game)) addCounter(game, i, "clues", -inv(game, i).clues);
      emit(game, EVENT.Remove, "Each investigator's clues are removed from the game", {});
      flipLocation(game, loc, run.you);
    },
    fin(game: GameContext) {
      const code = Object.keys(HASTURS).find((c) =>
        flags.rememberedFact.get(game, `${DEFEATED}:${c}`),
      );
      queue(game, endScenario({ id: code ? HASTURS[code] : "R1" }));
    },
  },
} satisfies CardScript;
