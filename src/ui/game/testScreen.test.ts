import { describe, expect, it } from "vitest";
import {
  commitDone,
  db,
  giveCard,
  locId,
  mutate,
  pick,
  putEnemy,
  skipMulligans,
  start,
} from "../../engine/testkit";
import {
  addTokens,
  bagLanding,
  calcParts,
  finishOption,
  placedCards,
  sessionId,
  spillLayout,
  stripDuringTest,
  subjectOf,
} from "./testScreen";

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
    expect(subjectOf(f.state.skillTest!, f.state)).toEqual({
      kind: "card",
      id: f.state.skillTest!.target,
    });
    expect(f.state.cards[f.state.skillTest!.target!].code).toBe("01160");
    const i = pick(begin(), /^Investigate/);
    expect(i.state.cards[(subjectOf(i.state.skillTest!, i.state) as { id: string }).id].code).toBe(
      "01111",
    );
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
    expect(
      placedCards(r.state.skillTest!, r.state, db, r.state.pending).every((c) => !c.removable),
    ).toBe(true);
  });

  it("a helper's card is not removable by the tester, and carries its owner", () => {
    let r = fight([ROLAND, DAISY]);
    r = pick(r, /^Commit Vicious Blow/);
    r = pick(r, "done");
    expect(r.state.pending?.inv).toBe(DAISY);
    r = pick(r, /^Commit Unexpected Courage/);
    const placed = placedCards(r.state.skillTest!, r.state, db, r.state.pending);
    expect(placed.map((c) => [c.owner, c.icons, c.removable])).toEqual([
      [ROLAND, 1, false],
      [DAISY, 2, true],
    ]);
  });
});

describe("calcParts", () => {
  it("before a token: base, placed icons, total against the difficulty", () => {
    const r = pick(fight(), /^Commit Vicious Blow/);
    expect(calcParts(r.state.skillTest!, r.state, db, 0)).toMatchObject({
      skill: "combat",
      base: 4,
      icons: [1],
      mods: 0,
      tokens: [],
      total: 5,
      difficulty: 2,
    });
  });

  it("revealed tokens join the strip and the total; unrevealed ones are held back", () => {
    let r = pick(fight(), /^Commit Vicious Blow/);
    r = commitDone(r);
    const t = r.state.skillTest!;
    expect(t.tokens).toEqual(["0"]);
    expect(calcParts(t, r.state, db, 0).tokens).toEqual([]);
    expect(calcParts(t, r.state, db, 1)).toMatchObject({
      tokens: [{ token: "0", mod: 0 }],
      total: 5,
    });
    const minus = { ...t, tokens: ["-1"], tokenMods: [-1] } as typeof t;
    expect(calcParts(minus, r.state, db, 1)).toMatchObject({
      tokens: [{ token: "-1", mod: -1 }],
      total: 4,
    });
  });

  it("an auto-fail makes the total 0", () => {
    const r = fight();
    const t = { ...r.state.skillTest!, tokens: ["autoFail"], tokenMods: [0] } as ReturnType<
      typeof fight
    >["state"]["skillTest"] &
      object;
    expect(calcParts(t, r.state, db, 1)).toMatchObject({ autoFail: true, total: 0 });
  });
});

describe("spillLayout", () => {
  const area = { x: 300, y: 150, w: 520, h: 320 };
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

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
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
          expect(dist(points[i], points[j])).toBeGreaterThanOrEqual(size);
    }
  });

  it("keeps the full size when there is room and shrinks the discs when there is not", () => {
    expect(spillLayout(16, 1, area, 64).size).toBe(64);
    expect(spillLayout(60, 1, { x: 0, y: 0, w: 200, h: 150 }, 64).size).toBeLessThan(64);
  });
});

describe("addTokens", () => {
  const base = {
    skill: "combat",
    base: 4,
    icons: [1],
    mods: 0,
    tokens: [],
    autoFail: false,
    total: 5,
    difficulty: 2,
  };

  it("adds the revealed tokens' modifiers to the total", () => {
    expect(addTokens(base, [{ token: "-1", mod: -1 }])).toMatchObject({
      tokens: [{ token: "-1", mod: -1 }],
      total: 4,
      autoFail: false,
    });
  });

  it("never goes below 0, and an auto-fail is 0", () => {
    expect(addTokens({ ...base, total: 1 }, [{ token: "-3", mod: -3 }]).total).toBe(0);
    expect(addTokens(base, [{ token: "autoFail", mod: 0 }])).toMatchObject({
      autoFail: true,
      total: 0,
    });
  });

  it("an exact total from the result event wins (doubled negatives, flipped tokens)", () => {
    expect(addTokens(base, [{ token: "-1", mod: -1 }], 3).total).toBe(3);
  });

  it("no tokens leaves the strip as it was", () => {
    expect(addTokens(base, [])).toEqual(base);
  });
});

