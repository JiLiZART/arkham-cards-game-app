import { describe, expect, it } from "vitest";
import { autoPlay } from "./bot";
import { flatLog, hasEntry } from "./campaignLog";
import { applyScenarioEnd, migrateCampaign, scenarioSetup, startCampaign } from "./campaign";
import { card, def, findByCode, inv, moveCard } from "./core";
import { createGame } from "./engine";
import { db, gOf, mutate, skipMulligans, start } from "./testkit";

const ROLAND = "01001";
const AGNES = "01004";

describe("campaign", () => {
  it("starts Night of the Zealot with the Gathering and the Standard bag", () => {
    const c = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 3,
      investigators: [
        { code: ROLAND, deckId: "roland-starter" },
        { code: AGNES, deckId: "agnes-starter" },
      ],
    });
    expect(flatLog(c.log)).toEqual({});
    const s = scenarioSetup(db, c, 1);
    expect(s.scenarioId).toBe("the-gathering");
    expect(s.chaosBag).toEqual(db.campaigns["night-of-the-zealot"].chaosBags.standard);
    expect(s.investigators.map((i) => i.code)).toEqual([ROLAND, AGNES]);
    // Agnes' deck gets one random basic weakness at campaign start
    const agnes = c.investigators[1].deck.filter(
      (code) => db.cards[code].subtype === "basicweakness",
    );
    expect(agnes).toHaveLength(1);
  });

  it("a custom deck is used as given: its chosen weakness is the deck's, and no random one is drawn", () => {
    const base = db.decks["roland-starter"];
    const other = Object.values(db.cards).find(
      (c) => c.subtype === "basicweakness" && c.type !== "investigator" && c.code !== "01097",
    )!.code;
    const cards = { ...base.cards };
    delete cards["01097"];
    cards[other] = 1;
    const custom = { ...base, id: "custom:t1", name: "Roland · test", cards };
    const c = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 5,
      investigators: [{ code: ROLAND, deckId: custom.id, deck: custom }],
    });
    const deck = c.investigators[0].deck;
    expect(c.investigators[0].deckId).toBe("custom:t1");
    expect(deck.filter((x) => x === other)).toHaveLength(1);
    expect(deck).not.toContain("01097");
    expect(deck).toHaveLength(Object.values(cards).reduce((n, k) => n + k, 0));
    // no random weakness was drawn, so the campaign's rng is where the seed left it
    expect(c.rng).toBe(5);
    // a random-weakness deck does draw one
    const random = {
      ...custom,
      cards: Object.fromEntries(Object.entries(cards).filter(([k]) => k !== other)),
      randomBasicWeakness: true,
    };
    const r = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 5,
      investigators: [{ code: ROLAND, deckId: random.id, deck: random }],
    });
    expect(r.investigators[0].deck).toHaveLength(deck.length);
    expect(r.rng).not.toBe(5);
  });

  it("a custom deck that is invalid, or someone else's, is refused", () => {
    const base = db.decks["roland-starter"];
    const bad = { ...base, id: "custom:bad", cards: { ...base.cards, "01020": 3 } };
    expect(() =>
      startCampaign(db, {
        campaignId: "night-of-the-zealot",
        difficulty: "standard",
        seed: 1,
        investigators: [{ code: ROLAND, deckId: bad.id, deck: bad }],
      }),
    ).toThrow(/invalid deck/i);
    expect(() =>
      startCampaign(db, {
        campaignId: "night-of-the-zealot",
        difficulty: "standard",
        seed: 1,
        investigators: [{ code: AGNES, deckId: base.id, deck: base }],
      }),
    ).toThrow(/not a 01004 deck/);
  });

  it("The Gathering setup", () => {
    const r = skipMulligans(start("the-gathering", [ROLAND, AGNES], 1));
    const g = gOf(r);
    const inPlay = Object.values(g.s.cards)
      .filter((c) => c.zone === "location")
      .map((c) => def(g, c.id).name);
    expect(inPlay).toEqual(["Study"]);
    expect(Object.values(g.s.invs).every((i) => def(g, i.location!).name === "Study")).toBe(true);
    for (const code of ["01116", "01117"]) {
      expect(findByCode(g, code)!.zone).toBe("setAside");
      expect(g.s.encounterDeck.some((id) => card(g, id).code === code)).toBe(false);
    }
  });

  it("log-dependent setup: house burned → Rivertown", () => {
    const burned = skipMulligans(
      start("the-midnight-masks", [ROLAND], 1, { campaignLog: { houseBurned: true } }),
    );
    const g = gOf(burned);
    expect(def(g, inv(g, ROLAND).location!).name).toBe("Rivertown");
    expect(findByCode(g, "01124")!.zone).toBe("removed");
    const standing = skipMulligans(
      start("the-midnight-masks", [ROLAND], 1, { campaignLog: { houseStanding: true } }),
    );
    expect(def(gOf(standing), inv(gOf(standing), ROLAND).location!).name).toBe("Your House");
  });

  it("awards victory XP plus resolution bonus", () => {
    const c = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 3,
      investigators: [
        { code: ROLAND, deckId: "roland-starter" },
        { code: AGNES, deckId: "agnes-starter" },
      ],
    });
    let r = createGame(db, scenarioSetup(db, c, 1));
    r = mutate(r, (g) => {
      moveCard(g, findByCode(g, "01116")!.id, "victory"); // Ghoul Priest: victory 2
      moveCard(g, findByCode(g, "01118")!.id, "victory"); // Flesh-Eater: victory 1
      g.s.phase = "ended";
      g.s.resolution = "R1";
      g.s.pending = null;
    });
    const next = applyScenarioEnd(db, c, r.state);
    expect(next.investigators.map((i) => i.xp)).toEqual([5, 5]);
    expect(hasEntry(next.log, "houseBurned")).toBe(true);
    expect(next.investigators[0].mentalTrauma).toBe(1); // lead
    expect(next.investigators[0].deck).toContain("01117"); // Lita earned
    expect(next.flow.play).toBe("the-midnight-masks");
  });

  it("weakness in the opening hand is set aside and redrawn", () => {
    // put Paranoia on top of Roland's deck before the opening hand is drawn: use a seed search
    for (let seed = 1; seed < 200; seed++) {
      const r = start("the-gathering", [ROLAND], seed);
      const aside = (r.state.flags[`aside:${ROLAND}`] as string[] | undefined) ?? [];
      if (!aside.length) continue;
      expect(r.state.invs[ROLAND].hand).toHaveLength(5);
      expect(r.state.invs[ROLAND].hand.some((id) => db.cards[r.state.cards[id].code].subtype)).toBe(
        false,
      );
      const after = skipMulligans(r);
      expect(after.state.invs[ROLAND].deck).toContain(aside[0]);
      return;
    }
    throw new Error("no seed put a weakness in the opening hand");
  });

  it("bot playthrough: The Gathering reaches a resolution and the campaign continues", () => {
    const c = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "easy",
      seed: 11,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
    });
    const r = autoPlay(db, createGame(db, scenarioSetup(db, c, 5)));
    expect(r.state.phase).toBe("ended");
    const next = applyScenarioEnd(db, c, r.state);
    expect(next.history[0].scenarioId).toBe("the-gathering");
  });
});

