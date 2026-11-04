import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCounter, addTokens, card, inv, type GameContext } from "../../context";
import { game, investigate, lastTest } from "../../kits/driver";
import { createCard, moveCard } from "../../movement";
import { findByCode, matchesFilter } from "../../queries";
import {
  commitDone,
  db,
  gOf,
  mutate,
  pick,
  putEnemy,
  locId,
  skipMulligans,
  start,
} from "../../kits/testkit";
import { TokenEffect } from "../../../content/schema";
import { allCardRecsIn, invStateIn, pileRecIn } from "../../world/store";
import { ZONE, PILE } from "../../world/constants";

const ROLAND = "01001";
const GHOUL = "01161"; // Ravenous Ghoul

/** the Gathering's standard skull, replaced for a test and put back after */
const tokens = db.scenarios["the-gathering"].tokens;
let saved: TokenEffect | undefined;
const setSkull = (e: TokenEffect) => (tokens.standard!.skull = e);
const savedTablet = tokens.standard!.tablet;
beforeEach(() => {
  saved = tokens.standard!.skull;
});
afterEach(() => {
  tokens.standard!.skull = saved!;
  tokens.standard!.tablet = savedTablet;
});

/** take every Ghoul enemy out of the encounter deck and its discard pile */
const noGhouls = (game: GameContext) => {
  for (const id of [
    ...pileRecIn(game.s, PILE.EncounterDeck),
    ...pileRecIn(game.s, PILE.EncounterDiscard),
  ])
    if (matchesFilter(game, card(game, id).code, { type: "enemy", trait: "Ghoul" }))
      moveCard(game, id, ZONE.Removed);
};

/** Roland investigates the Study with the bag holding only `token`, and fails it (intellect 3 against shroud 2 with -2) */
const failInvestigate = (
  r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["skull"] as never })),
) => commitDone(pick(r, "Investigate Study"));

describe("searchEncounterDraw: search the encounter deck and discard pile for an enemy and draw it", () => {
  const search: TokenEffect = {
    modifier: -2,
    onFail: [{ op: "searchEncounterDraw", filter: { type: "enemy", trait: "Ghoul" } }],
  };

  it("takes the enemy from the discard pile; the investigator draws it and it engages them", () => {
    setSkull(search);
    let r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["skull"] as never }));
    let ghoul = "";
    r = mutate(r, (game) => {
      noGhouls(game);
      ghoul = createCard(game, GHOUL, ZONE.Limbo);
      moveCard(game, ghoul, ZONE.EncounterDiscard);
    });
    r = failInvestigate(r);
    const game = gOf(r);
    expect(card(game, ghoul).zone).toBe("enemy");
    expect(card(game, ghoul).engagedWith).toBe(ROLAND);
    expect(pileRecIn(r.state, PILE.EncounterDiscard)).not.toContain(ghoul);
  });

  it("takes the enemy from the deck when it is there, and shuffles the deck", () => {
    setSkull(search);
    let r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["skull"] as never }));
    let ghoul = "";
    r = mutate(r, (game) => {
      noGhouls(game);
      ghoul = createCard(game, GHOUL, ZONE.EncounterDeck);
    });
    const before = [...pileRecIn(r.state, PILE.EncounterDeck)];
    r = failInvestigate(r);
    const game = gOf(r);
    expect(card(game, ghoul).zone).toBe("enemy");
    expect(pileRecIn(r.state, PILE.EncounterDeck)).toHaveLength(before.length - 1);
    expect(r.state.log.some((e) => /shuffles the encounter deck/.test(e.text))).toBe(true);
  });

  it("does nothing when no such enemy is left", () => {
    setSkull(search);
    let r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["skull"] as never }));
    r = mutate(r, noGhouls);
    const enemies = (x: typeof r) =>
      allCardRecsIn(x.state).filter((c) => c.zone === "enemy").length;
    const before = enemies(r);
    r = failInvestigate(r);
    expect(enemies(r)).toBe(before);
    expect(findByCode(gOf(r), GHOUL, [ZONE.Enemy])).toBeUndefined();
  });
});

describe("revealAnother with a condition", () => {
  /** play the investigation on seeds 1..30 with a bag of one tablet and one +1; how many tokens were revealed, and was the first the tablet */
  const sweep = (ghoulInPlay: boolean) =>
    Array.from({ length: 30 }, (_, k) => {
      let r = skipMulligans(
        start("the-gathering", [ROLAND], k + 1, { chaosBag: ["tablet", "+1"] as never }),
      );
      r = mutate(r, (game) => {
        if (ghoulInPlay) putEnemy(game, "01160", locId(game, "01111"));
      });
      r = commitDone(pick(r, "Investigate Study"));
      const revealed = r.state.log
        .filter((e) => e.type === "token")
        .map((e) => (e.data as { token: string }).token);
      return { first: revealed[0], count: revealed.length };
    });
  const noGhoulCondition: TokenEffect = {
    modifier: -2,
    revealAnother: { if: { not: { enemyInPlay: { type: "enemy", trait: "Ghoul" } } } },
  };

  it("reveals another token when the condition holds: no Ghoul enemy in play", () => {
    tokens.standard!.tablet = noGhoulCondition;
    const runs = sweep(false);
    expect(runs.some((x) => x.first === "tablet")).toBe(true);
    for (const x of runs) expect(x.count, x.first).toBe(x.first === "tablet" ? 2 : 1);
  });

  it("does not when it fails: a Ghoul enemy is in play", () => {
    tokens.standard!.tablet = noGhoulCondition;
    const runs = sweep(true);
    expect(runs.some((x) => x.first === "tablet")).toBe(true);
    for (const x of runs) expect(x.count).toBe(1);
  });

  it("the old forms stay valid", () => {
    expect(TokenEffect.safeParse({ modifier: -1, revealAnother: true }).success).toBe(true);
    expect(
      TokenEffect.safeParse({ modifier: -1, revealAnother: "ifAncientOneInPlay" }).success,
    ).toBe(true);
    expect(
      TokenEffect.safeParse({
        modifier: -1,
        revealAnother: { if: { enemyInPlay: { trait: "Cultist" } } },
      }).success,
    ).toBe(true);
  });
});

