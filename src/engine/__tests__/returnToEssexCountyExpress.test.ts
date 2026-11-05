/** Return to The Essex County Express (campaign-return-to-the-dunwich-legacy, group 5): setup card 51025 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { giveCard, gOf, mutate } from "../kits/testkit";
import { game, inject, move, toTurn, until, use } from "../kits/driver";
import { cardsIn, findByCode, locationAt, locations } from "../queries";
import {
  addCounter,
  card,
  currentAct,
  currentAgenda,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setCode,
  setCounter,
  type GameContext,
} from "../context";
import { moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const CONDUCTOR = "51026b";
const ENGINEER = "51031";
const ENGINES = ["02175", "02176", "02177", "51028"];
const CARS = [
  "02167",
  "02168",
  "02169",
  "02170",
  "02171",
  "02172",
  "02173",
  "02174",
  "51029",
  "51030",
];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  prep?: (game: GameContext) => void;
}
const rtece = ({ invs = [R], bag = ["0"], seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "return-to-essex-county-express",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-dunwich-legacy" },
  });

const carAt = (game: GameContext, col: number) => locationAt(game, [col, 0])!;
const line = (r: Result) =>
  [0, 1, 2, 3, 4, 5, 6].map((c) => {
    const id = locationAt(gOf(r), [c, 0]);
    return id ? card(gOf(r), id).code : null;
  });
/** Roland at a car, revealed, its clues gone */
const standAt = (game: GameContext, col: number, who = R) => {
  const id = carAt(game, col);
  reveal(game, id);
  setCounter(game, id, "clues", 0);
  placeInvestigator(game, who, id);
  return id;
};
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const advanceAgenda = (r: Result) => run(r, { t: STEP.AdvanceAgenda });
const conductor = (r: Result) => findByCode(gOf(r), CONDUCTOR)!;
const agendaCode = (r: Result) => card(gOf(r), currentAgenda(gOf(r))!).code;

describe("setup", () => {
  it("agenda 0, then agenda 1 v.II and the base's 2 to 5; the Conductor, the Engineer and Across Space and Time set aside", () => {
    const r = rtece();
    const g = gOf(r);
    expect(agendaCode(r)).toBe("51026");
    expect(pile(g, ZONE.AgendaDeck).map((id) => card(g, id).code)).toEqual([
      "51027",
      "02161",
      "02162",
      "02163",
      "02164",
    ]);
    expect(findByCode(g, "02160")).toBeUndefined();
    expect(findByCode(g, CONDUCTOR)?.zone).toBe(ZONE.SetAside);
    expect(findByCode(g, ENGINEER)?.zone).toBe(ZONE.SetAside);
    expect(cardsIn(g, ZONE.SetAside).filter((c) => c.code === "02178")).toHaveLength(4);
    expect(pile(g, ZONE.EncounterDeck).some((id) => card(g, id).code === CONDUCTOR)).toBe(false);
  });

  it("6 of the 10 Train Cars and 1 of the 4 Engine Cars at random, the rest out of the game", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const r = rtece({ seed });
      const g = gOf(r);
      const codes = line(r);
      expect(ENGINES).toContain(codes[6]);
      expect(codes.slice(0, 6).every((c) => CARS.includes(c!))).toBe(true);
      expect(new Set(codes).size).toBe(7);
      expect(locations(g)).toHaveLength(7);
      for (const code of [...ENGINES, ...CARS].filter((c) => !codes.includes(c)))
        expect(findByCode(g, code)?.zone).toBe(ZONE.Removed);
      for (const c of codes) seen.add(c!);
    }
    for (const c of ["51028", "51029", "51030"]) expect(seen.has(c)).toBe(true);
  });
});

describe("The Conductor", () => {
  it("agenda 0's other side: it spawns at the leftmost car", () => {
    const r = advanceAgenda(rtece({ prep: (g) => void standAt(g, 2) }));
    expect(agendaCode(r)).toBe("51027");
    expect(conductor(r).zone).toBe(ZONE.Enemy);
    expect(conductor(r).location).toBe(carAt(gOf(r), 0));
  });

  it("its car leaves play: it moves one car to the right instead of being discarded", () => {
    const one = advanceAgenda(rtece({ prep: (g) => void standAt(g, 2) }));
    const second = carAt(gOf(one), 1);
    const two = advanceAgenda(one);
    expect(locations(gOf(two))).toHaveLength(6);
    expect(conductor(two).zone).toBe(ZONE.Enemy);
    expect(conductor(two).location).toBe(second);
  });

  it("defeated, it is attached to the current agenda; after that agenda advances it is drawn at the leftmost car", () => {
    const one = advanceAgenda(rtece({ prep: (g) => void standAt(g, 3) }));
    const id = conductor(one).id;
    const gone = run(one, { t: STEP.DefeatEnemy, enemy: id, by: R });
    expect(conductor(gone).zone).toBe(ZONE.Attached);
    expect(conductor(gone).attachedTo).toBe(currentAgenda(gOf(gone)));
    const back = advanceAgenda(gone);
    expect(agendaCode(back)).toBe("02161");
    expect(conductor(back).zone).toBe(ZONE.Enemy);
    expect(conductor(back).location).toBe(carAt(gOf(back), 1));
    expect(conductor(back).damage).toBe(0);
  });
});

