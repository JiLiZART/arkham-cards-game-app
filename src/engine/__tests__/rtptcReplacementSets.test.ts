/**
 * The five replacement encounter sets of Return to The Path to Carcosa (campaign-return-to-the-path-to-carcosa, task
 * 1.4): Delusory Evils, Decaying Reality, Hastur's Envoys, Maddening Delusions, Neurotic Fear. One test per card, each
 * drawn in The Gathering's Study.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import {
  card,
  cardsOf,
  currentAct,
  currentAgenda,
  inv,
  placeInvestigator,
  setCounter,
  setEngaged,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { enemyStat, findByCode, gainsKeyword, isHidden, shroud } from "../queries";
import { preyCandidates } from "../rules/enemies";
import {
  addLocation,
  game,
  hand,
  inject,
  lastTest,
  offered,
  rigBag,
  toTurn,
  until,
} from "../kits/driver";
import { gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, sanity 5
const D = "01002"; // Daisy: sanity 9
const STUDY = "01111";

/** Roland's game (Daisy's too when two are given), the encounter deck emptied so a surge or the mythos draws nothing */
const start = (prep?: (game: GameContext) => void, bag: ChaosToken[] = ["0"], invs = [R]) =>
  game({
    investigators: invs,
    bag,
    prep: (g) => {
      for (const c of cardsOf(g.s).filter((x) => x.zone === ZONE.EncounterDeck))
        moveCard(g, c.id, ZONE.Limbo);
      prep?.(g);
    },
  });
/** `who` draws this encounter card; the run stops at the next choice */
function draw(r: Result, code: string, who = R): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.EncounterDeck);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const zoneOf = (r: Result, code: string) => findByCode(gOf(r), code)?.zone;
const here = (game: GameContext) => inv(game, R).location!;
/** a Ghoul Minion for a surge to draw (an empty deck would reshuffle the surging card back in) */
const ghoul = (game: GameContext) => void createCard(game, "01160", ZONE.EncounterDeck);
const surged = (r: Result) =>
  cardsOf(r.state).some((c) => c.code === "01160" && c.zone === ZONE.Enemy);
const emptyHand = (game: GameContext) => {
  for (const h of inv(game, R).hand.slice()) moveCard(game, h, ZONE.Discard);
};

describe("Decaying Reality", () => {
  it("52066 Bleeding Walls: test [willpower] (X), X your location's shroud; failed, lose 1 action and take 1 horror", () => {
    const cellar = (game: GameContext) => {
      placeInvestigator(game, R, addLocation(game, "01114", [[STUDY, "01114"]]));
    };
    const r = toTurn(draw(start(cellar, ["+1"]), "52066"), R);
    expect(shroud(gOf(r), here(gOf(r)))).toBe(4);
    expect(lastTest(r)?.difficulty).toBe(4);
    expect([inv(gOf(r), R).actionsLeft, inv(gOf(r), R).horror]).toEqual([3, 0]);
    const failed = toTurn(draw(start(cellar, ["0"]), "52066"), R);
    expect([inv(gOf(failed), R).actionsLeft, inv(gOf(failed), R).horror]).toEqual([2, 1]);
  });

  it("52067 Fragile Thoughts: events from your hand costing at least X in all are discarded; none, it gains surge", () => {
    let [cache, blast] = ["", ""];
    const r = draw(
      start((g) => {
        emptyHand(g);
        ghoul(g);
        cache = hand(g, R, "01088"); // Emergency Cache, 0
        blast = hand(g, R, "01024"); // Dynamite Blast, 5
      }),
      "52067",
    );
    expect(options(r)).toEqual(["Emergency Cache", "Dynamite Blast"]);
    const done = toTurn(pick(r, "Dynamite Blast"), R);
    expect(card(gOf(done), blast).zone).toBe(ZONE.Discard);
    expect(card(gOf(done), cache).zone).toBe(ZONE.Hand);
    expect(surged(done)).toBe(false);
    // with no event in hand nothing is discarded: it surges
    const none = toTurn(
      draw(
        start((g) => {
          emptyHand(g);
          ghoul(g);
        }),
        "52067",
      ),
      R,
    );
    expect(surged(none)).toBe(true);
  });

  it("52068 Maggot Swarm: its location gets +2 shroud; at a location with no clues it is a hunter", () => {
    let swarm = "";
    const r = start((g) => {
      swarm = putEnemy(g, "52068", here(g));
    });
    const g = gOf(r);
    expect(shroud(g, here(g))).toBe(2 + 2);
    setCounter(g, here(g), "clues", 1);
    expect(gainsKeyword(g, swarm, "hunter")).toBe(false);
    setCounter(g, here(g), "clues", 0);
    expect(gainsKeyword(g, swarm, "hunter")).toBe(true);
  });
});

