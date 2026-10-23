// Fire! — attaches to the nearest location without one; burns each non-Elite card with health there when the investigation phase ends
import {
  ask,
  cardsIn,
  def,
  distances,
  emit,
  inv,
  invsAt,
  isElite,
  locations,
  moveCard,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type InvId,
  type Step,
} from "../../../../src/engine/api";

const FIRE = "12129";
const burning = (g: G, loc: InstId) =>
  cardsIn(g, "attached").some((c) => c.code === FIRE && c.location === loc);

/** the investigator draws the topmost Fire! of the encounter discard pile, if there is one */
export function drawFire(g: G, who: InvId) {
  const id = [...g.s.encounterDiscard].reverse().find((x) => g.s.cards[x].code === FIRE);
  if (!id) return;
  moveCard(g, id, "limbo");
  emit(g, "encounter", `${inv(g, who).name} draws Fire!`, { inv: who, card: id });
  push(g, { t: "Revelation", inv: who, card: id });
}

/** attach a Fire! to the nearest location (from `from`) without one */
export function attachFire(g: G, fire: InstId, from: InstId | null, step: Step, chooser: InvId) {
  let cands = locations(g).filter((l) => !burning(g, l.id));
  if (!cands.length) {
    moveCard(g, fire, "encounterDiscard");
    return true;
  }
  if (from) {
    const d = distances(g, from);
    const best = Math.min(...cands.map((l) => d.get(l.id) ?? Infinity));
    cands = cands.filter((l) => (d.get(l.id) ?? Infinity) === best);
  }
  const at = ask<InstId>(
    g,
    step,
    chooser,
    "target",
    "Attach Fire! to:",
    cands.map((l) => ({ id: l.id, label: def(g, l.id).name, card: l.id, value: l.id })),
    { auto: true, key: "attach", vars: { card: fire } },
  );
  if (at === undefined) return false;
  moveCard(g, fire, "attached", { location: at });
  emit(g, "attach", `Fire! is attached to ${def(g, at).name}`, { card: fire });
  return true;
}

export default {
  abilities: [{ kind: "revelation", run: "attach" }],
  fns: {
    attach(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      attachFire(g, ctx.source!, inv(g, ctx.you!).location, step!, ctx.you!);
    },
    burn(g: G, ctx: EffCtx) {
      if (g.s.phase !== "investigation") return;
      const loc = g.s.cards[ctx.source!]?.location;
      if (!loc) return;
      for (const i of invsAt(g, loc)) {
        push(g, {
          t: "AssignDamage",
          inv: i,
          damage: 1,
          horror: 0,
          direct: true,
          source: ctx.source!,
        });
        for (const a of cardsIn(g, "play"))
          if (a.controller === i && (def(g, a.id).health ?? 0) > 0) a.damage++;
        push(g, { t: "Script", code: "__engine", fn: "assetDefeatCheck", ctx: { you: i } });
      }
      for (const e of cardsIn(g, "enemy"))
        if (e.location === loc && !isElite(g, e.id))
          push(g, { t: "DamageEnemy", enemy: e.id, amount: 1, by: null, source: ctx.source! });
    },
  },
} satisfies CardScript;
