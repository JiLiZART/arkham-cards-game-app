// Logical Reasoning (Return to The Path to Carcosa, level 4) — for each clue you have (up to 3), an investigator at your
// location heals 2 horror or discards a [[Terror]] card from their threat area, as Logical Reasoning (03191) does once
import {
  type CardScript,
  type EffCtx,
  type GameContext,
  inv,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";

const once = (ctx: EffCtx) =>
  resolveEffect({
    effect: {
      op: "forInvestigator",
      target: "chooseAtLocation",
      effects: [
        {
          op: "chooseOne",
          options: [
            { label: "Heal 2 horror", effects: [{ op: "heal", horror: 2 }] },
            {
              label: "Discard a Terror card from your threat area",
              condition: { inThreatArea: { trait: "Terror" } },
              effects: [{ op: "discardThreat", filter: { trait: "Terror" } }],
            },
          ],
        },
      ],
    },
    ctx,
  });

export default {
  abilities: [{ kind: "onPlay", run: "reason" }],
  fns: {
    reason(game: GameContext, run: ScriptRun) {
      const times = Math.min(inv(game, run.you).clues, 3);
      queue(game, ...Array.from({ length: times }, () => once(run.ctx)));
    },
  },
} satisfies CardScript;
