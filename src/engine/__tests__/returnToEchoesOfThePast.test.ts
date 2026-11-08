/** Return to Echoes of the Past (campaign-return-to-the-path-to-carcosa, group 4): setup card 52028 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import { game, inject, lastTest, toTurn, until } from "../kits/driver";
import { cellOf, connections, enemies, findByCode, gainsKeyword } from "../queries";
import {
  allCards,
  card,
  currentAct,
  currentAgenda,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { hideInHand } from "../rules/scenario";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const R = "01001"; // Roland: intellect 3
const D = "01002";
const ENTRY_HALL = "03127";
const QUIET_B = "52029";
const GROUND = ["03128", "03129", "03130"];
const SECOND = ["03132", "03133", "03134"];
const THIRD = ["03136", "03137", "03138"];
const BASEMENT = ["52030", "52031", "52032"];
const KEEPER = "52033";
const ACOLYTE = "01169"; // a Cultist

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  prep?: (game: GameContext) => void;
}
const rteotp = ({ invs = [R], bag = ["0"], seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "return-to-echoes-of-the-past",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-path-to-carcosa", campaignLog: {} },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const inGame = (game: GameContext, codes: string[]) => codes.filter((c) => loc(game, c));
const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** a Basement Society in play, revealed, with Roland there */
const visit = (game: GameContext, code: string, who = R) => {
  let at = loc(game, code);
  if (!at) {
    at = findByCode(game, code)!.id;
    moveCard(game, at, ZONE.Location);
  }
  reveal(game, at);
  placeInvestigator(game, who, at);
  return at;
};
function toAct(game: GameContext, code: string) {
  moveCard(game, currentAct(game)!, ZONE.Removed);
  moveCard(game, findByCode(game, code, [ZONE.ActDeck])!.id, ZONE.Act, { deck: "a" });
}
const keepers = (r: Result) => enemies(gOf(r)).filter((e) => e.code === KEEPER);
const toEnd = (r: Result) => until(r, () => false, 300);

describe("setup", () => {
  it("Entry Hall, three Quiet Halls, two Historical Societies on each of four floors; a Basement one removed", () => {
    for (const seed of [1, 2, 3, 4]) {
      const g = gOf(rteotp({ seed, invs: [R, D] }));
      for (const c of [ENTRY_HALL, "03131", "03135", QUIET_B]) expect(loc(g, c)).toBeDefined();
      for (const floor of [GROUND, SECOND, THIRD, BASEMENT])
        expect(inGame(g, floor)).toHaveLength(2);
      const out = BASEMENT.filter((c) => !loc(g, c));
      expect(findByCode(g, out[0])?.zone).toBe(ZONE.Removed);
      expect(codeOf(g, inv(g, R).location)).toBe(ENTRY_HALL);
    }
  });

  it("both Keepers of the Oath set aside; Hidden Library, Oathspeaker, Peabody, Cloak and Clasp too", () => {
    const g = gOf(rteotp());
    expect(
      allCards(g)
        .filter((c) => c.code === KEEPER)
        .map((c) => c.zone),
    ).toEqual([ZONE.SetAside, ZONE.SetAside]);
    for (const c of ["03139", "03140", "03141", "03142", "03143"])
      expect(findByCode(g, c)?.zone).toBe(ZONE.SetAside);
  });

  it("the Basement is a row below the Ground Floor; its Quiet Halls joins the Entry Hall and its Societies", () => {
    const g = gOf(rteotp());
    expect(cellOf(g, loc(g, QUIET_B)!)?.[1]).toBe(3);
    for (const c of inGame(g, BASEMENT)) expect(cellOf(g, loc(g, c)!)?.[1]).toBe(3);
    const links = connections(g, loc(g, QUIET_B)!).map((id) => codeOf(g, id));
    expect(links.sort()).toEqual([ENTRY_HALL, ...inGame(g, BASEMENT)].sort());
  });
});

describe("52028: a Keeper of the Oath as act 2 and act 3 begin", () => {
  it("act 2: a Keeper spawns at an empty Historical Society the lead chooses; act 3: the other", () => {
    let r = run(rteotp(), { t: STEP.AdvanceAct });
    let g = gOf(r);
    expect(codeOf(g, currentAct(g))).toBe("03125");
    expect(keepers(r)).toHaveLength(1);
    const at = keepers(r)[0].location!;
    expect(card(g, at).revealed).toBe(true); // spawning there revealed it
    expect(g.db.cards[codeOf(g, at)!].name).toBe("Historical Society");
    r = run(r, { t: STEP.AdvanceAct });
    g = gOf(r);
    expect(codeOf(g, currentAct(g))).toBe("03126");
    expect(keepers(r)).toHaveLength(2);
    expect(new Set(keepers(r).map((k) => k.location)).size).toBe(2);
  });

  it("the base scenario spawns none", () => {
    const r = toTurn(
      inject(
        game({
          scenario: "echoes-of-the-past",
          investigators: [R],
          bag: ["0"],
          extra: { campaignId: "the-path-to-carcosa", campaignLog: {} },
        }),
        () => {},
        { t: STEP.AdvanceAct },
      ),
      R,
    );
    expect(keepers(r)).toHaveLength(0);
  });
});