describe("Night of the Zealot on Hard and Expert, from the backs of the reference cards", () => {
  it("every hand-written scenario defines all four difficulties", () => {
    for (const id of ["the-gathering", "the-midnight-masks", "the-devourer-below"])
      for (const d of ["easy", "standard", "hard", "expert"] as const)
        expect(Object.keys(db.scenarios[id].tokens[d] ?? {}), `${id} ${d}`).not.toEqual([]);
  });

  it("The Gathering, Hard: a failed skull draws a Ghoul from the discard pile", () => {
    let r = skipMulligans(
      start("the-gathering", [ROLAND], 1, { difficulty: "hard", chaosBag: ["skull"] as never }),
    );
    let ghoul = "";
    r = mutate(r, (game) => {
      noGhouls(game);
      ghoul = createCard(game, GHOUL, ZONE.Limbo);
      moveCard(game, ghoul, ZONE.EncounterDiscard);
    });
    r = commitDone(pick(r, "Investigate Study"));
    expect(r.state.log.some((e) => e.type === "token" && /skull/.test(e.text))).toBe(true);
    const game = gOf(r);
    expect(card(game, ghoul).zone).toBe("enemy");
    expect(card(game, ghoul).engagedWith).toBe(ROLAND);
  });

  it("The Gathering, Expert: a cultist reveals another token, and a failed test costs 2 horror", () => {
    const runs = Array.from({ length: 30 }, (_, k) => {
      let r = skipMulligans(
        start("the-gathering", [ROLAND], k + 1, {
          difficulty: "expert",
          chaosBag: ["cultist", "-4"] as never,
        }),
      );
      r = commitDone(pick(r, "Investigate Study"));
      const tokens = r.state.log.filter((e) => e.type === "token");
      return {
        first: /cultist/.test(tokens[0].text),
        count: tokens.length,
        horror: invStateIn(r.state, ROLAND).horror,
      };
    });
    expect(runs.some((x) => x.first)).toBe(true);
    for (const x of runs) {
      expect(x.count).toBe(x.first ? 2 : 1);
      if (x.first) expect(x.horror).toBe(2); // the -4 that follows fails the test
    }
  });

  it("The Midnight Masks, Expert: a cultist with no Cultist enemy in play places no doom and reveals another token", () => {
    const runs = Array.from({ length: 30 }, (_, k) => {
      let r = skipMulligans(
        start("the-midnight-masks", [ROLAND], k + 1, {
          difficulty: "expert",
          chaosBag: ["cultist", "0"] as never,
        }),
      );
      expect(
        allCardRecsIn(r.state).filter(
          (c) => c.zone === "enemy" && db.cards[c.code].traits.includes("Cultist"),
        ),
      ).toEqual([]);
      r = commitDone(pick(r, /^Investigate/));
      const tokens = r.state.log.filter((e) => e.type === "token");
      return { first: /cultist/.test(tokens[0].text), count: tokens.length };
    });
    expect(runs.some((x) => x.first)).toBe(true);
    for (const x of runs) expect(x.count).toBe(x.first ? 2 : 1);
  });
});

describe("a token line's `instead`", () => {
  it("reads its other modifier while the condition holds (−3 at 3 horror, −1 at 2)", () => {
    setSkull({ modifier: -1, instead: { when: { horror: { min: 3 } }, modifier: -3 } });
    const at = (horror: number) => {
      const r = investigate(
        game({
          investigators: [ROLAND],
          bag: ["skull"],
          prep: (g) => addCounter(g, ROLAND, "horror", horror),
        }),
      );
      const t = lastTest(r)!;
      return t.total - t.base;
    };
    expect(at(3)).toBe(-3);
    expect(at(2)).toBe(-1);
  });
});

describe("a token X counting named tokens", () => {
  it("−X, X the wards on your location", () => {
    setSkull({ modifier: "X", x: "tokensOn", xTokens: { name: "ward", on: "yourLocation" } });
    const r = investigate(
      game({
        investigators: [ROLAND],
        bag: ["skull"],
        prep: (g) => void addTokens(g, inv(g, ROLAND).location!, "ward", 2),
      }),
    );
    const t = lastTest(r)!;
    expect(t.total - t.base).toBe(-2);
  });
});
