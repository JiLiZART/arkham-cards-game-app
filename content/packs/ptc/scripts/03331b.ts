// Hastur's End (Dim Carcosa, the story of the Palace of the King): remember that you "know the secret"; the card flips
// back and can't be flipped again. Agenda 3 then lets Hastur be defeated: if he already has damage enough, he is.
import {
  type CardScript,
  enemyStat,
  flags,
  type GameContext,
  type ScriptRun,
  queue,
  defeatEnemy,
} from "../../../../src/engine/api";
import {
  agendaIs,
  hastur,
  lock,
  MADNESS_DIES,
  SECRET,
} from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  abilities: [{ kind: "revelation", run: "secret" }],
  fns: {
    secret(game: GameContext, run: ScriptRun) {
      lock(game, run.source);
      flags.rememberedFact.set(game, SECRET, true);
      const h = hastur(game);
      if (h && agendaIs(game, MADNESS_DIES) && h.damage >= enemyStat(game, h.id, "health"))
        queue(game, defeatEnemy({ enemy: h.id, by: run.you }));
    },
  },
} satisfies CardScript;
