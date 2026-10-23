// Paint the Town Red — draw a non-Elite enemy from the top 9 of the encounter deck; gain resources equal to its printed health
import {
  ask,
  def,
  emit,
  inv,
  isElite,
  moveCard,
  push,
  shuffle,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", designator: "parley", run: "paint" }],
  fns: {
    paint(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const top = g.s.encounterDeck.slice(0, 9);
      const pool = top.filter((id) => def(g, id).type === "enemy" && !isElite(g, id));
      const pick = ask<InstId | "none">(
        g,
        step!,
        you,
        "generic",
        "Paint the Town Red: draw an enemy",
        [
          ...pool.map((id) => ({ id, label: def(g, id).name, card: id, value: id })),
          { id: "none", label: "Take nothing", value: "none" },
        ],
        { key: "searchTop", vars: { n: 9 }, shown: top.filter((id) => !pool.includes(id)) },
      );
      if (pick === undefined) return;
      if (pick !== "none") {
        const health = def(g, pick).enemy?.health ?? 0;
        moveCard(g, pick, "limbo");
        inv(g, you).resources += health;
        emit(
          g,
          "encounter",
          `${inv(g, you).name} draws ${def(g, pick).name} and gains ${health} resources`,
          {
            inv: you,
            card: pick,
            data: { n: health },
          },
        );
        push(g, { t: "Spawn", enemy: pick, inv: you });
      }
      shuffle(g.s, g.s.encounterDeck);
    },
  },
} satisfies CardScript;
