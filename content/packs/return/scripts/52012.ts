// Unspeakable Oath (Curiosity) — as 52011 (Peril, Hidden, 2 fewer experience in hand at the end). [reaction] After you
// successfully investigate a location with no clues on it: discard it from your hand. The location is read as the
// reaction is offered, after the investigation's clue: taking its last clue leaves it with none.
import {
  card,
  type CardScript,
  currentTest,
  type EffCtx,
  type GameContext,
  inv,
} from "../../../../src/engine/api";
import { oath } from "./52011";

export default {
  ...oath,
  abilities: [
    {
      kind: "reaction",
      trigger: "successfulInvestigate",
      label: "Unspeakable Oath (Curiosity): discard it from your hand",
      condition: { all: [{ eventInvestigatorIsYou: true }, { script: "noClues" }] },
      effects: [{ op: "discardSelf" }],
    },
  ],
  conditions: {
    noClues: (game: GameContext, ctx: EffCtx) => {
      const where = currentTest(game)?.target ?? (ctx.you ? inv(game, ctx.you).location : null);
      return !!where && card(game, where).clues === 0;
    },
  },
} satisfies CardScript;
