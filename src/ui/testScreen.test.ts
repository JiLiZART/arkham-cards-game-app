import { describe, expect, it } from "vitest";
import { commitDone, db, giveCard, locId, mutate, pick, putEnemy, skipMulligans, start } from "../engine/testkit";
import { addTokens, calcParts, placedCards, spillLayout, subjectOf } from "./testScreen";

const ROLAND = "01001";
const DAISY = "01002";

const begin = (invs = [ROLAND]) => {
  let r = skipMulligans(start("the-gathering", invs, 1, { chaosBag: ["0"] as never }));
  if (r.state.pending?.options.some((o) => o.label === "Roland Banks")) r = pick(r, "Roland Banks");
  return mutate(r, (g) => {
    giveCard(g, ROLAND, "01025"); // Vicious Blow: 1 combat icon
    if (invs.includes(DAISY)) giveCard(g, DAISY, "01093"); // Unexpected Courage: 2 wild icons
    putEnemy(g, "01160", locId(g, "01111"), ROLAND);
  });
};
const fight = (invs = [ROLAND]) => pick(begin(invs), /^Fight Ghoul Minion/);

describe("subjectOf", () => {
  it("a fight: the enemy; an investigate: the location", () => {
    const f = fight();
    expect(subjectOf(f.state.skillTest!, f.state)).toEqual({ kind: "card", id: f.state.skillTest!.target });
    expect(f.state.cards[f.state.skillTest!.target!].code).toBe("01160");
    const i = pick(begin(), /^Investigate/);
    expect(i.state.cards[(subjectOf(i.state.skillTest!, i.state) as { id: string }).id].code).toBe("01111");
  });

  it("a test called by a card with no target: the card; a plain test: the investigator's portrait", () => {
    const f = fight();
    const card = Object.values(f.state.cards).find((c) => c.code === "01111")!.id;
    const t = { ...f.state.skillTest!, target: null, source: card };
    expect(subjectOf(t, f.state)).toEqual({ kind: "card", id: card });
    expect(subjectOf({ ...t, source: null }, f.state)).toEqual({ kind: "portrait", inv: ROLAND });
  });
});

describe("placedCards", () => {
  it("the tester's own card is removable while they decide, with its icons and owner", () => {
    let r = fight();
    r = pick(r, /^Commit Vicious Blow/);
    const [c] = placedCards(r.state.skillTest!, r.state, db, r.state.pending);
    expect(c).toMatchObject({ owner: ROLAND, icons: 1, removable: true });
    expect(r.state.cards[c.card].code).toBe("01025");
  });

  it("a card is not removable once the window has closed", () => {
    let r = pick(fight(), /^Commit Vicious Blow/);
    r = commitDone(r);
    expect(placedCards(r.state.skillTest!, r.state, db, r.state.pending).every((c) => !c.removable)).toBe(true);
  });

  it("a helper's card is not removable by the tester, and carries its owner", () => {
    let r = fight([ROLAND, DAISY]);
    r = pick(r, /^Commit Vicious Blow/);
    r = pick(r, "done");
    expect(r.state.pending?.inv).toBe(DAISY);
    r = pick(r, /^Commit Unexpected Courage/);
    const placed = placedCards(r.state.skillTest!, r.state, db, r.state.pending);
    expect(placed.map((c) => [c.owner, c.icons, c.removable])).toEqual([[ROLAND, 1, false], [DAISY, 2, true]]);
  });
});

describe("calcParts", () => {
  it("before a token: base, placed icons, total against the difficulty", () => {
    const r = pick(fight(), /^Commit Vicious Blow/);
    expect(calcParts(r.state.skillTest!, r.state, db, 0)).toMatchObject({ skill: "combat", base: 4, icons: [1], mods: 0, tokens: [], total: 5, difficulty: 2 });
  });

  it("revealed tokens join the strip and the total; unrevealed ones are held back", () => {
    let r = pick(fight(), /^Commit Vicious Blow/);
    r = commitDone(r);
    const t = r.state.skillTest!;
    expect(t.tokens).toEqual(["0"]);
    expect(calcParts(t, r.state, db, 0).tokens).toEqual([]);
    expect(calcParts(t, r.state, db, 1)).toMatchObject({ tokens: [{ token: "0", mod: 0 }], total: 5 });
    const minus = { ...t, tokens: ["-1"], tokenMods: [-1] } as typeof t;
    expect(calcParts(minus, r.state, db, 1)).toMatchObject({ tokens: [{ token: "-1", mod: -1 }], total: 4 });
  });

  it("an auto-fail makes the total 0", () => {
    const r = fight();
    const t = { ...r.state.skillTest!, tokens: ["autoFail"], tokenMods: [0] } as ReturnType<typeof fight>["state"]["skillTest"] & object;
    expect(calcParts(t, r.state, db, 1)).toMatchObject({ autoFail: true, total: 0 });
  });
});

describe("spillLayout", () => {
  const area = { x: 300, y: 150, w: 520, h: 320 };
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  it("is deterministic for a seed and differs between seeds", () => {
    expect(spillLayout(16, 7, area, 64)).toEqual(spillLayout(16, 7, area, 64));
    expect(spillLayout(16, 7, area, 64).points).not.toEqual(spillLayout(16, 8, area, 64).points);
  });

  it("places every disc inside the area without overlap, from 1 to 30 discs", () => {
    for (const n of [1, 2, 16, 30]) {
      const { size, points } = spillLayout(n, 3, area, 64);
      expect(points).toHaveLength(n);
      for (const p of points) {
        expect(p.x - size / 2).toBeGreaterThanOrEqual(area.x);
        expect(p.x + size / 2).toBeLessThanOrEqual(area.x + area.w);
        expect(p.y - size / 2).toBeGreaterThanOrEqual(area.y);
        expect(p.y + size / 2).toBeLessThanOrEqual(area.y + area.h);
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(dist(points[i], points[j])).toBeGreaterThanOrEqual(size);
    }
  });

  it("keeps the full size when there is room and shrinks the discs when there is not", () => {
    expect(spillLayout(16, 1, area, 64).size).toBe(64);
    expect(spillLayout(60, 1, { x: 0, y: 0, w: 200, h: 150 }, 64).size).toBeLessThan(64);
  });
});

describe("addTokens", () => {
  const base = { skill: "combat", base: 4, icons: [1], mods: 0, tokens: [], autoFail: false, total: 5, difficulty: 2 };

  it("adds the revealed tokens' modifiers to the total", () => {
    expect(addTokens(base, [{ token: "-1", mod: -1 }])).toMatchObject({ tokens: [{ token: "-1", mod: -1 }], total: 4, autoFail: false });
  });

  it("never goes below 0, and an auto-fail is 0", () => {
    expect(addTokens({ ...base, total: 1 }, [{ token: "-3", mod: -3 }]).total).toBe(0);
    expect(addTokens(base, [{ token: "autoFail", mod: 0 }])).toMatchObject({ autoFail: true, total: 0 });
  });

  it("an exact total from the result event wins (doubled negatives, flipped tokens)", () => {
    expect(addTokens(base, [{ token: "-1", mod: -1 }], 3).total).toBe(3);
  });

  it("no tokens leaves the strip as it was", () => {
    expect(addTokens(base, [])).toEqual(base);
  });
});
