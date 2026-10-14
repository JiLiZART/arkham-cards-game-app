import { describe, expect, it } from "vitest";
import { autoPlay } from "./bot";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "./campaign";
import { card, def, findByCode, inv, moveCard } from "./core";
import { createGame } from "./engine";
import { db, gOf, mutate, skipMulligans, start } from "./testkit";

const ROLAND = "01001";
const AGNES = "01004";

describe("campaign", () => {
  it("starts Night of the Zealot with the Gathering and the Standard bag", () => {
    const c = startCampaign(db, { campaignId: "night-of-the-zealot", difficulty: "standard", seed: 3, investigators: [{ code: ROLAND, deckId: "roland-starter" }, { code: AGNES, deckId: "agnes-starter" }] });
    expect(c.log).toEqual({});
    const s = scenarioSetup(db, c, 1);
    expect(s.scenarioId).toBe("the-gathering");
    expect(s.chaosBag).toEqual(db.campaigns["night-of-the-zealot"].chaosBags.standard);
    expect(s.investigators.map((i) => i.code)).toEqual([ROLAND, AGNES]);
    // Agnes' deck gets one random basic weakness at campaign start
    const agnes = c.investigators[1].deck.filter((code) => db.cards[code].subtype === "basicweakness");
    expect(agnes).toHaveLength(1);
  });

  it("The Gathering setup", () => {
    const r = skipMulligans(start("the-gathering", [ROLAND, AGNES], 1));
    const g = gOf(r);
    const inPlay = Object.values(g.s.cards).filter((c) => c.zone === "location").map((c) => def(g, c.id).name);
    expect(inPlay).toEqual(["Study"]);
    expect(Object.values(g.s.invs).every((i) => def(g, i.location!).name === "Study")).toBe(true);
    for (const code of ["01116", "01117"]) {
      expect(findByCode(g, code)!.zone).toBe("setAside");
      expect(g.s.encounterDeck.some((id) => card(g, id).code === code)).toBe(false);
    }
  });

  it("log-dependent setup: house burned → Rivertown", () => {
    const burned = skipMulligans(start("the-midnight-masks", [ROLAND], 1, { campaignLog: { houseBurned: true } }));
    const g = gOf(burned);
    expect(def(g, inv(g, ROLAND).location!).name).toBe("Rivertown");
    expect(findByCode(g, "01124")!.zone).toBe("removed");
    const standing = skipMulligans(start("the-midnight-masks", [ROLAND], 1, { campaignLog: { houseStanding: true } }));
    expect(def(gOf(standing), inv(gOf(standing), ROLAND).location!).name).toBe("Your House");
  });

  it("awards victory XP plus resolution bonus", () => {
    const c = startCampaign(db, { campaignId: "night-of-the-zealot", difficulty: "standard", seed: 3, investigators: [{ code: ROLAND, deckId: "roland-starter" }, { code: AGNES, deckId: "agnes-starter" }] });
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
    expect(next.log.houseBurned).toBe(true);
    expect(next.investigators[0].mentalTrauma).toBe(1); // lead
    expect(next.investigators[0].deck).toContain("01117"); // Lita earned
    expect(next.scenarioIndex).toBe(1);
  });

  it("weakness in the opening hand is set aside and redrawn", () => {
    // put Paranoia on top of Roland's deck before the opening hand is drawn: use a seed search
    for (let seed = 1; seed < 200; seed++) {
      const r = start("the-gathering", [ROLAND], seed);
      const aside = (r.state.flags[`aside:${ROLAND}`] as string[] | undefined) ?? [];
      if (!aside.length) continue;
      expect(r.state.invs[ROLAND].hand).toHaveLength(5);
      expect(r.state.invs[ROLAND].hand.some((id) => db.cards[r.state.cards[id].code].subtype)).toBe(false);
      const after = skipMulligans(r);
      expect(after.state.invs[ROLAND].deck).toContain(aside[0]);
      return;
    }
    throw new Error("no seed put a weakness in the opening hand");
  });

  it("bot playthrough: The Gathering reaches a resolution and the campaign continues", () => {
    const c = startCampaign(db, { campaignId: "night-of-the-zealot", difficulty: "easy", seed: 11, investigators: [{ code: ROLAND, deckId: "roland-starter" }] });
    const r = autoPlay(db, createGame(db, scenarioSetup(db, c, 5)));
    expect(r.state.phase).toBe("ended");
    const next = applyScenarioEnd(db, c, r.state);
    expect(next.history[0].scenarioId).toBe("the-gathering");
  });
});
