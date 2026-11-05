/** The Miskatonic Museum (campaign-the-dunwich-legacy, group 3): setup, tokens, map, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, dispatch, type Result } from "../index";
import { next } from "../world/rng";
import { db, gOf, mutate, options, pick, skipMulligans } from "../kits/testkit";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry } from "../campaign/log";
import { game, inject, inPlay, lastTest, move, toTurn, until, use } from "../kits/driver";
import { connections, enemyStat, findByCode, isMassive, skillValue } from "../queries";
import { campaignTokens } from "../world/flags";
import {
  addCounter,
  card,
  currentAct,
  currentAgenda,
  exhaust,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setController,
  setCounter,
  sideDeck,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; 5 resources
const D = "01002"; // Daisy
const HORROR = "02141";
const ENTRANCE = "02126";
const HALLS = "02127";
const RESTRICTED = "02137";
const EXHIBITS = ["02132", "02133", "02134", "02135", "02136", "02137"];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  prep?: (game: GameContext) => void;
}
/** The Miskatonic Museum at its first turn: Roland alone, the bag a single 0 */
const tmm = ({ invs = [R], bag = ["0"], difficulty = "standard", seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "the-miskatonic-museum",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-dunwich-legacy", difficulty },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const codeOf = (r: Result, id: string | null | undefined) => (id ? card(gOf(r), id).code : null);
const at = (r: Result, who = R) => codeOf(r, inv(gOf(r), who).location);
const where = (r: Result, code: string) => findByCode(gOf(r), code)?.zone;
/** an Exhibit Hall out of the Exhibit deck into play, revealed or not */
const place = (game: GameContext, code: string, revealed = true) => {
  const id =
    loc(game, code) ?? findByCode(game, code, [ZONE.SideDeck, ZONE.SetAside, ZONE.Removed])!.id;
  if (card(game, id).zone !== ZONE.Location) moveCard(game, id, ZONE.Location);
  if (revealed) reveal(game, id);
  return id;
};
/** Roland at a location, revealed */
const goTo = (game: GameContext, code: string, who = R) => {
  const id = place(game, code);
  placeInvestigator(game, who, id);
  return id;
};
/** the Hunting Horror out of the encounter deck at a location, not engaged */
const horrorAt = (game: GameContext, code: string) => {
  const h = findByCode(game, HORROR, [ZONE.EncounterDeck])!.id;
  moveCard(game, h, ZONE.Enemy, { location: loc(game, code) });
  return h;
};
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** Roland draws this encounter card */
function draw(r: Result, code: string, who = R): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = findByCode(g, code, [ZONE.EncounterDeck])?.id ?? createCard(g, code, ZONE.EncounterDeck);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const willpowerTest = (difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill: "willpower", difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
const toEnd = (r: Result) => until(r, () => false, 300);

// ---------- 3.2 setup ----------
describe("setup", () => {
  it("one Administration Office and one Security Office beside the Entrance and the Halls; everyone at the Entrance", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = tmm({ invs: [R, D], seed });
      const g = gOf(r);
      const inPlayCodes = (codes: string[]) => codes.filter((c) => loc(g, c));
      expect(inPlayCodes(["02130", "02131"])).toHaveLength(1);
      expect(inPlayCodes(["02128", "02129"])).toHaveLength(1);
      expect(loc(g, ENTRANCE)).toBeDefined();
      expect(card(g, loc(g, HALLS)!).revealed).toBe(false);
      expect(at(r, R)).toBe(ENTRANCE);
      expect(at(r, D)).toBe(ENTRANCE);
      for (const c of ["02128", "02129", "02130", "02131"].filter((c) => !loc(g, c)))
        expect(where(r, c)).toBe(ZONE.Removed);
    }
  });

  it("the Exhibit deck: six halls unrevealed, the Restricted Hall among the bottom three", () => {
    const seen = new Set<number>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const g = gOf(tmm({ seed }));
      const deck = sideDeck(g, "exhibit").map((id) => card(g, id).code);
      expect([...deck].sort()).toEqual(EXHIBITS);
      expect(deck.indexOf(RESTRICTED)).toBeGreaterThanOrEqual(3);
      seen.add(deck.indexOf(RESTRICTED));
      for (const id of sideDeck(g, "exhibit")) expect(card(g, id).revealed).toBe(false);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("set aside: Harold Walsted, Adam Lynch, the Necronomicon, Shadow-spawned; the Horror in the encounter deck", () => {
    const r = tmm();
    for (const c of ["02138", "02139", "02140", "02142"]) expect(where(r, c)).toBe(ZONE.SetAside);
    expect(where(r, HORROR)).toBe(ZONE.EncounterDeck);
  });

  it("the Halls are locked: no one moves into them", () => {
    const r = tmm();
    expect(options(r).some((o) => /Museum Halls/.test(o) && /Move/.test(o))).toBe(false);
  });
});

// ---------- 3.3 tokens ----------
describe("chaos tokens", () => {
  function testWith(token: ChaosToken, difficulty: Difficulty, horror: boolean, against = 0) {
    let h = "";
    const r = tmm({
      bag: [token],
      difficulty,
      prep: (g) => {
        if (horror) h = horrorAt(g, ENTRANCE);
      },
    });
    const after = run(r, willpowerTest(against));
    return { r, after, h };
  }

  for (const [d, skull, skullH, cultist, _tablet, elder] of [
    ["easy", -1, -3, -1, -2, -3],
    ["standard", -1, -3, -1, -2, -3],
    ["hard", -2, -4, -3, -4, -5],
    ["expert", -2, -4, -3, -4, -5],
  ] as const) {
    it(`${d}: skull ${skull}, ${skullH} with the Hunting Horror at your location`, () => {
      expect(mods(testWith("skull", d, false).after)).toEqual([skull]);
      expect(mods(testWith("skull", d, true).after)).toEqual([skullH]);
    });

    it(`${d}: cultist ${cultist}; a failure spawns the Horror at your location`, () => {
      const pass = testWith("cultist", d, false, -10);
      expect(mods(pass.after)).toEqual([cultist]);
      expect(where(pass.after, HORROR)).toBe(ZONE.EncounterDeck);
      const fail = testWith("cultist", d, false, 10).after;
      const h = findByCode(gOf(fail), HORROR, [ZONE.Enemy])!;
      expect(codeOf(fail, h.location)).toBe(ENTRANCE);
    });

    it(`${d}: elder thing ${elder}; a failure discards an asset`, () => {
      let gun = "";
      const r = tmm({
        bag: ["elderThing"],
        difficulty: d,
        prep: (g) => {
          gun = inPlay(g, R, "01006");
        },
      });
      const after = until(run(r, willpowerTest(10)), (x) => x.state.pending?.kind === "turn");
      expect(mods(after)).toEqual([elder]);
      expect(card(gOf(after), gun).zone).not.toBe(ZONE.Play);
    });
  }

  for (const d of ["easy", "standard"] as const)
    it(`${d}: tablet −2, 1 of your clues back on your location`, () => {
      const r = tmm({ bag: ["tablet"], difficulty: d, prep: (g) => setCounter(g, R, "clues", 2) });
      const before = card(gOf(r), loc(gOf(r), ENTRANCE)!).clues;
      const after = run(r, willpowerTest());
      expect(mods(after)).toEqual([-2]);
      expect(inv(gOf(after), R).clues).toBe(1);
      expect(card(gOf(after), loc(gOf(after), ENTRANCE)!).clues).toBe(before + 1);
    });

  for (const d of ["hard", "expert"] as const)
    it(`${d}: tablet −4, and the Horror at your location attacks you`, () => {
      expect(mods(testWith("tablet", d, false).after)).toEqual([-4]);
      expect(inv(gOf(testWith("tablet", d, false).after), R).damage).toBe(0);
      const { after } = testWith("tablet", d, true);
      expect(mods(after)).toEqual([-4]);
      expect(inv(gOf(after), R).damage).toBe(1);
      expect(inv(gOf(after), R).horror).toBe(1);
    });
});

// ---------- 3.4 connections ----------
describe("connections", () => {
  const linked = (game: GameContext, a: string, b: string) =>
    connections(game, loc(game, a)!).includes(loc(game, b)!);

  it("the Entrance only to the Halls; the Halls to the offices and every Exhibit Hall; the paired exhibits", () => {
    const r = tmm({
      prep: (g) => {
        for (const c of EXHIBITS) place(g, c);
      },
    });
    const g = gOf(r);
    const office = ["02130", "02131"].find((c) => loc(g, c))!;
    const security = ["02128", "02129"].find((c) => loc(g, c))!;
    expect(connections(g, loc(g, ENTRANCE)!).map((l) => card(g, l).code)).toEqual([HALLS]);
    for (const c of [office, security, ...EXHIBITS]) {
      expect(linked(g, HALLS, c)).toBe(true);
      expect(linked(g, c, HALLS)).toBe(true);
    }
    expect(linked(g, "02133", "02135")).toBe(true);
    expect(linked(g, "02134", "02136")).toBe(true);
    expect(linked(g, office, security)).toBe(false);
    expect(connections(g, loc(g, "02132")!).map((l) => card(g, l).code)).toEqual([HALLS]);
    expect(connections(g, loc(g, RESTRICTED)!).map((l) => card(g, l).code)).toEqual([HALLS]);
  });
});

// ---------- 3.5 cards ----------
describe("act 1: Finding A Way Inside", () => {
  it("spending the clues: Adam Lynch joins, the Halls are revealed, act 2 is Night at the Museum", () => {
    const r = tmm({ prep: (g) => setCounter(g, R, "clues", 2) });
    const after = toTurn(pick(r, /advance/i), R);
    const g = gOf(after);
    expect(codeOf(after, currentAct(g))).toBe("02123");
    expect(card(g, loc(g, HALLS)!).revealed).toBe(true);
    expect(findByCode(g, "02139", [ZONE.Play])?.controller).toBe(R);
    expect(options(after).some((o) => /Move to Museum Halls/.test(o))).toBe(true);
  });

  it("breaking down the door: a [combat] (5) test at the Entrance, act 2 is Breaking and Entering, no Adam", () => {
    const r = tmm({ bag: ["+1"] });
    const after = toTurn(use(r, ENTRANCE, 2), R);
    const g = gOf(after);
    expect(lastTest(after)?.success).toBe(true);
    expect(codeOf(after, currentAct(g))).toBe("02124");
    expect(card(g, loc(g, HALLS)!).revealed).toBe(true);
    expect(where(after, "02139")).toBe(ZONE.SetAside);
    expect(pile(g, "actDeck").map((id) => card(g, id).code)).toEqual(["02125"]);
  });

  it("a failed test keeps the door shut", () => {
    const after = toTurn(use(tmm({ bag: ["-1"] }), ENTRANCE, 2), R);
    expect(codeOf(after, currentAct(gOf(after)))).toBe("02122");
  });
});

describe("Museum Entrance", () => {
  it("investigators there gain no resources; it has the resign action", () => {
    const r = tmm();
    const after = toTurn(pick(r, "Gain 1 resource"), R);
    expect(inv(gOf(after), R).resources).toBe(inv(gOf(r), R).resources);
    expect(options(r)).toContain("Museum Entrance: resign");
  });
});

describe("Museum Halls", () => {
  const atHalls = (clues: number, invs = [R]) =>
    tmm({
      invs,
      prep: (g) => {
        reveal(g, loc(g, HALLS)!);
        for (const i of invs) placeInvestigator(g, i, loc(g, HALLS)!);
        setCounter(g, R, "clues", clues);
      },
    });

  it("1 clue per investigator, as a group: the top of the Exhibit deck into play, unrevealed, connected to the Halls", () => {
    const r = atHalls(1);
    const top = sideDeck(gOf(r), "exhibit")[0];
    const after = toTurn(use(r, HALLS, 0), R);
    const g = gOf(after);
    expect(card(g, top).zone).toBe(ZONE.Location);
    expect(card(g, top).revealed).toBe(false);
    expect(sideDeck(g, "exhibit")).toHaveLength(5);
    expect(inv(g, R).clues).toBe(0);
    expect(connections(g, loc(g, HALLS)!)).toContain(top);
  });

  it("not offered without the clues of the investigators in the Halls", () => {
    expect(options(atHalls(1, [R, D])).some((o) => /Museum Halls:/.test(o))).toBe(false);
  });
});

describe("Security Offices", () => {
  const atOffice = (code: string, prep: (game: GameContext) => void = () => {}) => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = tmm({ seed });
      if (loc(gOf(r), code))
        return mutate(r, (g) => {
          goTo(g, code);
          prep(g);
        });
    }
    throw new Error(`no seed puts ${code} in play`);
  };

  it("02128: two actions to search the top 6 cards of your deck for a card; one with Adam Lynch", () => {
    const r = atOffice("02128");
    expect(options(r)).toContain(
      "Security Office: search the top 6 cards of your deck for a card [2 actions]",
    );
    const hand = inv(gOf(r), R).hand.length;
    const after = toTurn(use(r, "02128", 0), R);
    expect(inv(gOf(after), R).hand.length).toBe(hand + 1);
    expect(inv(gOf(after), R).actionsLeft).toBe(1);
    const adam = atOffice("02128", (g) => {
      const a = findByCode(g, "02139", [ZONE.SetAside])!.id;
      moveCard(g, a, ZONE.Play);
      setController(g, a, R);
    });
    expect(options(adam)).toContain(
      "Security Office: search the top 6 cards of your deck for a card",
    );
  });

  it("02129: two actions to look at the top of the Exhibit deck", () => {
    const r = atOffice("02129");
    const top = sideDeck(gOf(r), "exhibit")[0];
    const asked = use(r, "02129", 0);
    expect(asked.state.pending?.promptKey).toBe("exhibitSeen");
    expect(asked.state.pending?.shown).toEqual([top]);
    const after = toTurn(asked, R);
    expect(inv(gOf(after), R).actionsLeft).toBe(1);
    expect(sideDeck(gOf(after), "exhibit")[0]).toBe(top);
  });
});

describe("Administration Offices", () => {
  const investigable = (r: Result) =>
    options(r).some((o) => o.startsWith("Investigate Administration"));
  const atAdmin = (code: string, prep: (game: GameContext) => void) => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = tmm({ seed });
      if (loc(gOf(r), code))
        return mutate(r, (g) => {
          goTo(g, code);
          prep(g);
        });
    }
    throw new Error(`no seed puts ${code} in play`);
  };

  it("02130: not while you have 4 or fewer resources", () => {
    expect(investigable(atAdmin("02130", (g) => setCounter(g, R, "resources", 4)))).toBe(false);
    expect(investigable(atAdmin("02130", (g) => setCounter(g, R, "resources", 5)))).toBe(true);
  });

  it("02131: not while you have 4 or fewer cards in hand", () => {
    const hand = (n: number) => (game: GameContext) => {
      for (const id of inv(game, R).hand.slice(n)) moveCard(game, id, ZONE.Discard);
    };
    expect(investigable(atAdmin("02131", hand(4)))).toBe(false);
    expect(investigable(atAdmin("02131", hand(5)))).toBe(true);
  });
});

