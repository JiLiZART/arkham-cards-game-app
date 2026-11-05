// Infinite Doorway — attached to your location; moving into or out of it costs the top card of your deck: a weakness is
// drawn, any other card makes you take 1 horror or discard each copy of it (by title) in your hand or play area
import {
  type CardScript,
  controlled,
  def,
  discard,
  discardTop,
  drawCards,
  type GameContext,
  inv,
  moveCard,
  queue,
  resolveEffect,
  runScript,
  type ScriptRun,
  asStrings,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "revelation", effects: [{ op: "attachToLocation", where: "yours" }] },
    { kind: "forced", trigger: "wouldMoveOut", run: "doorway" },
    { kind: "forced", trigger: "wouldMoveIn", run: "doorway" },
  ],
  fns: {
    doorway(game: GameContext, run: ScriptRun) {
      const [top] = discardTop(game, run.you, 1);
      if (!top) return;
      if (def(game, top).subtype) {
        moveCard(game, top, ZONE.Deck, { inv: run.you, top: true });
        queue(game, drawCards({ inv: run.you, n: 1 }));
        return;
      }
      const name = def(game, top).name;
      const copies = [
        ...inv(game, run.you).hand,
        ...controlled(game, run.you).map((c) => c.id),
      ].filter((id) => def(game, id).name === name);
      if (copies.length)
        queue(game, runScript({ code: "51063", fn: "copy", ctx: run.ctx, args: copies }));
    },
    /** one copy a step: 1 horror, or the copy discarded */
    copy(game: GameContext, run: ScriptRun) {
      const [id, ...rest] = asStrings(run.args);
      if (!id) return;
      const horror = run.choose<boolean>(
        [
          { id: "horror", label: "Take 1 horror", value: true, key: "option.take1Horror" },
          {
            id: "discard",
            label: "Discard the copy",
            value: false,
            card: id,
            key: "option.discardCopy",
          },
        ],
        {
          text: `Infinite Doorway: take 1 horror or discard ${def(game, id).name}`,
          key: "infiniteDoorway",
        },
        { auto: false },
      );
      if (!horror) discard(game, id);
      queue(
        game,
        ...(horror
          ? [resolveEffect({ effect: { op: "takeHorror", amount: 1 }, ctx: run.ctx })]
          : []),
        ...(rest.length
          ? [runScript({ code: "51063", fn: "copy", ctx: run.ctx, args: rest })]
          : []),
      );
    },
  },
} satisfies CardScript;
