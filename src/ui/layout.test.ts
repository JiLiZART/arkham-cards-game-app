import { describe, expect, it } from "vitest";
import { autoPlay } from "../engine/bot";
import { moveCard } from "../engine/core";
import { db, giveCard, mutate, putEnemy, skipMulligans, start } from "../engine/testkit";
import { BOARD, footprint, layout } from "./layout";

const overlaps = (a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) => a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6;

function check(scenario: string, seed: number) {
  const invs = ["01001", "01002", "01003", "01004"];
  let r = skipMulligans(start(scenario, invs, seed));
  r = autoPlay(db, r, 60); // get some cards into play
  const L = layout(db, r.state, r.state.pending?.inv ?? "01001");
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
  // everything (cards and piles) stays on the parchment board
  const outside = [
    ...placed.map(([id, p]) => [db.cards[r.state.cards[id].code].name, footprint(p)] as const),
    ...L.piles.map((p) => [p.key, footprint({ pos: p.pos, scale: p.scale, landscape: false } as never)] as const),
  ].filter(([, f]) => f.x0 < BOARD.x0 || f.x1 > BOARD.x1 || f.z0 < BOARD.z0 || f.z1 > BOARD.z1).map(([n]) => n);
  return { L, bad, outside };
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
    expect(mine.length).toBe(10);
    for (const [, p] of mine) {
      const f = footprint(p);
      expect(f.x0 >= BOARD.x0 && f.x1 <= BOARD.x1 && f.z0 >= BOARD.z0 && f.z1 <= BOARD.z1).toBe(true);
    }
    for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) expect(overlaps(footprint(mine[i][1]), footprint(mine[j][1]))).toBe(false);
  });

  it("four player areas and the map do not overlap (The Midnight Masks)", () => {
    const { L, bad, outside } = check("the-midnight-masks", 3);
    expect(bad).toEqual([]);
    expect(outside).toEqual([]);
    expect(L.areas).toHaveLength(4);
    expect(L.areas.filter((a) => a.viewer)).toHaveLength(1);
  });

  it("no overlaps in The Gathering and The Devourer Below", () => {
    for (const sc of ["the-gathering", "the-devourer-below"]) {
      const { bad, outside } = check(sc, 2);
      expect(bad).toEqual([]);
      expect(outside).toEqual([]);
    }
  });

  it("the viewer's hand is not on the board; other hands are face-down piles", () => {
    const r = skipMulligans(start("the-gathering", ["01001", "01004"], 1));
    const L = layout(db, r.state, "01001");
    expect(r.state.invs["01001"].hand.some((id) => L.cards.has(id))).toBe(false);
    expect(L.piles.some((p) => p.key === "hand:01001")).toBe(false);
    expect(L.piles.find((p) => p.key === "hand:01004")?.count).toBe(r.state.invs["01004"].hand.length);
  });
});