describe("Hastur's Envoys", () => {
  it("52069 Preying Byakhee: prey lowest remaining sanity only; fight and evade swapped while engaged with 4 or less", () => {
    let byakhee = "";
    const r = start(
      (g) => {
        byakhee = putEnemy(g, "52069", here(g));
      },
      ["0"],
      [R, D],
    );
    const g = gOf(r);
    // Roland (5) is the lowest: Daisy alone is never its prey, as if Roland were the only investigator
    expect(preyCandidates(g, byakhee, [D])).toEqual([]);
    expect(preyCandidates(g, byakhee, [R, D])).toEqual([R]);
    setCounter(g, D, "horror", 6); // Daisy now 3
    expect(preyCandidates(g, byakhee, [R])).toEqual([]);
    setEngaged(g, byakhee, R);
    expect([enemyStat(g, byakhee, "fight"), enemyStat(g, byakhee, "evade")]).toEqual([2, 5]);
    setCounter(g, R, "horror", 1); // remaining sanity 4
    expect([enemyStat(g, byakhee, "fight"), enemyStat(g, byakhee, "evade")]).toEqual([5, 2]);
  });

  it("52070 The Sign of Hastur: attached to the agenda or the act, one each; each horror taken comes with 1 more", () => {
    let r = draw(start(), "52070");
    expect(options(r)).toEqual(["Attach it to the current agenda", "Attach it to the current act"]);
    r = toTurn(pick(r, /agenda/), R);
    const g = gOf(r);
    const sign = findByCode(g, "52070", [ZONE.Attached])!;
    expect(sign.attachedTo).toBe(currentAgenda(g));
    // the agenda has one: the second goes to the act without asking
    r = toTurn(draw(r, "52070"), R);
    const signs = cardsOf(r.state).filter((c) => c.code === "52070" && c.zone === ZONE.Attached);
    expect(signs.map((c) => c.attachedTo).sort()).toEqual(
      [currentAgenda(gOf(r)), currentAct(gOf(r))].sort(),
    );
    const hurt = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "takeHorror", amount: 1 },
        ctx: { you: R, source: null },
      }),
      R,
    );
    expect(inv(gOf(hurt), R).horror).toBe(3); // 1, and 1 more for each Sign
  });
});

describe("Maddening Delusions", () => {
  it.each([
    ["52071", "play"],
    ["52072", "resource"],
    ["52073", "move"],
    ["52074", "draw"],
  ])(
    "%s Visions in Your Mind: hidden; a turn without a %s action ends with it discarded, 1 direct damage and horror",
    (code, kind) => {
      const two = start(
        (g) => {
          hand(g, R, "01088"); // Emergency Cache: a play action
          addLocation(g, "01112", [[STUDY, "01112"]]);
        },
        ["0"],
        [R, D],
      );
      const r = toTurn(draw(two, code), R);
      const id = findByCode(gOf(r), code)!.id;
      expect(isHidden(gOf(r), id)).toBe(true);
      // the turn ends with no action of its kind
      const idle = toTurn(pick(r, "End turn"), D);
      expect(card(gOf(idle), id).zone).toBe(ZONE.EncounterDiscard);
      expect([inv(gOf(idle), R).damage, inv(gOf(idle), R).horror]).toEqual([1, 1]);
      // one action of its kind keeps it silent
      const act = {
        play: /^Play Emergency Cache/,
        resource: "Gain 1 resource",
        move: "Move to Hallway",
        draw: "Draw 1 card",
      }[kind]!;
      const busy = toTurn(pick(toTurn(pick(r, act), R), "End turn"), D);
      expect(card(gOf(busy), id).zone).toBe(ZONE.Hand);
      expect([inv(gOf(busy), R).damage, inv(gOf(busy), R).horror]).toEqual([0, 0]);
    },
  );

  it("52075 Maddening Delusions: surge; 1 horror while a hidden card is in your hand", () => {
    const plain = toTurn(draw(start(ghoul), "52075"), R);
    expect(inv(gOf(plain), R).horror).toBe(0);
    expect(surged(plain)).toBe(true);
    const visions = toTurn(draw(start(ghoul), "52071"), R);
    const r = toTurn(draw(visions, "52075"), R);
    expect(inv(gOf(r), R).horror).toBe(1);
  });
});

