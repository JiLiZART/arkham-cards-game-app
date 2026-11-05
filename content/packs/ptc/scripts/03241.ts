// Empire of the Dead (The Pallid Mask, agenda 1): each location is connected to each adjacent one (the scenario's
// orthogonal adjacency). On the first turn the starting location's Forced ability resolves, then the secret passageway
// if it was opened. Back: Specter of Death, which spawns at the starting location.
import {
  type CardScript,
  createCard,
  type EffCtx,
  flags,
  type GameContext,
  type ScriptRun,
  ZONE,
  queue,
  openWindow,
  runScript,
  spawn,
} from "../../../../src/engine/api";
import {
  PASSAGEWAY,
  START_PENDING,
  startLocation,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export const SPECTER = "03241b";

export default {
  abilities: [
    { kind: "forced", trigger: "turnBegins", condition: { script: "startPending" }, run: "begin" },
    { kind: "revelation", run: "specter" },
  ],
  conditions: {
    startPending: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv && !!flags.rememberedFact.get(game, START_PENDING),
  },
  fns: {
    /** "Remember to trigger the Forced effect on that location when it is revealed" */
    begin(game: GameContext, run: ScriptRun) {
      flags.rememberedFact.clear(game, START_PENDING);
      const start = startLocation(game);
      if (!start) return;
      queue(
        game,
        openWindow("revealed", { location: start, inv: run.you }),
        ...(flags.rememberedFact.get(game, PASSAGEWAY)
          ? [runScript({ code: "03241", fn: "passageway", ctx: { you: run.you, source: null } })]
          : []),
      );
    },
    specter(game: GameContext) {
      const start = startLocation(game);
      if (!start) return;
      queue(game, spawn({ enemy: createCard(game, SPECTER, ZONE.SetAside), inv: null, at: start }));
    },
  },
} satisfies CardScript;
