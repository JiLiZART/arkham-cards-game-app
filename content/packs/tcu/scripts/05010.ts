// Unsolved Case — place 1 of your clues on the location with the highest shroud; once in the threat area, Joe earns 2 fewer experience
import {
  addCounter,
  ask,
  card,
  type CardScript,
  def,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  type InstId,
  inv,
  locations,
  shroud,
  type Step,
  EVENT,
  CHOICE,
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
    placeClue(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const shown = locations(game).filter((l) => l.revealed && shroud(game, l.id) !== Infinity);
      const top = Math.max(...shown.map((l) => shroud(game, l.id)));
      const loc = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Unsolved Case: place 1 clue on the location with the highest shroud",
        shown
          .filter((l) => shroud(game, l.id) === top)
          .map((l) => ({ id: l.id, label: def(game, l.id).name, card: l.id, value: l.id })),
        { auto: true, key: "cardChooseLocation", vars: { card: ctx.source ?? null } },
      );
      if (loc === undefined) return;
      const me = inv(game, ctx.you!);
      if (me.clues < 1) return;
      addCounter(game, me.id, "clues", -1);
      addCounter(game, loc, "clues", 1);
      emit(game, EVENT.Clues, `${me.name} places 1 clue on ${def(game, loc).name}`, {
        inv: ctx.you!,
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