describe("Delusory Evils", () => {
  it("52065: secretly into your hand, or 1 doom on the agenda and discarded", () => {
    const r = draw(start(), "52065");
    expect(options(r)).toEqual([
      "Secretly add Delusory Evils to your hand",
      "Place 1 doom on the current agenda and discard it",
    ]);
    const doom = toTurn(pick(r, /doom/), R);
    expect(card(gOf(doom), currentAgenda(gOf(doom))!).doom).toBe(1);
    expect(zoneOf(doom, "52065")).toBe(ZONE.EncounterDiscard);
    const hidden = toTurn(pick(r, /Secretly/), R);
    expect(isHidden(gOf(hidden), findByCode(gOf(hidden), "52065")!.id)).toBe(true);
  });

  it("52065 in hand: a test you would succeed by 3 or more you fail instead, and it is discarded", () => {
    const test = (r: Result, difficulty: number) =>
      toTurn(
        inject(r, () => {}, {
          t: STEP.Eff,
          effect: { op: "skillTest", skill: "willpower", difficulty },
          ctx: { you: R, source: null },
        }),
        R,
      );
    const held = toTurn(pick(draw(start(), "52065"), /Secretly/), R);
    const by2 = test(held, 1);
    expect(lastTest(by2)?.success).toBe(true);
    expect(zoneOf(by2, "52065")).toBe(ZONE.Hand);
    const by3 = test(held, 0);
    expect(lastTest(by3)?.success).toBe(false);
    expect(zoneOf(by3, "52065")).toBe(ZONE.EncounterDiscard);
  });
});

describe("Neurotic Fear", () => {
  it("52076 Voice of Tru'nembra: a different option for each point failed by", () => {
    const r = until(draw(start(undefined, ["-3"]), "52076"), offered("Take 1 horror")); // 3 - 3 against 3: failed by 3
    expect(options(r)).toEqual([
      "Lose 2 resources",
      "Take 1 horror",
      "Get -2 to the next skill test you perform this round",
    ]);
    const second = pick(r, "Lose 2 resources");
    expect(options(second)).toEqual([
      "Take 1 horror",
      "Get -2 to the next skill test you perform this round",
    ]);
    const done = toTurn(pick(second, "Take 1 horror"), R);
    const g = gOf(done);
    expect(inv(g, R).resources).toBe(5 - 2);
    expect(inv(g, R).horror).toBe(1);
    // the third came without asking: the next test is at -2
    const next = toTurn(
      inject(rigBag(done, ["0"]), () => {}, {
        t: STEP.Eff,
        effect: { op: "skillTest", skill: "willpower", difficulty: 0 },
        ctx: { you: R, source: null },
      }),
      R,
    );
    expect(lastTest(next)?.total).toBe(3 - 2);
    // failed by 1: one option only
    const one = until(draw(start(undefined, ["-1"]), "52076"), offered("Take 1 horror"));
    expect(toTurn(pick(one, "Take 1 horror"), R).state.pending?.kind).toBe("turn");
  });

  it("52077 Melancholy: cards in hand cost 1 more; at the end of your turn, a [willpower] (3) test discards it", () => {
    const beatCop = (game: GameContext) => {
      hand(game, R, "01018"); // Beat Cop, 4
      setCounter(game, R, "resources", 4);
    };
    const r = toTurn(draw(start(beatCop, ["0"], [R, D]), "52077"), R);
    expect(zoneOf(r, "52077")).toBe(ZONE.Threat);
    expect(options(r).some((o) => o.startsWith("Play Beat Cop"))).toBe(false);
    expect(zoneOf(toTurn(pick(r, "End turn"), D), "52077")).toBe(ZONE.EncounterDiscard);
    const kept = toTurn(draw(start(beatCop, ["autoFail"], [R, D]), "52077"), R);
    expect(zoneOf(toTurn(pick(kept, "End turn"), D), "52077")).toBe(ZONE.Threat);
  });

  it("52078 Painful Reflection: playing an event reveals a token; a symbol or the tentacle cancels it, 1 horror, discarded", () => {
    let cache = "";
    const prep = (game: GameContext) => {
      emptyHand(game);
      cache = hand(game, R, "01088"); // Emergency Cache: gain 3 resources
    };
    const reflected = (bag: ChaosToken[]) =>
      toTurn(pick(toTurn(draw(start(prep, bag), "52078"), R), /^Play Emergency Cache/), R);
    const cancelled = reflected(["skull"]);
    expect(inv(gOf(cancelled), R).resources).toBe(5);
    expect(inv(gOf(cancelled), R).horror).toBe(1);
    expect(zoneOf(cancelled, "52078")).toBe(ZONE.EncounterDiscard);
    expect(card(gOf(cancelled), cache).zone).toBe(ZONE.Discard);
    const played = reflected(["0"]);
    expect(inv(gOf(played), R).resources).toBe(8);
    expect(zoneOf(played, "52078")).toBe(ZONE.Threat);
  });
});