describe("the box's cards", () => {
  it("52033 Keeper: hunter while the act is ahead of the agenda; at the end of the enemy phase it takes a clue from each investigator on a location sharing a Trait", () => {
    let k = "";
    let r = rteotp({
      invs: [R, D],
      prep: (g) => {
        k = putEnemy(g, KEEPER, loc(g, ENTRY_HALL)!);
        setCounter(g, R, "clues", 2);
        setCounter(g, D, "clues", 2);
        placeInvestigator(g, D, loc(g, "03135")!); // Third Floor: no shared Trait with the Entry Hall
      },
    });
    expect(gainsKeyword(gOf(r), k, "hunter")).toBe(false);
    r = mutate(r, (g) => toAct(g, "03125"));
    expect(gainsKeyword(gOf(r), k, "hunter")).toBe(true);
    r = run(r, { t: STEP.Window, trigger: "enemyPhaseEnds", data: {} });
    const g = gOf(r);
    expect(inv(g, R).clues).toBe(1);
    expect(inv(g, D).clues).toBe(2);
    // the Echoes agenda turns the clue on an enemy into doom
    expect(card(g, k)).toMatchObject({ clues: 0, doom: 1 });
    expect(codeOf(g, currentAgenda(g))).toBe("03121");
  });

  it("52029 Quiet Halls: with every location revealed and no clues, place 1 clue per investigator on it", () => {
    const r = rteotp({
      prep: (g) => {
        for (const l of allCards(g).filter((c) => c.zone === ZONE.Location)) {
          reveal(g, l.id);
          setCounter(g, l.id, "clues", 0);
        }
        visit(g, QUIET_B);
      },
    });
    const after = toTurn(pick(r, /Quiet Halls: place 1 clue/), R);
    expect(card(gOf(after), loc(gOf(after), QUIET_B)!).clues).toBe(1);
  });

  it("52030 Dusty Archives: with a hidden card in your hand you cannot investigate it", () => {
    const can = (hidden: boolean) =>
      options(
        rteotp({
          prep: (g) => {
            visit(g, "52030");
            if (hidden) hideInHand(g, createCard(g, "52071", ZONE.Limbo), R);
          },
        }),
      ).some((o) => o.startsWith("Investigate"));
    expect(can(false)).toBe(true);
    expect(can(true)).toBe(false);
  });

  it("52031 Museum Storage: -3 shroud with a Cultist in play; a symbol moves 1 clue to the farthest Cultist", () => {
    let acolyte = "";
    let at = "";
    let r = rteotp({
      bag: ["skull"],
      prep: (g) => {
        at = visit(g, "52031");
        setCounter(g, at, "clues", 2);
        acolyte = putEnemy(g, ACOLYTE, loc(g, "03135")!);
        setCounter(g, acolyte, "doom", 0);
      },
    });
    r = toTurn(pick(r, /^Investigate/), R);
    const g = gOf(r);
    expect(lastTest(r)?.difficulty).toBe(5 - 3);
    expect(card(g, at).clues).toBeLessThanOrEqual(1);
    expect(card(g, acolyte).doom).toBe(1); // its clue became doom
  });

  it("52032 Boiler Room: discovering clues there draws as many encounter cards", () => {
    let r = rteotp({
      bag: ["+1"],
      prep: (g) => {
        const at = visit(g, "52032");
        setCounter(g, at, "clues", 2);
      },
    });
    const deck = pile(gOf(r), "encounterDeck").length;
    r = until(pick(r, /^Investigate/), (x) => pile(gOf(x), "encounterDeck").length < deck, 60);
    expect(pile(gOf(r), "encounterDeck").length).toBe(deck - 1);
  });
});

describe("the resolutions, played", () => {
  it("3b: the investigators decide: take the clasp (→R1) or leave it (→R2)", () => {
    const end = (choice: RegExp) => {
      const r = inject(rteotp({ prep: (g) => toAct(g, "03126") }), () => {}, {
        t: STEP.AdvanceAct,
      });
      return until(pick(r, choice), () => false).state.resolution;
    };
    expect(end(/take it with us/)).toBe("R1");
    expect(end(/Leave it behind/)).toBe("R2");
  });

  it("the Oathspeaker defeated: (→R3)", () => {
    let him = "";
    const r = rteotp({
      prep: (g) => {
        toAct(g, "03126");
        him = putEnemy(g, "03140", inv(g, R).location!, R);
      },
    });
    expect(
      until(
        inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: him, by: R }),
        () => false,
      ).state.resolution,
    ).toBe("R3");
  });

  it("agenda 3b: (→R4); everyone defeated: no resolution", () => {
    const r = rteotp({
      prep: (g) => {
        moveCard(g, currentAgenda(g)!, ZONE.Removed);
        moveCard(g, findByCode(g, "03123", [ZONE.AgendaDeck])!.id, ZONE.Agenda, { deck: "a" });
      },
    });
    expect(toEnd(inject(r, () => {}, { t: STEP.AdvanceAgenda })).state.resolution).toBe("R4");
    expect(
      toEnd(inject(rteotp(), () => {}, { t: STEP.Defeated, inv: R, by: "effect" })).state
        .resolution,
    ).toBe("none");
  });
});
