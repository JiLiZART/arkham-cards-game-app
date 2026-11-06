// Guidance — another investigator at your location who has yet to take their turn this round takes an additional action
// during it
import {
  activeInvestigator,
  addTempMod,
  type CardScript,
  type EffCtx,
  type GameContext,
  inv,
  invsAt,
  type InvId,
  type ScriptRun,
} from "../../../../src/engine/api";

/** the others at your location whose turn this round is still to come */
const waiting = (game: GameContext, you: InvId): InvId[] =>
  invsAt(game, inv(game, you).location).filter(
    (i) => i !== you && !inv(game, i).turnDone && activeInvestigator(game) !== i,
  );

export default {
  abilities: [{ kind: "onPlay", condition: { script: "someoneWaits" }, run: "guide" }],
  conditions: {
    someoneWaits: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && waiting(game, ctx.you).length > 0,
  },
  fns: {
    guide(game: GameContext, run: ScriptRun) {
      const who = waiting(game, run.you);
      if (!who.length) return;
      const pick = run.chooseInvestigator(who, {
        text: "Guidance: choose an investigator to take an additional action",
        key: "guidance",
      });
      addTempMod(game, { stat: "additionalActions", value: 1 }, pick, "round", run.source);
    },
  },
} satisfies CardScript;
