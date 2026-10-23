// Lucky Charm — move 1 damage or 1 horror from a card at your location to a card you control
import {
  ask,
  controlled,
  def,
  emit,
  inv,
  invsAt,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type Step,
} from "../../../../src/engine/api";

type Kind = "damage" | "horror";
/** an investigator (by id) or an asset (by instance id): what it holds, and what it can take without being defeated
 *  (ponytail: a move never defeats; add the defeat checks if a card ever wants to) */
type Holder = { id: string; label: string; card: string; held: number; room: number };

function holders(g: G, ids: string[], kind: Kind): Holder[] {
  return ids.flatMap((id): Holder[] => {
    const i = g.s.invs[id];
    if (i) {
      const d = def(g, i.cardId);
      const cap = (kind === "damage" ? d.health : d.sanity) ?? 0;
      return [{ id, label: i.name, card: i.cardId, held: i[kind], room: cap - i[kind] - 1 }];
    }
    const c = g.s.cards[id];
    const cap = (kind === "damage" ? def(g, id).health : def(g, id).sanity) ?? 0;
    return cap
      ? [{ id, label: def(g, id).name, card: id, held: c[kind], room: cap - c[kind] - 1 }]
      : [];
  });
}

function adjust(g: G, id: string, kind: Kind, n: number) {
  const i = g.s.invs[id];
  if (i) i[kind] += n;
  else g.s.cards[id][kind] += n;
}

export default {
  abilities: [
    {
      kind: "fast",
      label: "Lucky Charm: move 1 damage or 1 horror",
      cost: { uses: 1, exhaust: true },
      run: "move",
    },
  ],
  fns: {
    move(g: G, ctx: EffCtx, args: { kind?: Kind; from?: string } | undefined, step?: Step) {
      const you = ctx.you!;
      const here = invsAt(g, inv(g, you).location);
      const atLocation = [...here, ...here.flatMap((i) => controlled(g, i).map((c) => c.id))];
      const mine = [you, ...controlled(g, you).map((c) => c.id)];
      if (!args?.kind) {
        const kind = ask<Kind>(
          g,
          step!,
          you,
          "generic",
          "Lucky Charm: move damage or horror?",
          (["damage", "horror"] as Kind[])
            .filter((k) => holders(g, atLocation, k).some((h) => h.held > 0))
            .map((k) => ({ id: k, label: `Move 1 ${k}`, value: k })),
          { auto: true, key: "chooseOne" },
        );
        if (kind === undefined) return;
        push(g, { t: "Script", code: "12061", fn: "move", ctx, args: { kind } });
        return;
      }
      const kind = args.kind;
      if (!args.from) {
        const from = ask<string>(
          g,
          step!,
          you,
          "target",
          `Lucky Charm: move 1 ${kind} from`,
          holders(g, atLocation, kind)
            .filter((h) => h.held > 0)
            .map((h) => ({ id: h.id, label: h.label, card: h.card, value: h.id })),
          { auto: true, key: "chooseOne" },
        );
        if (from === undefined) return;
        push(g, { t: "Script", code: "12061", fn: "move", ctx, args: { kind, from } });
        return;
      }
      const opts = holders(g, mine, kind).filter((h) => h.id !== args.from && h.room > 0);
      if (!opts.length) return;
      const to = ask<string>(
        g,
        step!,
        you,
        "target",
        `Lucky Charm: move it to`,
        opts.map((h) => ({ id: h.id, label: h.label, card: h.card, value: h.id })),
        { auto: true, key: "chooseOne" },
      );
      if (to === undefined) return;
      adjust(g, args.from, kind, -1);
      adjust(g, to, kind, 1);
      emit(g, "moveTokens", `Lucky Charm moves 1 ${kind}`, { inv: you, card: ctx.source ?? null });
    },
  },
} satisfies CardScript;
