import { describe, expect, it } from "vitest";
import { autoPlay } from "../../engine/bot";
import { moveCard } from "../../engine/core";
import { db, giveCard, mutate, putEnemy, skipMulligans, start } from "../../engine/testkit";
import { footprint, layout, type Bounds } from "./layout";

const overlaps = (a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) =>
  a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6;
const inside = (f: ReturnType<typeof footprint>, b: Bounds) =>
  f.x0 >= b.x0 && f.x1 <= b.x1 && f.z0 >= b.z0 && f.z1 <= b.z1;

function check(scenario: string, seed: number, players = 4) {
  const invs = ["01001", "01002", "01003", "01004"].slice(0, players);
  let r = skipMulligans(start(scenario, invs, seed));
  r = autoPlay(db, r, 60); // get some cards into play
  const viewer = r.state.pending?.inv ?? "01001";
  const L = layout(db, r.state, viewer);
  const placed = [...L.cards.entries()];
  const bad: string[] = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const [ia, a] = placed[i];
      const [ib, b] = placed[j];
      if (a.group === b.group) continue;
      if (overlaps(footprint(a), footprint(b)))
        bad.push(
          `${db.cards[r.state.cards[ia].code].name}(${a.group}) × ${db.cards[r.state.cards[ib].code].name}(${b.group})`,
        );
    }
  }
  const outside = placed
    .filter(([, p]) => !inside(footprint(p), L.bounds))
    .map(([id]) => db.cards[r.state.cards[id].code].name);
  return { r, L, viewer, bad, outside };
}

describe("map layout", () => {
  it("1 to 4 players: nothing overlaps and everything stays inside the bounds", () => {
    for (const sc of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) {
      for (const n of [1, 2, 3, 4]) {
        const { bad, outside, L } = check(sc, 2 + n, n);
        expect(bad, `${sc} ×${n}`).toEqual([]);
        expect(outside, `${sc} ×${n}`).toEqual([]);
        for (const m of L.minis)
          expect(
            m.pos[0] >= L.bounds.x0 &&
              m.pos[0] <= L.bounds.x1 &&
              m.pos[2] >= L.bounds.z0 &&
              m.pos[2] <= L.bounds.z1,
          ).toBe(true);
      }
    }
  });

  it("only map things: no act, agenda, piles, investigator cards, hands, or the viewer's play area", () => {
    let r = skipMulligans(start("the-midnight-masks", ["01001", "01002"], 4));
    r = mutate(r, (g) => {
      for (const code of ["01016", "01020"]) {
        const id = giveCard(g, "01001", code);
        moveCard(g, id, "play");
        g.s.cards[id].controller = "01001";
      }
      putEnemy(g, "01160", g.s.invs["01001"].location!, "01001");
    });
    const L = layout(db, r.state, "01001");
    const zones = new Set([...L.cards.keys()].map((id) => r.state.cards[id].zone));
    expect([...zones].every((z) => ["location", "enemy", "attached"].includes(z))).toBe(true);
    for (const i of r.state.order) expect(L.cards.has(r.state.invs[i].cardId)).toBe(false);
    // the viewer's engaged enemy lives in the play area strip, not on the map
    expect([...L.cards.keys()].some((id) => r.state.cards[id].engagedWith === "01001")).toBe(false);
    expect(L.minis.map((m) => m.inv).sort()).toEqual(["01001", "01002"]);
  });

  it("an enemy engaged with another investigator sits at their location with their portrait badge", () => {
    let r = skipMulligans(start("the-gathering", ["01001", "01002"], 1));
    let enemy = "";
    r = mutate(r, (g) => {
      enemy = putEnemy(g, "01160", g.s.invs["01002"].location!, "01002");
    });
    const L = layout(db, r.state, "01001");
    const p = L.cards.get(enemy)!;
    expect(p.badge).toBe("01002");
    expect(p.group).toBe(`loc:${r.state.invs["01002"].location}`);
  });
});