describe("migrateCampaign", () => {
  const old = (over: object = {}) => ({
    version: 2,
    campaignId: "night-of-the-zealot",
    difficulty: "standard",
    seed: 3,
    rng: 3,
    chaosBag: ["0"],
    scenarioIndex: 1,
    lead: ROLAND,
    log: { houseBurned: true, cultistsGotAway: ["01121"] },
    investigators: [
      {
        code: ROLAND,
        deckId: "roland-starter",
        deck: [],
        xp: 2,
        physicalTrauma: 0,
        mentalTrauma: 1,
        status: "active",
      },
    ],
    history: [{ scenarioId: "the-gathering", resolution: "R1", xp: 2, victory: 0 }],
    result: null,
    ...over,
  });

  it("puts a campaign between scenarios at the Begin prompt of the scenario its index named, with the flat log as the notes section", () => {
    const c = migrateCampaign(db, old(), false);
    expect(c.flow.play).toBe("the-midnight-masks");
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-midnight-masks" });
    expect(c.flow.pos).toBe(1);
    expect(flatLog(c.log)).toEqual({ houseBurned: true, cultistsGotAway: ["01121"] });
    expect(c.investigators[0].xp).toBe(2);
    expect("scenarioIndex" in c).toBe(false);
  });

  it("puts a campaign in the middle of a scenario at that scenario, playing", () => {
    const c = migrateCampaign(db, old(), true);
    expect(c.flow).toMatchObject({ play: "the-midnight-masks", playing: true, waiting: null });
  });

  it("leaves a campaign past its last scenario with nothing to play", () => {
    const c = migrateCampaign(db, old({ scenarioIndex: 3, result: "win" }), false);
    expect(c.flow.play).toBeNull();
    expect(c.flow.waiting).toBeNull();
    expect(c.result).toBe("win");
  });

  it("keeps a campaign that already has a flow as it is", () => {
    const c = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 3,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
    });
    expect(migrateCampaign(db, JSON.parse(JSON.stringify(c)), false)).toEqual(c);
  });

  it("goes on from a migrated campaign: the scenario ends and the flow reaches the next one", () => {
    const c = migrateCampaign(db, old(), true);
    const r = mutate(createGame(db, scenarioSetup(db, c, 1)), (g) => {
      g.s.phase = "ended";
      g.s.resolution = "R1";
      g.s.pending = null;
    });
    expect(applyScenarioEnd(db, c, r.state).flow.play).toBe("the-devourer-below");
  });
});
