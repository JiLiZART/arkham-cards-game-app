// Mound of Bones (Return to The Pallid Mask; a Catacombs location) — Forced: when it is revealed, the top 4 Catacombs go
// into play above, below, to the left and to the right of it; at the end of that round, a Malformed Skeleton from the
// encounter deck or its discard pile spawns at it (the deck shuffled after the search).
import {
  type CardScript,
  flags,
  findByCode,
  type GameContext,
  moveCard,
  queue,
  type ScriptRun,
  shuffleDeck,
  spawn,
  ZONE,
} from "../../../../src/engine/api";
import { catacombsEach } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

const SKELETON = "52053";
const due = (self: string) => `rtpmMound:${self}`;

export default {
  abilities: [
    { kind: "forced", trigger: "revealed", run: "reveal" },
    { kind: "forced", trigger: "roundEnds", condition: { script: "skeletonDue" }, run: "skeleton" },
  ],
  conditions: {
    skeletonDue: (game: GameContext, ctx) =>
      !!ctx.source && flags.rememberedFact.get(game, due(ctx.source)) === true,
  },
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      catacombsEach(game, run.source, ["above", "below", "left", "right"]);
      flags.rememberedFact.set(game, due(run.source), true);
    },
    skeleton(game: GameContext, run: ScriptRun) {
      flags.rememberedFact.clear(game, due(run.source));
      const s = findByCode(game, SKELETON, [ZONE.EncounterDeck, ZONE.EncounterDiscard]);
      shuffleDeck(game, "encounter");
      if (!s) return;
      moveCard(game, s.id, ZONE.Limbo);
      queue(game, spawn({ enemy: s.id, inv: null, at: run.source }));
    },
  },
} satisfies CardScript;