describe("Exhibit Halls", () => {
  /** Roland in the Halls, the exhibit beside them revealed, the bag rigged */
  const beside = (
    code: string,
    bag: ChaosToken[] = ["0"],
    prep: (game: GameContext) => void = () => {},
  ) =>
    tmm({
      bag,
      prep: (g) => {
        goTo(g, HALLS);
        place(g, code);
        prep(g);
      },
    });

  it("Athabaskan Exhibit: entering it ends your turn; +2 agility there", () => {
    const r = tmm({
      invs: [R, D],
      prep: (g) => {
        goTo(g, HALLS);
        place(g, "02132");
      },
    });
    const after = toTurn(move(r, "02132"), D);
    const g = gOf(after);
    expect(after.state.pending?.inv).toBe(D);
    expect(inv(g, R).actionsLeft).toBe(0);
    expect(at(after)).toBe("02132");
    expect(skillValue(g, R, "agility")).toBe(4);
  });

  it("Nature Exhibit: entering it discards 2 cards from your hand at random", () => {
    const r = beside("02134");
    const hand = inv(gOf(r), R).hand.length;
    const after = toTurn(move(r, "02134"), R);
    expect(inv(gOf(after), R).hand.length).toBe(hand - 2);
  });

  const failInvestigating = (code: string, prep: (game: GameContext) => void = () => {}) =>
    toTurn(
      pick(
        toTurn(
          mutate(beside(code, ["autoFail"], prep), (g) => placeInvestigator(g, R, loc(g, code)!)),
          R,
        ),
        /^Investigate/,
      ),
      R,
    );

  it("Medusa Exhibit: a failed investigation discards an asset you control", () => {
    let gun = "";
    const after = failInvestigating("02133", (g) => {
      gun = inPlay(g, R, "01006");
    });
    expect(card(gOf(after), gun).zone).not.toBe(ZONE.Play);
  });

  it("Egyptian Exhibit: a failed investigation loses 1 action", () => {
    const after = failInvestigating("02135");
    expect(inv(gOf(after), R).actionsLeft).toBe(1);
  });

  it("Hall of the Dead: a failed investigation deals 1 horror", () => {
    const after = failInvestigating("02136");
    expect(inv(gOf(after), R).horror).toBe(1);
  });

  it("Restricted Hall: not investigated while the Hunting Horror is there", () => {
    const r = mutate(beside(RESTRICTED), (g) => {
      placeInvestigator(g, R, loc(g, RESTRICTED)!);
    });
    expect(options(r).some((o) => o.startsWith("Investigate"))).toBe(true);
    const hunted = mutate(r, (g) => void horrorAt(g, RESTRICTED));
    expect(options(toTurn(hunted, R)).some((o) => o.startsWith("Investigate"))).toBe(false);
  });
});