describe("the box's cars", () => {
  /** Roland in the first car, the second made this code and unrevealed */
  const nextTo = (code: string, opts: Opts = {}) =>
    rtece({
      ...opts,
      prep: (g) => {
        standAt(g, 0);
        setCode(g, carAt(g, 1), code);
        opts.prep?.(g);
      },
    });

  it("51028 Engine Car: revealed, the Engineer is put into play there; it can't be investigated", () => {
    const r = toTurn(move(nextTo("51028"), "51028"), R);
    const g = gOf(r);
    const eng = findByCode(g, ENGINEER)!;
    expect(eng.zone).toBe(ZONE.Attached);
    expect(eng.location).toBe(carAt(g, 1));
    expect(eng.controller).toBeNull();
    expect(r.state.pending?.options.some((o) => o.label.startsWith("Investigate"))).toBe(false);
  });

  it("51031 Engineer: parley takes control, then discovers a clue at your location; defeated, he stays uncontrolled", () => {
    const r = toTurn(move(nextTo("51028", { bag: ["+1"] }), "51028"), R);
    const mine = toTurn(use(r, ENGINEER), R);
    expect(findByCode(gOf(mine), ENGINEER)!.controller).toBe(R);
    const engine = carAt(gOf(mine), 1);
    const clues = card(gOf(mine), engine).clues;
    const clue = toTurn(use(mine, ENGINEER), R);
    expect(card(gOf(clue), engine).clues).toBe(clues - 1);
    expect(inv(gOf(clue), R).clues).toBe(1);
    const hurt = inject(clue, (g) => addCounter(g, findByCode(g, ENGINEER)!.id, "damage", 2), {
      t: STEP.AssetDefeatCheck,
      inv: R,
    });
    const eng = findByCode(gOf(toTurn(hurt, R)), ENGINEER)!;
    expect(eng.zone).toBe(ZONE.Attached);
    expect(eng.controller).toBeNull();
    expect(eng.damage).toBe(0);
    expect(eng.exhausted).toBe(true);
    expect(eng.location).toBe(engine);
  });

  it("51029 Freight Car: at the end of the round, failing agility (1) twice defeats the investigator", () => {
    const failing = nextTo("51029", { bag: ["-4"] });
    const r = mutate(failing, (g) => {
      const car = carAt(g, 1);
      reveal(g, car);
      placeInvestigator(g, R, car);
    });
    const end = until(
      inject(r, () => {}, { t: STEP.EndRound }),
      () => false,
      60,
    );
    expect(inv(gOf(end), R).status).toBe("defeated");
  });

  it("51029 Freight Car: passing the first test is the end of it", () => {
    const r = mutate(nextTo("51029"), (g) => {
      const car = carAt(g, 1);
      reveal(g, car);
      placeInvestigator(g, R, car);
    });
    const next = toTurn(
      inject(r, () => {}, { t: STEP.EndRound }),
      R,
    );
    expect(inv(gOf(next), R).status).toBe("playing");
  });

  it("51030 Baggage Car: not investigated; discarding a card discovers a clue", () => {
    const r = mutate(nextTo("51030"), (g) => {
      const car = carAt(g, 1);
      reveal(g, car);
      setCounter(g, car, "clues", 3);
      placeInvestigator(g, R, car);
      giveCard(g, R, "01025");
    });
    expect(r.state.pending?.options.some((o) => o.label.startsWith("Investigate"))).toBe(false);
    const hand = inv(gOf(r), R).hand.length;
    const done = toTurn(use(r, "51030", 1), R);
    expect(inv(gOf(done), R).clues).toBe(1);
    expect(inv(gOf(done), R).hand).toHaveLength(hand - 1);
  });
});

describe("the resolutions, played", () => {
  it("R1: act 2 with no clues in the Engine Car", () => {
    const r = rtece({
      prep: (g) => {
        moveCard(g, currentAct(g)!, ZONE.Removed);
        const act2 = pile(g, "actDeck").find((id) => card(g, id).code === "02166")!;
        moveCard(g, act2, ZONE.Act);
        standAt(g, 5);
      },
    });
    const end = inject(
      r,
      (g) => {
        reveal(g, carAt(g, 6));
        setCounter(g, carAt(g, 6), "clues", 0);
      },
      { t: STEP.CheckObjectives },
    );
    expect(end.state.resolution).toBe("R1");
  });

  it("R2: agenda 5's back defeats everyone", () => {
    let r = rtece({ prep: (g) => void standAt(g, 6) });
    for (let k = 0; k < 5; k++) r = advanceAgenda(r);
    expect(agendaCode(r)).toBe("02164");
    const end = until(advanceAgenda(r), () => false, 50);
    expect(end.state.resolution).toBe("R2");
  });
});
