import { describe, expect, it } from "vitest";
import { autoPlay } from "../engine/bot";
import { db, skipMulligans, start } from "../engine/testkit";
import { footprint, layout } from "./layout";

const overlaps = (a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) => a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6;

function check(scenario: string, seed: number) {
  const invs = ["01001", "01002", "01003", "01004"];
  let r = skipMulligans(start(scenario, invs, seed));
  r = autoPlay(db, r, 60); // get some cards into play
  const L = layout(db, r.state, r.state.pending?.inv ?? "01001", true);
  const placed = [...L.cards.entries()].filter(([, p]) => p.group !== "hand" && p.group !== "resolving" && p.group !== "commit");
  const bad: string[] = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const [ia, a] = placed[i];
      const [ib, b] = placed[j];
      if (a.group === b.group) continue;
      if (overlaps(footprint(a), footprint(b))) bad.push(`${db.cards[r.state.cards[ia].code].name}(${a.group}) × ${db.cards[r.state.cards[ib].code].name}(${b.group})`);
    }
  }
  return { L, bad };
}

describe("table layout", () => {
  it("four player areas and the map do not overlap (The Midnight Masks)", () => {
    const { L, bad } = check("the-midnight-masks", 3);
    expect(bad).toEqual([]);
    expect(L.areas).toHaveLength(4);
    expect(L.areas.filter((a) => a.viewer)).toHaveLength(1);
  });

  it("no overlaps in The Gathering and The Devourer Below", () => {
    expect(check("the-gathering", 2).bad).toEqual([]);
    expect(check("the-devourer-below", 2).bad).toEqual([]);
  });

  it("the viewer's hand is fanned only when visible", () => {
    const r = skipMulligans(start("the-gathering", ["01001", "01004"], 1));
    const shown = layout(db, r.state, "01001", true);
    const hidden = layout(db, r.state, "01001", false);
    const hand = r.state.invs["01001"].hand;
    expect(hand.every((id) => shown.cards.get(id)?.group === "hand")).toBe(true);
    expect(hand.some((id) => hidden.cards.has(id))).toBe(false);
    expect(hidden.piles.some((p) => p.key === "hand:01001")).toBe(true);
  });
});