describe("acts 2 and 3", () => {
  /** act 2 (Night at the Museum, or Breaking and Entering), Roland in the Halls beside the Restricted Hall */
  const act2 = (code = "02123", prep: (game: GameContext) => void = () => {}) =>
    tmm({
      prep: (g) => {
        const act = currentAct(g)!;
        moveCard(g, act, ZONE.Removed);
        const deck = pile(g, "actDeck");
        const night = deck.find((id) => card(g, id).code === "02123")!;
        if (code === "02124") {
          moveCard(g, night, ZONE.Removed);
          moveCard(g, createCard(g, "02124", ZONE.Limbo), ZONE.Act);
        } else moveCard(g, night, ZONE.Act);
        goTo(g, HALLS);
        place(g, RESTRICTED, false);
        prep(g);
      },
    });

  it("Night at the Museum: entering the Restricted Hall advances; the Horror is placed there, ready", () => {
    const r = act2();
    const after = toTurn(move(r, RESTRICTED), R);
    const g = gOf(after);
    expect(codeOf(after, currentAct(g))).toBe("02125");
    const h = findByCode(g, HORROR, [ZONE.Enemy])!;
    expect(codeOf(after, h.location)).toBe(RESTRICTED);
  });

  it("the Horror in play elsewhere is moved, readied", () => {
    const r = act2("02123", (g) => {
      exhaust(g, horrorAt(g, ENTRANCE));
    });
    const after = toTurn(move(r, RESTRICTED), R);
    const h = findByCode(gOf(after), HORROR, [ZONE.Enemy])!;
    expect(codeOf(after, h.location)).toBe(RESTRICTED);
    expect(h.exhausted).toBe(false);
  });

  it("Breaking and Entering: Harold Walsted joins an investigator", () => {
    const after = toTurn(move(act2("02124"), RESTRICTED), R);
    expect(findByCode(gOf(after), "02138", [ZONE.Play])?.controller).toBe(R);
    expect(codeOf(after, currentAct(gOf(after)))).toBe("02125");
  });

  it("Searching for the Tome: the Restricted Hall's last clue advances; the investigators choose R1 or R2", () => {
    const r = act2();
    const in3 = toTurn(move(r, RESTRICTED), R);
    const g = gOf(in3);
    const hall = loc(g, RESTRICTED)!;
    const cleared = inject(in3, (x) => setCounter(x, hall, "clues", 0), {
      t: STEP.CheckObjectives,
    });
    expect(cleared.state.pending?.promptKey).toBe("necronomicon");
    expect(toEnd(pick(cleared, "R2")).state.resolution).toBe("R2");
    expect(toEnd(pick(cleared, "R1")).state.resolution).toBe("R1");
  });
});

