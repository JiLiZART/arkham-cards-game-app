// Lucky Charm — move 1 damage or 1 horror from a card at your location to a card you control
import {
  addCounter,
  card,
  type CardScript,
  controlled,
  def,
  type EffCtx,
  emit,
  type GameContext,
  inv,
  invIf,
  invsAt,
  push,
  EVENT,
  CHOICE,
  STEP,
  type ScriptRun,
  argField,
  asString,
} from "../../../../src/engine/api";

type Kind = "damage" | "horror";
/** an investigator (by id) or an asset (by instance id): what it holds, and what it can take without being defeated
 *  (ponytail: a move never defeats; add the defeat checks if a card ever wants to) */
type Holder = { id: string; label: string; card: string; held: number; room: number };

function holders(game: GameContext, ids: string[], kind: Kind): Holder[] {
  return ids.flatMap((id): Holder[] => {
    const i = invIf(game, id);
    if (i) {
      const d = def(game, i.cardId);
      const cap = (kind === "damage" ? d.health : d.sanity) ?? 0;
      return [{ id, label: i.name, card: i.cardId, held: i[kind], room: cap - i[kind] - 1 }];
    }
    const c = card(game, id);
    const cap = (kind === "damage" ? def(game, id).health : def(game, id).sanity) ?? 0;
    return cap
      ? [{ id, label: def(game, id).name, card: id, held: c[kind], room: cap - c[kind] - 1 }]
      : [];
  });
}

function adjust(game: GameContext, id: string, kind: Kind, n: number) {
  addCounter(game, id, kind, n);
}

/** the investigators and assets at your location (a move's sources), and you and your assets (its destinations) */
function places(game: GameContext, you: string) {
  const here = invsAt(game, inv(game, you).location);
  return {
    atLocation: [...here, ...here.flatMap((i) => controlled(game, i).map((c) => c.id))],
    mine: [you, ...controlled(game, you).map((c) => c.id)],
  };
}

/** the kinds of token that can be moved: one a card at your location holds, to another card of yours with room */
function movable(game: GameContext, you: string): Kind[] {
  const { atLocation, mine } = places(game, you);
  return (["damage", "horror"] as Kind[]).filter((k) =>
    holders(game, atLocation, k).some(
      (from) =>
        from.held > 0 && holders(game, mine, k).some((to) => to.id !== from.id && to.room > 0),
    ),
  );
}

export default {
  abilities: [
    {
      kind: "fast",
      label: "Lucky Charm: move 1 damage or 1 horror",
      cost: { uses: 1, exhaust: true },
      condition: { script: "canMove" },
      run: "move",
    },
  ],
  conditions: {
    canMove: (game: GameContext, ctx: EffCtx) => !!ctx.you && movable(game, ctx.you).length > 0,
  },
  fns: {
    move(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const { atLocation, mine } = places(game, you);
      const argKind = asString(argField(run.args, "kind"));
      const argFrom = asString(argField(run.args, "from"));
      if (argKind !== "damage" && argKind !== "horror") {
        const kinds = movable(game, you);
        if (!kinds.length) return;
        const kind = run.choose<Kind>(
          kinds.map((k) => ({ id: k, label: `Move 1 ${k}`, value: k })),
          { text: "Lucky Charm: move damage or horror?", key: "chooseOne" },
          { kind: CHOICE.Generic, who: you },
        );
        push(game, { t: STEP.Script, code: "12061", fn: "move", ctx: run.ctx, args: { kind } });
        return;
      }
      const kind: Kind = argKind;
      if (!argFrom) {
        const from = run.choose<string>(
          holders(game, atLocation, kind)
            .filter((h) => h.held > 0)
            .map((h) => ({ id: h.id, label: h.label, card: h.card, value: h.id })),
          { text: `Lucky Charm: move 1 ${kind} from`, key: "chooseOne" },
          { who: you },
        );
        push(game, {
          t: STEP.Script,
          code: "12061",
          fn: "move",
          ctx: run.ctx,
          args: { kind, from },
        });
        return;
      }
      const opts = holders(game, mine, kind).filter((h) => h.id !== argFrom && h.room > 0);
      if (!opts.length) return;
      const to = run.choose<string>(
        opts.map((h) => ({ id: h.id, label: h.label, card: h.card, value: h.id })),
        { text: `Lucky Charm: move it to`, key: "chooseOne" },
        { who: you },
      );
      adjust(game, argFrom, kind, -1);
      adjust(game, to, kind, 1);
      emit(game, EVENT.MoveTokens, `Lucky Charm moves 1 ${kind}`, {
        inv: you,
        card: run.ctx.source ?? null,
      });
    },
  },
} satisfies CardScript;