describe("sessionId", () => {
  const ev = (type: string, testId?: number) =>
    ({ type, data: testId === undefined ? undefined : { testId } }) as never;
  const base = {
    events: [] as never[],
    lead: null,
    live: null,
    resolved: false,
    commitPending: false,
    started: null,
  };

  it("a commit prompt opens the screen for the live test", () => {
    expect(sessionId({ ...base, live: 4, commitPending: true })).toBe(4);
  });

  it("stays open through later prompts of the same test, but not before its commit prompt", () => {
    expect(sessionId({ ...base, live: 4, started: 4 })).toBe(4);
    expect(sessionId({ ...base, live: 4 })).toBeNull();
  });

  it("closes with the result: reactions after it are not part of the screen", () => {
    expect(sessionId({ ...base, live: 4, started: 4, resolved: true })).toBeNull();
  });

  it("events of the test keep it open even after the state has moved on", () => {
    expect(sessionId({ ...base, events: [ev("token", 7)], lead: ev("token", 7) })).toBe(7);
  });

  it("waits for events that come before the test (an attack of opportunity), then opens", () => {
    const attack = ev("attack");
    expect(sessionId({ ...base, live: 4, commitPending: true, lead: attack })).toBeNull();
    expect(sessionId({ ...base, events: [ev("token", 7)], lead: attack })).toBeNull();
    expect(sessionId({ ...base, live: 4, commitPending: true, lead: null })).toBe(4);
  });

  it("an open screen is not closed by an event that plays during the test", () => {
    expect(sessionId({ ...base, live: 4, started: 4, lead: ev("enemyDamage") })).toBe(4);
  });
});

describe("finishOption", () => {
  it("in the viewer's commit window: the Done option, which tapping the subject chooses", () => {
    const r = fight();
    expect(r.state.pending?.kind).toBe("commit");
    expect(finishOption(r.state, { viewing: null })?.id).toBe("done");
  });

  it("nothing at other times: another table on screen, or a choice that is not a commit window", () => {
    const r = fight([ROLAND, DAISY]);
    expect(finishOption(r.state, { viewing: DAISY })).toBeNull();
    const turn = begin();
    expect(finishOption(turn.state, { viewing: null })).toBeNull();
  });

  it("a helper's commit window, when their table is on screen, finishes theirs", () => {
    let r = fight([ROLAND, DAISY]);
    r = pick(r, "done");
    expect(r.state.pending).toMatchObject({ inv: DAISY, kind: "commit" });
    expect(finishOption(r.state, { viewing: null })?.id).toBe("done");
    expect(finishOption(r.state, { viewing: ROLAND })).toBeNull();
  });

  it("no Done option in the commit window, nothing to tap", () => {
    const r = fight();
    const p = {
      ...r.state.pending!,
      options: r.state.pending!.options.filter((o) => o.id !== "done"),
    };
    expect(finishOption({ ...r.state, pending: p }, { viewing: null })).toBeNull();
  });
});

describe("bagLanding", () => {
  it("is the lower third of the subject, centred on it, in the stage's own coordinates", () => {
    const c = bagLanding({ x: 120, y: 60, w: 240, h: 336 });
    expect(c.x).toBe(240);
    expect(c.y).toBeCloseTo(60 + 336 * 0.72, 5);
    expect(c.y).toBeGreaterThan(60 + (336 * 2) / 3);
  });
});

describe("the play strip during a test", () => {
  const offered = new Map([["a1", [{ id: "x" }]]]);
  it("is as usual when no test is up", () => {
    expect(stripDuringTest(false, ["a1"], offered)).toBe("normal");
  });

  it("is compact while one of its cards has an option (a fast ability in the commit window)", () => {
    expect(stripDuringTest(true, ["a1", "a2"], offered)).toBe("compact");
  });

  it("steps aside when none of its cards has an option: the draw, the result, a window with nothing to use", () => {
    expect(stripDuringTest(true, ["a1", "a2"], new Map())).toBe("aside");
    expect(stripDuringTest(true, ["a2"], offered)).toBe("aside"); // the option is on a card that isn't in the strip (a hand card to commit)
    expect(stripDuringTest(true, ["a1"], new Map([["a1", []]]))).toBe("aside");
  });
});