describe("agendas and the Hunting Horror", () => {
  const shadow = (r: Result) => findByCode(gOf(r), "02142")!;
  const advanceAgenda = (r: Result) => run(r, { t: STEP.AdvanceAgenda });

  /** the Horror spawned by Slithering Behind You while agenda 1 is in play: Shadow-spawned goes on it */
  const spawned = (opts: Opts = {}) => toTurn(draw(tmm(opts), "02146"), R);

  it("agenda 1's back: the Horror spawns in the Halls; the discard pile shuffled in", () => {
    const r = tmm({
      prep: (g) => {
        const top = pile(g, "encounterDeck").find((id) => card(g, id).code !== HORROR)!;
        moveCard(g, top, ZONE.EncounterDiscard);
      },
    });
    const after = advanceAgenda(r);
    const g = gOf(after);
    const h = findByCode(g, HORROR, [ZONE.Enemy])!;
    expect(codeOf(after, h.location)).toBe(HALLS);
    // it spawns while agenda 1 resolves its back, before agenda 2 is in play: no agenda's forced ability sees it
    expect(shadow(after).zone).toBe(ZONE.SetAside);
    expect(pile(g, "encounterDiscard")).toHaveLength(0);
    expect(codeOf(after, currentAgenda(g))).toBe("02120");
  });

  it("the Horror entering play with an agenda in play: Shadow-spawned attached, then a resource each time", () => {
    const r = spawned();
    const h = findByCode(gOf(r), HORROR, [ZONE.Enemy])!.id;
    expect(shadow(r).attachedTo).toBe(h);
    expect(shadow(r).resources).toBe(0);
  });

  it("agenda 2's back with the Horror in play: 1 doom on it", () => {
    const r = tmm({ prep: (g) => void horrorAt(g, HALLS) });
    const after = advanceAgenda(r);
    expect(findByCode(gOf(after), HORROR, [ZONE.Enemy])!.doom).toBe(1);
  });

  it("defeated, the Horror goes to the void without its tokens, Shadow-spawned still on it; back, Shadow-spawned gains a resource", () => {
    const inPlay1 = spawned({ bag: ["cultist"] });
    const h = findByCode(gOf(inPlay1), HORROR, [ZONE.Enemy])!.id;
    const defeated = run(
      mutate(inPlay1, (g) => addCounter(g, h, "doom", 1)),
      { t: STEP.DefeatEnemy, enemy: h, by: R },
    );
    const g = gOf(defeated);
    expect(card(g, h).zone).toBe(ZONE.Void);
    expect(card(g, h).doom).toBe(0);
    expect(shadow(defeated).attachedTo).toBe(h);
    expect(shadow(defeated).zone).toBe(ZONE.Attached);
    // the cultist's failure brings it back from the void, at Roland's location
    const back = run(defeated, willpowerTest(10));
    const again = findByCode(gOf(back), HORROR, [ZONE.Enemy])!;
    expect(codeOf(back, again.location)).toBe(ENTRANCE);
    expect(shadow(back).attachedTo).toBe(h);
    expect(shadow(back).resources).toBe(1);
  });

  it("Shadow-spawned: +1 fight, health and evade per resource; Massive at 3", () => {
    const r = mutate(spawned(), (g) => setCounter(g, findByCode(g, "02142")!.id, "resources", 3));
    const g = gOf(r);
    const h = findByCode(g, HORROR, [ZONE.Enemy])!.id;
    expect(enemyStat(g, h, "fight")).toBe(5);
    expect(enemyStat(g, h, "health")).toBe(6);
    expect(enemyStat(g, h, "evade")).toBe(5);
    expect(isMassive(g, h)).toBe(true);
  });

  it("at the start of the enemy phase a symbol token readies it; a number leaves it exhausted", () => {
    for (const [token, readies] of [
      ["skull", true],
      ["autoFail", true],
      ["-1", false],
    ] as const) {
      const r = tmm({
        bag: [token],
        prep: (g) => exhaust(g, horrorAt(g, HALLS)),
      });
      const next = toTurn(pick(r, "End turn"), R);
      const log = next.state.log;
      const revealed = log.findIndex((e) => e.type === "token" && e.data?.token === token);
      const upkeep = log.findIndex(
        (e, k) => k > revealed && e.type === "phase" && /upkeep/i.test(e.text),
      );
      expect(revealed).toBeGreaterThan(0);
      const readied = log
        .slice(revealed, upkeep)
        .some((e) => e.type === "ready" && /Hunting Horror readies/.test(e.text));
      expect(readied).toBe(readies);
    }
  });

  it("the final agenda: each investigator still playing is defeated with 1 physical trauma; no resolution", () => {
    const r = tmm({
      invs: [R, D],
      prep: (g) => {
        const agenda = currentAgenda(g)!;
        moveCard(g, agenda, ZONE.Removed);
        const final = pile(g, "agendaDeck").find((id) => card(g, id).code === "02121")!;
        moveCard(g, final, ZONE.Agenda);
      },
    });
    const after = toEnd(advanceAgenda(r));
    expect(after.state.resolution).toBe("none");
    expect(inv(gOf(after), R).physicalTrauma).toBe(1);
    expect(inv(gOf(after), D).physicalTrauma).toBe(1);
  });
});

