// Beyond the Veil — into your threat area unless a copy is already there; once your deck is empty: 10 damage, then it
// is discarded
import {
  card,
  type CardScript,
  type GameContext,
  inv,
  threatArea,
  type ScriptRun,
  queue,
  resolveEffects,
} from "../../../../src/engine/api";

const DOOM = [{ op: "takeDamage" as const, amount: 10 }, { op: "discardSelf" as const }];

export default {
  abilities: [
    { kind: "revelation", run: "veil" },
    { kind: "forced", trigger: "deckEmptied", effects: DOOM },
  ],
  fns: {
    veil(game: GameContext, run: ScriptRun) {
      const code = card(game, run.source).code;
      if (threatArea(game, run.you).some((c) => c.code === code)) return;
      queue(
        game,
        resolveEffects({ effects: [{ op: "putInThreatArea" }], ctx: run.ctx }),
        // "if your deck has no cards in it": already so as it arrives
        ...(inv(game, run.you).deck.length
          ? []
          : [resolveEffects({ effects: DOOM, ctx: run.ctx })]),
      );
    },
  },
} satisfies CardScript;
