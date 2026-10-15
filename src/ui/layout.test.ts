import { describe, expect, it } from "vitest";
import { autoPlay } from "../engine/bot";
import { moveCard } from "../engine/core";
import { db, giveCard, mutate, putEnemy, skipMulligans, start } from "../engine/testkit";
import { BOARD, footprint, LOC_SCALE, layout, MIN_LOC } from "./layout";

const overlaps = (a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) => a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6;
const inside = (f: ReturnType<typeof footprint>) => f.x0 >= BOARD.x0 && f.x1 <= BOARD.x1 && f.z0 >= BOARD.z0 && f.z1 <= BOARD.z1;

function check(scenario: string, seed: number, players = 4) {
  const invs = ["01001", "01002", "01003", "01004"].slice(0, players);
  let r = skipMulligans(start(scenario, invs, seed));
  r = autoPlay(db, r, 60); // get some cards into play
  const viewer = r.state.pending?.inv ?? "01001";
  const L = layout(db, r.state, viewer);
  const placed = [...L.cards.entries()].filter(([, p]) => p.group !== "resolving" && p.group !== "commit");
  const bad: string[] = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const [ia, a] = placed[i];
      const [ib, b] = placed[j];
      if (a.group === b.group) continue;
      if (overlaps(footprint(a), footprint(b))) bad.push(`${db.cards[r.state.cards[ia].code].name}(${a.group}) × ${db.cards[r.state.cards[ib].code].name}(${b.group})`);
    }
  }
  // piles must not overlap cards or each other either
  const pileFoot = L.piles.map((p) => [p.key, footprint({ pos: p.pos, scale: p.scale, landscape: false })] as const);
  for (const [k, f] of pileFoot) {
    for (const [id, p] of placed) if (overlaps(f, footprint(p))) bad.push(`${k} × ${db.cards[r.state.cards[id].code].name}`);
    for (const [k2, f2] of pileFoot) if (k < k2 && overlaps(f, f2)) bad.push(`${k} × ${k2}`);
  }
  const outside = [...placed.map(([id, p]) => [db.cards[r.state.cards[id].code].name, footprint(p)] as const), ...pileFoot].filter(([, f]) => !inside(f)).map(([n]) => n);
  return { r, L, viewer, bad, outside };
}

describe("table layout", () => {
  it("a viewer with 6 assets and 3 threats still fits without overlaps", () => {
    let r = skipMulligans(start("the-midnight-masks", ["01001", "01002"], 4));
    r = mutate(r, (g) => {
      for (const code of ["01016", "01017", "01018", "01020", "01021", "01030"]) {
        const id = giveCard(g, "01001", code);
        moveCard(g, id, "play");
        g.s.cards[id].controller = "01001";
      }
      for (const code of ["01160", "01159", "01169"]) putEnemy(g, code, g.s.invs["01001"].location!, "01001");
    });
    const L = layout(db, r.state, "01001");
    const mine = [...L.cards.entries()].filter(([, p]) => p.group.endsWith(":01001"));
    expect(mine.length).toBe(9);
    for (const [, p] of mine) expect(inside(footprint(p))).toBe(true);
    const all = [...L.cards.values()];
    for (const [, a] of mine) for (const b of all) if (a !== b && a.group !== b.group) expect(overlaps(footprint(a), footprint(b))).toBe(false);
  });

  it("1 to 4 players: nothing overlaps and everything stays on the board", () => {
    for (const sc of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) {
      for (const n of [1, 2, 3, 4]) {
        const { bad, outside } = check(sc, 2 + n, n);
        expect(bad, `${sc} ×${n}`).toEqual([]);
        expect(outside, `${sc} ×${n}`).toEqual([]);
      }
    }
  });

  it("The Gathering and The Midnight Masks show locations at the full 2× scale; no map goes below the minimum", () => {
    expect(check("the-gathering", 2, 2).L.locScale).toBe(LOC_SCALE);
    expect(check("the-midnight-masks", 2, 2).L.locScale).toBe(LOC_SCALE);
    expect(check("the-devourer-below", 2, 2).L.locScale).toBeGreaterThanOrEqual(MIN_LOC);
  });

  it("no investigator cards, other players' cards or the viewer's hand on the board", () => {
    const { r, L, viewer } = check("the-gathering", 3, 3);
    for (const i of r.state.order) expect(L.cards.has(r.state.invs[i].cardId)).toBe(false);
    expect(r.state.invs[viewer].hand.some((id) => L.cards.has(id))).toBe(false);
    for (const i of r.state.order.filter((x) => x !== viewer)) {
      const theirs = Object.values(r.state.cards).filter((c) => c.controller === i && (c.zone === "play" || c.zone === "threat" || c.zone === "hand"));
      expect(theirs.some((c) => L.cards.has(c.id))).toBe(false);
      expect(L.piles.some((p) => p.key.endsWith(`:${i}`))).toBe(false);
    }
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
