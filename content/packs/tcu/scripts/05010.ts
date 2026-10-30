// Unsolved Case — place 1 of your clues on the location with the highest shroud; once in the threat area, Joe earns 2 fewer experience
import {
  ask,
  card,
  def,
  emit,
  inv,
  locations,
  shroud,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
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
    placeClue(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const shown = locations(g).filter((l) => l.revealed && shroud(g, l.id) !== Infinity);
      const top = Math.max(...shown.map((l) => shroud(g, l.id)));
      const loc = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Unsolved Case: place 1 clue on the location with the highest shroud",
        shown
          .filter((l) => shroud(g, l.id) === top)
          .map((l) => ({ id: l.id, label: def(g, l.id).name, card: l.id, value: l.id })),
        { auto: true, key: "cardChooseLocation", vars: { card: ctx.source ?? null } },
      );
      if (loc === undefined) return;
      const me = inv(g, ctx.you!);
      if (me.clues < 1) return;
      me.clues--;
      card(g, loc).clues++;
      emit(g, "clues", `${me.name} places 1 clue on ${def(g, loc).name}`, {
        inv: ctx.you!,
        card: loc,
      });
    },
  },
  hooks: {
    gameEnd(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      if (c.zone === "threat" && c.controller)
        g.s.flags[`xp:${c.controller}`] = ((g.s.flags[`xp:${c.controller}`] as number) ?? 0) - 2;
    },
  },
} satisfies CardScript;