describe("the encounter cards", () => {
  it("Stalked in the Dark: the Horror readies, engages you and attacks each investigator at your location", () => {
    const r = tmm({ invs: [R, D], prep: (g) => exhaust(g, horrorAt(g, HALLS)) });
    const after = toTurn(draw(r, "02143"), R);
    const g = gOf(after);
    const h = findByCode(g, HORROR, [ZONE.Enemy])!;
    expect(h.engagedWith).toBe(R);
    expect(codeOf(after, h.location)).toBe(ENTRANCE);
    expect(inv(g, R).damage + inv(g, R).horror).toBeGreaterThan(0);
    expect(inv(g, D).damage + inv(g, D).horror).toBeGreaterThan(0);
  });

  it("Stalked in the Dark without the Horror in play gains surge", () => {
    const after = toTurn(draw(tmm(), "02143"), R);
    expect(after.state.log.filter((e) => e.type === "encounter").length).toBeGreaterThanOrEqual(1);
    expect(where(after, "02143")).toBe(ZONE.EncounterDiscard);
  });

  it("Slithering Behind You: the Horror spawns engaged with you; in play, it takes 1 doom", () => {
    const spawned = toTurn(draw(tmm(), "02146"), R);
    const h = findByCode(gOf(spawned), HORROR, [ZONE.Enemy])!;
    expect(h.engagedWith).toBe(R);
    const doom = toTurn(draw(spawned, "02146"), R);
    expect(findByCode(gOf(doom), HORROR, [ZONE.Enemy])!.doom).toBe(1);
  });

  it("Passage into the Veil: +2 difficulty with the Horror here; a failure discards 5 or deals direct damage and damage to Allies", () => {
    const plain = toTurn(draw(tmm(), "02144"), (x) => x.state.pending?.kind === "turn");
    expect(lastTest(plain)?.difficulty).toBe(3);
    const hunted = tmm({ bag: ["autoFail"], prep: (g) => void horrorAt(g, HALLS) });
    const asked = until(
      draw(
        mutate(hunted, (g) => goTo(g, HALLS)),
        "02144",
      ),
      (x) => x.state.pending?.options.some((o) => /direct damage/.test(o.label)) ?? false,
    );
    expect(lastTest(asked)?.difficulty).toBe(5);
    const deck = inv(gOf(asked), R).deck.length;
    expect(inv(gOf(toTurn(pick(asked, /top 5/), R)), R).deck.length).toBe(deck - 5);
    let ally = "";
    const withAlly = until(
      draw(
        tmm({
          bag: ["autoFail"],
          prep: (g) => {
            ally = inPlay(g, R, "01117"); // Lita Chantler: 3 health
          },
        }),
        "02144",
      ),
      (x) => x.state.pending?.options.some((o) => /direct damage/.test(o.label)) ?? false,
    );
    const hurt = toTurn(pick(withAlly, /direct damage/), R);
    expect(inv(gOf(hurt), R).damage).toBe(1);
    expect(card(gOf(hurt), ally).damage).toBe(1);
  });

  it("Ephemeral Exhibits: 1 action lost for each point failed by, on your next turn", () => {
    // intellect 3 − 2 against 3: failed by 2. Drawn on Daisy's turn, Roland's next turn has 1 action
    const r = toTurn(pick(tmm({ invs: [R, D], bag: ["-2"] }), "End turn"), D);
    const after = toTurn(pick(toTurn(draw(r, "02145", R), D), "End turn"), R);
    expect(inv(gOf(after), R).actionsLeft).toBe(1);
    // drawn on his own turn, they go at once
    const now = toTurn(draw(tmm({ bag: ["-2"] }), "02145"), R);
    expect(inv(gOf(now), R).actionsLeft).toBe(1);
  });
});

