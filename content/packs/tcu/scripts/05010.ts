// Unsolved Case — place 1 of your clues on the location with the highest shroud; once in the threat area, Joe earns 2 fewer experience
import {
  addCounter,
  card,
  type CardScript,
  def,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  inv,
  locations,
  shroud,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "onPlay",
      condition: { youHaveClues: "some" },
      effects: [{ op: "script", fn: "placeClue" }, { op: "removeSelf" }],
    },
  ],
  fns: {
    placeClue(game: GameContext, run: ScriptRun) {
      const shown = locations(game).filter((l) => l.revealed && shroud(game, l.id) !== Infinity);
      const top = Math.max(...shown.map((l) => shroud(game, l.id)));
      const loc = run.chooseCard(
        shown.filter((l) => shroud(game, l.id) === top).map((l) => l.id),
        {
          text: "Unsolved Case: place 1 clue on the location with the highest shroud",
          key: "cardChooseLocation",
          vars: { card: run.ctx.source ?? null },
        },
      );
      const me = inv(game, run.you);
      if (me.clues < 1) return;
      addCounter(game, me.id, "clues", -1);
      addCounter(game, loc, "clues", 1);
      emit(game, EVENT.Clues, `${me.name} places 1 clue on ${def(game, loc).name}`, {
        inv: run.you,
        card: loc,
      });
    },
  },
  hooks: {
    gameEnd(game: GameContext, ctx: EffCtx) {
      const c = card(game, ctx.source!);
      if (c.zone === "threat" && c.controller) flags.xp.add(game, c.controller, -2);
    },
  },
} satisfies CardScript;
