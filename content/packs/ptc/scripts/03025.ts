// Archaic Glyphs — discarding a card with an [intellect] icon places a secret on it; after the third it is discarded,
// its controller gains 5 resources and the campaign log records that "you have translated the glyphs" (the Researched
// Archaic Glyphs need it)
import {
  addTokens,
  type CardScript,
  def,
  discard,
  type EffCtx,
  emit,
  EVENT,
  flags,
  type GameContext,
  inv,
  queue,
  resolveEffect,
  type ScriptRun,
  tokensOn,
} from "../../../../src/engine/api";

/** the campaign log entry the Researched Archaic Glyphs (03192, 03193) need */
const TRANSLATED = "translatedTheGlyphs";

const withIntellect = (game: GameContext, you: string) =>
  inv(game, you).hand.filter((h) => (def(game, h).icons.intellect ?? 0) > 0);

export default {
  abilities: [
    {
      kind: "action",
      label: "Archaic Glyphs: discard a card with an intellect icon to place a secret",
      condition: { script: "hasIntellectCard" },
      run: "secret",
    },
  ],
  conditions: {
    hasIntellectCard: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && withIntellect(game, ctx.you).length > 0,
  },
  fns: {
    secret(game: GameContext, run: ScriptRun) {
      const ids = withIntellect(game, run.you);
      if (!ids.length) return;
      const pick = run.choose<string>(
        ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        {
          text: "Choose a card with an intellect icon to discard",
          key: "discardForCost",
          vars: { card: run.source },
        },
      );
      discard(game, pick);
      addTokens(game, run.source, "secrets", 1);
      if (tokensOn(game, run.source, "secrets") < 3) return;
      // Forced - after the third secret
      discard(game, run.source);
      flags.logEntry.set(game, ["", TRANSLATED], true);
      emit(game, EVENT.Place, `${inv(game, run.you).name} has translated the glyphs`, {
        inv: run.you,
      });
      queue(
        game,
        resolveEffect({ effect: { op: "gainResources", amount: 5 }, ctx: { you: run.you } }),
      );
    },
  },
} satisfies CardScript;