describe("the story assets", () => {
  it("Harold Walsted: +2 intellect investigating a Miskatonic location; leaving play, removed and a tablet for the campaign", () => {
    let harold = "";
    const r = tmm({
      bag: ["0"],
      prep: (g) => {
        harold = findByCode(g, "02138", [ZONE.SetAside])!.id;
        moveCard(g, harold, ZONE.Play);
        setController(g, harold, R);
      },
    });
    const tested = toTurn(pick(r, /^Investigate/), R);
    expect(lastTest(tested)?.base).toBe(5);
    const gone = run(tested, {
      t: STEP.Eff,
      effect: { op: "placeTokens", on: "self", damage: 1 },
      ctx: { you: R, source: harold },
    });
    expect(card(gOf(gone), harold).zone).toBe(ZONE.Removed);
    expect(gone.state.chaosBag).toEqual(["0", "tablet"]);
    expect(campaignTokens.get(gOf(gone))).toEqual(["tablet"]);
  });

  it("Adam Lynch defeated with his investigator: out of the game, a tablet in the bag and in the campaign's", () => {
    let adam = "";
    const r = tmm({
      prep: (g) => {
        adam = findByCode(g, "02139", [ZONE.SetAside])!.id;
        moveCard(g, adam, ZONE.Play);
        setController(g, adam, R);
      },
    });
    const after = toEnd(inject(r, () => {}, { t: STEP.Defeated, inv: R, by: "effect" }));
    expect(card(gOf(after), adam).zone).toBe(ZONE.Removed);
    expect(after.state.chaosBag).toEqual(["0", "tablet"]);
    expect(campaignTokens.get(gOf(after))).toEqual(["tablet"]);
  });

  it("The Necronomicon: +1 intellect and an action to gain 2 resources", () => {
    const r = tmm({
      prep: (g) => {
        const book = findByCode(g, "02140", [ZONE.SetAside])!.id;
        moveCard(g, book, ZONE.Play);
        setController(g, book, R);
        goTo(g, HALLS);
      },
    });
    expect(skillValue(gOf(r), R, "intellect")).toBe(4);
    const after = toTurn(pick(r, "The Necronomicon: gain 2 resources"), R);
    expect(inv(gOf(after), R).resources).toBe(inv(gOf(r), R).resources + 2);
  });
});

// ---------- 3.6 the campaign ----------
describe("the campaign", () => {
  function walk(c: CampaignState): CampaignState {
    for (let k = 0; k < 50 && c.flow.waiting; k++) {
      const w = c.flow.waiting;
      const st = w.step;
      if (st.kind === "play") break;
      const value =
        st.kind === "chooseOne"
          ? st.choices[0].id
          : st.kind === "investigatorChoice" || st.kind === "investigator"
            ? c.investigators[0].code
            : st.kind === "upgradeDecks" || st.kind === "continue"
              ? "continue"
              : null;
      c = advance(db, c, value);
    }
    return c;
  }
  function finish(c: CampaignState, resolution: string, ...before: Step[]) {
    const r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c, 1))));
    return walk(
      applyScenarioEnd(
        db,
        c,
        inject(r, () => {}, ...before, { t: STEP.Resolution, id: resolution }).state,
      ),
    );
  }
  /** the campaign at The Miskatonic Museum: The House Always Wins, then Extracurricular Activity, both R1 */
  function atMuseum() {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-dunwich-legacy",
        difficulty: "standard",
        seed: 2,
        investigators: [{ code: R, deckId: "roland-starter" }],
      }),
    );
    c = finish(c, "R1");
    c = finish(c, "R1");
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-miskatonic-museum" });
    return c;
  }
  const count = (c: CampaignState, t: ChaosToken) => c.chaosBag.filter((x) => x === t).length;

  it("R2: the Necronomicon earned, an elder thing for the campaign; a tablet an ally left with stays in the bag", () => {
    const c = atMuseum();
    const after = finish(c, "R2", {
      t: STEP.Eff,
      effect: { op: "addChaosTokens", tokens: ["tablet"], forCampaign: true },
      ctx: { you: R, source: null },
    });
    expect(hasEntry(after.log, "tookNecronomicon")).toBe(true);
    expect(after.investigators[0].deck).toContain("02140");
    expect(count(after, "elderThing")).toBe(count(c, "elderThing") + 1);
    expect(count(after, "tablet")).toBe(count(c, "tablet") + 1);
  });

  it("R1 destroys it; no resolution fails to recover it; nothing added to the bag", () => {
    const c = atMuseum();
    const r1 = finish(c, "R1");
    expect(hasEntry(r1.log, "destroyedNecronomicon")).toBe(true);
    expect(count(r1, "elderThing")).toBe(count(c, "elderThing"));
    expect(count(r1, "tablet")).toBe(count(c, "tablet"));
    expect(hasEntry(finish(c, "none").log, "failedToRecoverNecronomicon")).toBe(true);
  });
});

// ---------- random legal play: the engine never throws or dead-locks ----------
describe("random play", () => {
  for (const invs of [[R], [R, D], [R, D, "01003", "01004"]])
    for (const seed of [1, 2, 3])
      it(`${invs.join("+")} seed ${seed}`, () => {
        let r = tmm({
          invs,
          seed,
          bag: ["+1", "0", "-1", "-2", "skull", "cultist", "tablet", "elderThing", "autoFail"],
        });
        const rng = { rng: seed * 7919 };
        for (let k = 0; r.state.pending && k < 3000; k++) {
          const p = r.state.pending;
          const end = p.options.find((o) => o.label === "End turn");
          const o =
            end && next(rng) < 0.3 ? end : p.options[Math.floor(next(rng) * p.options.length)];
          const res = dispatch(db, r.state, { type: "choose", inv: p.inv, option: o.id });
          if (res.error) throw new Error(res.error);
          r = res;
        }
        expect(r.state.phase === "ended" || r.state.pending).toBeTruthy();
      });
});
