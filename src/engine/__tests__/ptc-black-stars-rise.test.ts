/** Black Stars Rise (campaign-the-path-to-carcosa, group 8): setup, tokens, the two agenda decks, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, type Result } from "../index";
import { db, giveCard, gOf, options, pick, skipMulligans } from "../kits/testkit";
import { game, inject, lastTest, move as moveTo, toTurn, until } from "../kits/driver";
import {
  connections,
  enemies,
  enemyStat,
  findByCode,
  gainsKeyword,
  locations,
  shroud,
} from "../queries";
import { canMoveTo } from "../rules/investigators";
import {
  allCards,
  card,
  currentAct,
  currentAgenda,
  deckCards,
  inv,
  placeInvestigator,
  reveal,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import * as flags from "../world/flags";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry } from "../campaign/log";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; sanity 7
const D = "01002"; // Daisy: sanity 9
const PORTE = "03283";
const GRAND_RUE = "03284";
const OUTER_WALL = ["03285", "03286"];
const NORTH_TOWER = ["03287", "03288"];
const BROKEN_STEPS = ["03289", "03290"];
const ABBEY = "03291";
const CHOEUR = ["03292", "03293"];
const CLOISTER = "03294";
const KNIGHTS = "03295";
const CHAPEL = ["03296", "03297"];
const TOWER = ["03298", "03299"];
const ACT_BELOW = "03281";
const ACT_ABOVE = "03282";
const ASHLEIGH = "03069b";
const BEAST = "03088";
const TIDAL = "03300";
const RIFT = "03301";
const BYAKHEE = "03086";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const bsr = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
  prep,
}: Opts = {}) =>
  game({
    scenario: "black-stars-rise",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-path-to-carcosa", campaignLog: log, difficulty },
  });

const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const agendaA = (game: GameContext) => currentAgenda(game, "a")!;
const agendaC = (game: GameContext) => currentAgenda(game, "c")!;
const loc = (game: GameContext, codes: string | string[]) =>
  locations(game).find((l) => [codes].flat().includes(l.code))!.id;
const aside = (game: GameContext, code: string) =>
  allCards(game).filter((c) => c.code === code && c.zone === ZONE.SetAside);
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const testOf = (skill: "willpower" | "agility", difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill, difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
/** the set-aside locations the Abbey Church puts into play, in play (unrevealed) */
function abbeyOpen(game: GameContext) {
  for (const c of allCards(game).filter(
    (x) =>
      x.zone === ZONE.SetAside &&
      [...CHOEUR, CLOISTER, KNIGHTS, ...CHAPEL, ...TOWER].includes(x.code),
  ))
    moveCard(game, c.id, ZONE.Location);
}
const toEnd = (r: Result) => until(r, () => false, 400);

// ---------- 8.1 setup ----------
describe("setup", () => {
  it("two agenda decks, 2a and 2c from one pile; the other pile's Chapel and Tower leave the game", () => {
    const piles = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const g = gOf(bsr({ seed }));
      expect(codeOf(g, agendaA(g))).toBe("03275");
      expect(codeOf(g, agendaC(g))).toBe("03278");
      const a = deckCards(g, "agenda", "a").map((id) => codeOf(g, id));
      const c = deckCards(g, "agenda", "c").map((id) => codeOf(g, id));
      const flood = a[0] === "03276b";
      piles.add(flood ? "flood" : "vortex");
      expect(a).toEqual([flood ? "03276b" : "03276a", "03277"]);
      expect(c).toEqual([flood ? "03279a" : "03279b", "03280"]);
      // The Flood Below: the Chapel's path is open (03296) and the Tower forbidden (03299); The Vortex Above the reverse
      expect(aside(g, flood ? "03296" : "03297")).toHaveLength(1);
      expect(aside(g, flood ? "03299" : "03298")).toHaveLength(1);
      expect(findByCode(g, flood ? "03297" : "03296")?.zone ?? "removed").toBe(ZONE.Removed);
      expect(findByCode(g, flood ? "03298" : "03299")?.zone ?? "removed").toBe(ZONE.Removed);
      expect(currentAct(g)).toBeNull();
    }
    expect(piles).toEqual(new Set(["flood", "vortex"]));
  });

  it("one North Tower, Outer Wall and Broken Steps with Porte de l'Avancée, Grand Rue and the Abbey Church; everyone at Porte", () => {
    const g = gOf(bsr({ invs: [R, D] }));
    const inPlay = locations(g).map((l) => l.code);
    expect(inPlay).toHaveLength(6);
    for (const pair of [OUTER_WALL, NORTH_TOWER, BROKEN_STEPS])
      expect(inPlay.filter((c) => pair.includes(c))).toHaveLength(1);
    expect(inPlay).toEqual(expect.arrayContaining([PORTE, GRAND_RUE, ABBEY]));
    expect(codeOf(g, inv(g, R).location)).toBe(PORTE);
    expect(codeOf(g, inv(g, D).location)).toBe(PORTE);
    for (const code of [ACT_BELOW, ACT_ABOVE, BEAST, CLOISTER, KNIGHTS, ASHLEIGH])
      expect(aside(g, code)).toHaveLength(1);
    expect(aside(g, TIDAL)).toHaveLength(2);
    expect(aside(g, RIFT)).toHaveLength(2);
    expect(CHOEUR.flatMap((c) => aside(g, c))).toHaveLength(1);
    // Ashleigh is set aside only if she wasn't slain
    expect(aside(gOf(bsr({ log: { [ASHLEIGH]: true } })), ASHLEIGH)).toHaveLength(0);
  });

  it("Ashleigh's Information: once per game, an investigator may remove 1 doom from an agenda", () => {
    const withDoom = (game: GameContext) => setCounter(game, agendaC(game), "doom", 2);
    expect(options(bsr({ prep: withDoom })).some((o) => /Ashleigh's Information/.test(o))).toBe(
      false,
    );
    let r = bsr({ log: { "03080": true }, prep: withDoom });
    const offered = options(r).filter((o) => /Ashleigh's Information/.test(o));
    expect(offered).toHaveLength(1);
    r = toTurn(pick(r, offered[0]), R);
    expect(card(gOf(r), agendaC(gOf(r))).doom).toBe(1);
    expect(options(r).some((o) => /Ashleigh's Information/.test(o))).toBe(false);
  });
});

// ---------- 8.2 tokens ----------
/** the first revealed token of the last test */
const firstToken = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokens: ChaosToken[] })
    .tokens[0];
/** a seed whose test reveals `token` first (the bag holds others for "reveal another token") */
function firstReveal(token: ChaosToken, play: (seed: number) => Result): Result {
  for (let seed = 1; seed < 40; seed++) {
    const r = play(seed);
    if (firstToken(r) === token) return r;
  }
  throw new Error(`no seed reveals ${token} first`);
}

describe("chaos tokens", () => {
  const draw = (bag: ChaosToken[], difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    firstReveal(bag[0], (seed) =>
      run(bsr({ bag, difficulty, prep, seed: seed + 8 }), testOf("willpower", against)),
    );
  const doom = (a: number, c: number) => (game: GameContext) => {
    setCounter(game, agendaA(game), "doom", a);
    setCounter(game, agendaC(game), "doom", c);
  };

  it("skull −X: the most doom on one agenda (Easy/Standard), the doom on both (Hard/Expert)", () => {
    expect(mods(draw(["skull"], "standard", 0, doom(1, 3)))).toEqual([-3]);
    expect(mods(draw(["skull"], "hard", 0, doom(1, 3)))).toEqual([-4]);
  });

  it("tablet: reveal another; if you fail, 1 doom on each agenda (Hard: unless you succeed by at least 1)", () => {
    const after = (r: Result) => [
      card(gOf(r), agendaA(gOf(r))).doom,
      card(gOf(r), agendaC(gOf(r))).doom,
    ];
    expect(after(draw(["tablet", "0"], "standard", 9))).toEqual([1, 1]);
    expect(after(draw(["tablet", "0"], "standard", 3))).toEqual([0, 0]);
    // Roland's willpower 3 against 3: a success by 0
    expect(after(draw(["tablet", "0"], "hard", 3))).toEqual([1, 1]);
    expect(after(draw(["tablet", "0"], "hard", 2))).toEqual([0, 0]);
  });

  it("cultist: an attack against an enemy with doom automatically fails", () => {
    const fightIt = (doomOn: number) =>
      lastTest(firstReveal("cultist", (seed) => fightRats(doomOn, seed)))!;
    const fightRats = (doomOn: number, seed: number) => {
      let r = bsr({
        seed,
        bag: ["cultist", "0"],
        prep: (g) => {
          const e = createCard(g, "01159", ZONE.Limbo); // Swarm of Rats, fight 1
          moveCard(g, e, ZONE.Enemy, { location: inv(g, R).location });
          setCounter(g, e, "doom", doomOn);
        },
      });
      r = until(r, (x) => x.state.pending?.kind === "turn");
      const o = r.state.pending!.options.find((x) => /Fight/.test(x.label))!;
      r = until(
        pick(r, o.id),
        (x) => x.state.pending?.kind === "turn" || /Done/.test(options(x)[0] ?? ""),
      );
      if (/Done/.test(options(r)[0] ?? "")) r = pick(r, /^Done/);
      return toTurn(r, R);
    };
    expect(fightIt(0).success).toBe(true);
    expect(fightIt(1).success).toBe(false);
  });

  it("elder thing −2: a failure draws a Byakhee from the encounter deck or discard pile", () => {
    const r = draw(["elderThing"], "standard", 5);
    expect(mods(r)).toEqual([-2]);
    expect(enemies(gOf(r)).some((e) => db.cards[e.code].traits.includes("Byakhee"))).toBe(true);
    expect(mods(draw(["elderThing"], "expert", 5))).toEqual([-3]);
  });
});

// ---------- 8.3 the agendas ----------
describe("the agendas", () => {
  it("the doom on the current agenda: the lead chooses which deck takes it", () => {
    const r = inject(bsr(), () => {}, { t: STEP.PlaceDoom, card: "agenda", n: 1 });
    expect(r.state.pending?.promptKey).toBe("doomOnWhichAgenda");
    expect(options(r)).toHaveLength(2);
  });

  it("1a's group ability: 1 clue per investigator, 1 doom on it, each investigator gains 2 resources (once per round)", () => {
    let r = bsr({ invs: [R, D], prep: (g) => setCounter(g, R, "clues", 2) });
    const ability = options(r).find((o) => /gains 2 resources/.test(o))!;
    r = toTurn(pick(r, ability), R);
    const g = gOf(r);
    expect(card(g, agendaA(g)).doom).toBe(1);
    expect(inv(g, R).clues).toBe(0);
    expect(inv(g, R).resources).toBe(7);
    expect(inv(g, D).resources).toBe(7);
    expect(options(mutateClues(r)).some((o) => /gains 2 resources/.test(o))).toBe(false);
  });
  const mutateClues = (r: Result) => inject(r, (g) => setCounter(g, R, "clues", 4));

  it("the group ability's doom can advance its agenda at once", () => {
    let r = bsr({
      prep: (g) => {
        setCounter(g, R, "clues", 1);
        setCounter(g, agendaA(g), "doom", 4);
      },
    });
    r = toTurn(
      pick(
        r,
        options(r).find((o) => /gains 2 resources/.test(o))!,
      ),
      R,
    );
    expect(["03276a", "03276b"]).toContain(codeOf(gOf(r), agendaA(gOf(r))));
  });

  const advanceDeck = (r: Result, deck: "a" | "c") =>
    run(r, deck === "a" ? { t: STEP.AdvanceAgenda } : { t: STEP.AdvanceAgenda, deck });

  it("1a's back: the Tidal Terrors shuffled in; with 1c at 2 doom one Conviction, at 3 one Doubt", () => {
    const mark = (doomOnC: number) => {
      const r = advanceDeck(bsr({ prep: (g) => setCounter(g, agendaC(g), "doom", doomOnC) }), "a");
      const g = gOf(r);
      expect(aside(g, TIDAL)).toHaveLength(0);
      expect(card(g, agendaC(g)).doom).toBe(doomOnC);
      return [
        flags.countEntry.get(g, ["conviction", "conviction"]),
        flags.countEntry.get(g, ["doubt", "doubt"]),
      ];
    };
    expect(mark(2)).toEqual([1, undefined]);
    expect(mark(3)).toEqual([undefined, 1]);
  });

  it("1c's back: the Rift Seekers shuffled in; Conviction or Doubt by 1a's doom", () => {
    const r = advanceDeck(bsr({ prep: (g) => setCounter(g, agendaA(g), "doom", 4) }), "c");
    expect(aside(gOf(r), RIFT)).toHaveLength(0);
    expect(flags.countEntry.get(gOf(r), ["doubt", "doubt"])).toBe(1);
  });

  /** a seed whose pile is The Flood Below (true) or The Vortex Above */
  const seedFor = (flood: boolean) =>
    [1, 2, 3, 4, 5, 6, 7, 8].find(
      (seed) =>
        (codeOf(gOf(bsr({ seed })), deckCards(gOf(bsr({ seed })), "agenda", "a")[0]) ===
          "03276b") ===
        flood,
    )!;

  it("The Flood Below's 2a back: act 3a replaces the deck; each investigator at the Chapel with no clues there: R1", () => {
    let r = bsr({ seed: seedFor(true) });
    r = advanceDeck(advanceDeck(r, "a"), "a");
    let g = gOf(r);
    expect(codeOf(g, currentAct(g))).toBe(ACT_BELOW);
    expect(currentAgenda(g, "a")).toBeNull();
    expect(deckCards(g, "agenda", "a")).toHaveLength(0);
    expect(codeOf(g, agendaC(g))).toBe("03278");
    r = toEnd(
      inject(
        r,
        (game) => {
          abbeyOpen(game);
          const chapel = loc(game, CHAPEL);
          reveal(game, chapel);
          setCounter(game, chapel, "clues", 0);
          placeInvestigator(game, R, chapel);
        },
        { t: STEP.CheckObjectives },
      ),
    );
    g = gOf(r);
    expect(r.state.resolution).toBe("R1");
  });

  it("The Flood Below's 2c back: Beast of Aldebaran at the Chapel, Ashleigh at Porte, act 3c removed, agenda 3c", () => {
    let r = bsr({ seed: seedFor(true), prep: abbeyOpen });
    r = advanceDeck(advanceDeck(r, "c"), "c");
    const g = gOf(r);
    expect(codeOf(g, agendaC(g))).toBe("03280");
    expect(codeOf(g, findByCode(g, BEAST, [ZONE.Enemy])!.location)).toBe("03296");
    expect(codeOf(g, findByCode(g, ASHLEIGH, [ZONE.Enemy])!.location)).toBe(PORTE);
    expect(findByCode(g, ACT_ABOVE)!.zone).toBe(ZONE.Removed);
    expect(aside(g, ACT_BELOW)).toHaveLength(1);
  });

  it("The Vortex Above's 2c back: act 3c at the Abbey Tower, R2; its 2a back puts the Beast in the Tower", () => {
    let r = bsr({ seed: seedFor(false), prep: abbeyOpen });
    r = advanceDeck(advanceDeck(r, "a"), "a");
    expect(codeOf(gOf(r), findByCode(gOf(r), BEAST, [ZONE.Enemy])!.location)).toBe("03298");
    r = advanceDeck(advanceDeck(r, "c"), "c");
    const g = gOf(r);
    expect(codeOf(g, currentAct(g))).toBe(ACT_ABOVE);
    r = toEnd(
      inject(
        r,
        (game) => {
          const tower = loc(game, TOWER);
          reveal(game, tower);
          setCounter(game, tower, "clues", 0);
          placeInvestigator(game, R, tower);
        },
        { t: STEP.CheckObjectives },
      ),
    );
    expect(r.state.resolution).toBe("R2");
  });

  it("agenda 3a's back: R3", () => {
    let r = bsr({ seed: seedFor(false), prep: abbeyOpen });
    for (let k = 0; k < 3; k++) r = advanceDeck(r, "a");
    expect(toEnd(r).state.resolution).toBe("R3");
  });

  it("both thresholds met: the lead chooses which agenda advances first, then the other is checked", () => {
    let r = inject(
      bsr(),
      (g) => {
        setCounter(g, agendaA(g), "doom", 5);
        setCounter(g, agendaC(g), "doom", 5);
      },
      { t: STEP.CheckDoom },
    );
    expect(r.state.pending?.promptKey).toBe("advanceWhichAgenda");
    r = toTurn(pick(r, "The Ritual Begins"), R);
    const g = gOf(r);
    // the other agenda keeps its doom and, still at its threshold, advances too
    expect(codeOf(g, agendaA(g))).not.toBe("03275");
    expect(codeOf(g, agendaC(g))).not.toBe("03278");
  });
});

// ---------- 8.3 / 8.5 the abbey ----------
describe("the abbey", () => {
  it("connections from the map: the diamond fully linked, Broken Steps to the Abbey Church", () => {
    const g = gOf(bsr());
    const ids = (codes: string[]) => codes.map((c) => loc(g, [c])).sort();
    const of = (codes: string[]) => locations(g).find((l) => codes.includes(l.code))!.id;
    const wall = of(OUTER_WALL);
    const north = of(NORTH_TOWER);
    const steps = of(BROKEN_STEPS);
    expect(connections(g, loc(g, PORTE))).toEqual([loc(g, GRAND_RUE)]);
    expect(connections(g, loc(g, GRAND_RUE)).sort()).toEqual(
      [loc(g, PORTE), wall, north, steps].sort(),
    );
    expect(connections(g, wall).sort()).toEqual([loc(g, GRAND_RUE), north, steps].sort());
    expect(connections(g, steps).sort()).toEqual(
      [loc(g, GRAND_RUE), wall, north, loc(g, ABBEY)].sort(),
    );
    expect(ids([ABBEY])).toHaveLength(1);
  });

  it("entering the unrevealed Abbey Church costs 3 clues per investigator, spent by those at Broken Steps", () => {
    const at = (rClues: number, dClues: number, dThere: boolean) =>
      gOf(
        bsr({
          invs: [R, D],
          prep: (g) => {
            const steps = locations(g).find((l) => BROKEN_STEPS.includes(l.code))!.id;
            placeInvestigator(g, R, steps);
            if (dThere) placeInvestigator(g, D, steps);
            setCounter(g, R, "clues", rClues);
            setCounter(g, D, "clues", dClues);
          },
        }),
      );
    const can = (game: GameContext) => canMoveTo(game, R, loc(game, ABBEY));
    expect(can(at(6, 0, false))).toBe(true);
    expect(can(at(3, 3, false))).toBe(false);
    expect(can(at(3, 3, true))).toBe(true);
  });

  it("revealing the Abbey Church puts the set-aside locations into play, linked by their icons", () => {
    const r = run(bsr(), { t: STEP.RevealLocation, location: loc(gOf(bsr()), ABBEY) });
    const g = gOf(r);
    const abbey = loc(g, ABBEY);
    const codes = locations(g).map((l) => l.code);
    expect(codes).toEqual(expect.arrayContaining([CLOISTER, KNIGHTS]));
    expect(codes.filter((c) => CHOEUR.includes(c))).toHaveLength(1);
    expect(codes.filter((c) => CHAPEL.includes(c))).toHaveLength(1);
    expect(codes.filter((c) => TOWER.includes(c))).toHaveLength(1);
    expect(connections(g, abbey)).toHaveLength(5);
    expect(connections(g, loc(g, TOWER))).toEqual([loc(g, CHOEUR)]);
    expect(connections(g, loc(g, CLOISTER)).sort()).toEqual([abbey, loc(g, KNIGHTS)].sort());
    expect(connections(g, loc(g, CHAPEL))).toEqual([abbey]);
  });

  it("+2 shroud while the two agendas have different numbers", () => {
    let r = run(bsr(), { t: STEP.RevealLocation, location: loc(gOf(bsr()), ABBEY) });
    const base = shroud(gOf(r), loc(gOf(r), ABBEY));
    r = run(r, { t: STEP.AdvanceAgenda });
    expect(shroud(gOf(r), loc(gOf(r), ABBEY))).toBe(base + 2);
  });

  it("the Chapel can't be entered until the Cloister's parley finds a guide; the Tower until Knight's Hall's key", () => {
    let r = bsr({
      prep: (g) => {
        abbeyOpen(g);
        reveal(g, loc(g, ABBEY));
        placeInvestigator(g, R, loc(g, ABBEY));
      },
    });
    let g = gOf(r);
    expect(canMoveTo(g, R, loc(g, CHAPEL))).toBe(false);
    r = inject(r, (game) => {
      const cl = loc(game, CLOISTER);
      reveal(game, cl);
      setCounter(game, cl, "clues", 0);
      placeInvestigator(game, R, cl);
    });
    r = toTurn(pick(r, /Cloister: parley/), R); // Roland's willpower 3 with a 0 against 3
    g = gOf(r);
    expect(flags.rememberedFact.get(g, "foundAGuide")).toBe(true);
    expect(
      canMoveTo(g, R, loc(g, CHAPEL)) || connections(g, loc(g, ABBEY)).includes(loc(g, CHAPEL)),
    ).toBe(true);
    r = inject(r, (game) => placeInvestigator(game, R, loc(game, ABBEY)));
    expect(canMoveTo(gOf(r), R, loc(gOf(r), CHAPEL))).toBe(true);
    expect(canMoveTo(gOf(r), R, loc(gOf(r), CHOEUR))).toBe(true);
    r = inject(r, (game) => {
      const kh = loc(game, KNIGHTS);
      reveal(game, kh);
      setCounter(game, kh, "clues", 0);
      placeInvestigator(game, R, kh);
      setCounter(game, R, "clues", 0);
    });
    r = toTurn(pick(r, /Knight's Hall: investigate/), R); // agility 2 + 0 against shroud 2
    expect(flags.rememberedFact.get(gOf(r), "foundTheTowerKey")).toBe(true);
    expect(inv(gOf(r), R).clues).toBe(0);
    r = inject(r, (game) => {
      reveal(game, loc(game, CHOEUR));
      placeInvestigator(game, R, loc(game, CHOEUR));
    });
    expect(canMoveTo(gOf(r), R, loc(gOf(r), TOWER))).toBe(true);
  });
});

// ---------- 8.4 cards ----------
describe("cards", () => {
  it("03283 Porte de l'Avancée: two actions move 1 doom to the other agenda and place 2 clues here", () => {
    let r = bsr({ prep: (g) => setCounter(g, agendaA(g), "doom", 2) });
    const porte = loc(gOf(r), PORTE);
    const before = card(gOf(r), porte).clues;
    r = toTurn(pick(r, /Porte de l'Avancée: move 1 doom/), R);
    const g = gOf(r);
    expect([card(g, agendaA(g)).doom, card(g, agendaC(g)).doom]).toEqual([1, 1]);
    expect(card(g, porte).clues).toBe(before + 2);
    expect(inv(g, R).actionsLeft).toBe(1);
  });

  it("03284 Grand Rue: a success by 1 or less investigating it places 1 doom on the agenda with the most", () => {
    const at = (against: number) => {
      let r = bsr({
        bag: ["0"],
        prep: (g) => {
          const rue = loc(g, GRAND_RUE);
          reveal(g, rue);
          placeInvestigator(g, R, rue);
          setCounter(g, agendaC(g), "doom", 1);
        },
      });
      r = run(r, {
        t: STEP.Eff,
        effect: { op: "investigate", shroud: against - 1 },
        ctx: { you: R, source: null },
      });
      return card(gOf(r), agendaC(gOf(r))).doom;
    };
    // Grand Rue's shroud 1: intellect 3 against 1 + (2 - 1) = 2 succeeds by 1; against 1 + 0 by 2
    expect(at(2)).toBe(2);
    expect(at(1)).toBe(1);
  });

  it("03285 Outer Wall and 03287 North Tower: doom on the a (c) deck hurts each investigator there", () => {
    const hurt = (wall: string, deck: "a" | "c") => {
      const r = run(
        bsr({
          prep: (g) => {
            const w = findByCode(g, wall, [ZONE.Location, ZONE.SetAside, ZONE.Removed])!.id;
            moveCard(g, w, ZONE.Location);
            reveal(g, w);
            placeInvestigator(g, R, w);
          },
        }),
        { t: STEP.PlaceDoom, card: currentAgenda(gOf(bsr()), deck)!, n: 1 },
      );
      return [inv(gOf(r), R).damage, inv(gOf(r), R).horror];
    };
    expect(hurt("03285", "a")).toEqual([1, 0]);
    expect(hurt("03285", "c")).toEqual([0, 0]);
    expect(hurt("03287", "c")).toEqual([0, 1]);
  });

  it("03288 North Tower: each skill test there is 1 easier while the a agenda has more doom", () => {
    const at = (code: string, a: number, c: number) =>
      run(
        bsr({
          prep: (g) => {
            const w = findByCode(g, code, [ZONE.Location, ZONE.SetAside, ZONE.Removed])!.id;
            moveCard(g, w, ZONE.Location);
            reveal(g, w);
            placeInvestigator(g, R, w);
            setCounter(g, agendaA(g), "doom", a);
            setCounter(g, agendaC(g), "doom", c);
          },
        }),
        testOf("willpower", 4),
      );
    expect(lastTest(at("03288", 2, 1))!.success).toBe(true); // 3 against 4 - 1
    expect(lastTest(at("03288", 1, 2))!.success).toBe(false);
  });

  it("03286 Outer Wall: committed skill icons count twice while the c agenda has more doom", () => {
    const at = (a: number, c: number) => {
      let r = bsr({
        prep: (g) => {
          const w = findByCode(g, "03286", [ZONE.Location, ZONE.SetAside, ZONE.Removed])!.id;
          moveCard(g, w, ZONE.Location);
          reveal(g, w);
          placeInvestigator(g, R, w);
          setCounter(g, agendaA(g), "doom", a);
          setCounter(g, agendaC(g), "doom", c);
          giveCard(g, R, "01089"); // Guts: 2 willpower icons
        },
      });
      r = until(
        inject(r, () => {}, testOf("willpower", 6)),
        (x) => x.state.pending?.kind === "commit",
      );
      return lastTest(toTurn(pick(r, /Guts/), R))!.success;
    };
    // Roland's willpower 3 + Guts' 2 icons, twice: 7 against 6
    expect(at(1, 2)).toBe(true);
    expect(at(2, 1)).toBe(false);
  });

  it("03289 Broken Steps: entering it, lose 1 action or draw the topmost Omen in the encounter discard pile", () => {
    let r = bsr({
      prep: (g) => {
        const steps = findByCode(g, "03289", [ZONE.Location, ZONE.SetAside, ZONE.Removed])!.id;
        moveCard(g, steps, ZONE.Location);
        placeInvestigator(g, R, loc(g, GRAND_RUE));
      },
    });
    r = moveTo(r, "03289");
    r = until(r, (x) => x.state.pending?.kind === "turn");
    expect(inv(gOf(r), R).actionsLeft).toBe(1); // one action to move, one lost
  });

  it("03292 Chœur Gothique: 1 doom on the current a agenda heals 2 damage, once per game", () => {
    let r = bsr({
      prep: (g) => {
        abbeyOpen(g);
        const ch = findByCode(g, "03292", [ZONE.Location, ZONE.SetAside, ZONE.Removed])!.id;
        moveCard(g, ch, ZONE.Location);
        reveal(g, ch);
        placeInvestigator(g, R, ch);
        setCounter(g, R, "damage", 3);
      },
    });
    r = toTurn(pick(r, /Chœur Gothique: 1 doom/), R);
    expect(inv(gOf(r), R).damage).toBe(1);
    expect(card(gOf(r), agendaA(gOf(r))).doom).toBe(1);
    expect(options(r).some((o) => /Chœur Gothique: 1 doom on the current "a"/.test(o))).toBe(false);
  });

  it("03296 Chapel (Path is Open): no clues with more than 3 remaining sanity; take up to 3 horror", () => {
    let r = bsr({
      prep: (g) => {
        abbeyOpen(g);
        const ch = findByCode(g, "03296", [ZONE.Location, ZONE.SetAside, ZONE.Removed])!.id;
        moveCard(g, ch, ZONE.Location);
        reveal(g, ch);
        setCounter(g, ch, "clues", 2);
        placeInvestigator(g, R, ch);
      },
    });
    r = run(r, { t: STEP.DiscoverClues, inv: R, location: loc(gOf(r), "03296"), n: 1 });
    expect(inv(gOf(r), R).clues).toBe(0);
    r = until(pick(r, /take up to 3 horror/), (x) =>
      /how much horror/.test(x.state.pending?.prompt ?? ""),
    );
    r = toTurn(pick(r, "3 horror"), R);
    expect(inv(gOf(r), R).horror).toBe(3);
    r = run(r, { t: STEP.DiscoverClues, inv: R, location: loc(gOf(r), "03296"), n: 1 });
    expect(inv(gOf(r), R).clues).toBe(4 - 4 + 1);
  });

  it("03298 Abbey Tower (Path is Open): clues only with an empty hand; discard up to 3 cards", () => {
    let r = bsr({
      prep: (g) => {
        abbeyOpen(g);
        const t = findByCode(g, "03298", [ZONE.Location, ZONE.SetAside, ZONE.Removed])!.id;
        moveCard(g, t, ZONE.Location);
        reveal(g, t);
        setCounter(g, t, "clues", 2);
        placeInvestigator(g, R, t);
      },
    });
    const n = inv(gOf(r), R).hand.length;
    r = until(pick(r, /discard up to 3/), (x) =>
      /Discard which card/.test(x.state.pending?.prompt ?? ""),
    );
    r = pick(r, r.state.pending!.options[0].id);
    r = toTurn(pick(r, "Stop discarding"), R);
    expect(inv(gOf(r), R).hand.length).toBe(n - 1);
    r = run(r, { t: STEP.DiscoverClues, inv: R, location: loc(gOf(r), "03298"), n: 1 });
    expect(inv(gOf(r), R).clues).toBe(0);
  });

  it("03300 Tidal Terror spawns at Porte de l'Avancée or the Chapel", () => {
    const r = run(bsr({ prep: (g) => placeInvestigator(g, R, loc(g, GRAND_RUE)) }), {
      t: STEP.Spawn,
      enemy: aside(gOf(bsr()), TIDAL)[0].id,
      inv: R,
    });
    expect(codeOf(gOf(r), findByCode(gOf(r), TIDAL, [ZONE.Enemy])!.location)).toBe(PORTE);
  });

  it("03301 Rift Seeker: after it attacks, 1 more damage and horror or 1 doom on each agenda; its parley discards it", () => {
    let r = bsr({
      prep: (g) => moveCard(g, aside(g, RIFT)[0].id, ZONE.Enemy, { location: inv(g, R).location }),
    });
    const seeker = findByCode(gOf(r), RIFT, [ZONE.Enemy])!.id;
    r = inject(r, () => {}, {
      t: STEP.EnemyAttack,
      enemy: seeker,
      inv: R,
      aoo: false,
      key: "test-attack",
    });
    r = until(r, (x) => /Rift Seeker: choose one/.test(x.state.pending?.prompt ?? ""));
    r = toTurn(pick(r, /each agenda/), R);
    let g = gOf(r);
    expect([card(g, agendaA(g)).doom, card(g, agendaC(g)).doom]).toEqual([1, 1]);
    r = toTurn(pick(r, /Rift Seeker: 1 doom on each agenda/), R);
    g = gOf(r);
    expect(findByCode(g, RIFT, [ZONE.Enemy])).toBeUndefined();
    expect([card(g, agendaA(g)).doom, card(g, agendaC(g)).doom]).toEqual([2, 2]);
  });

  it("03302 Crashing Floods: the failure's cost grows with the a side's stage", () => {
    const flood = (stage: number) => {
      let r = bsr({ bag: ["-8"] });
      for (let k = 1; k < stage; k++) r = run(r, { t: STEP.AdvanceAgenda });
      const before = inv(gOf(r), R).damage;
      r = run(
        inject(r, (g) =>
          moveCard(g, createCard(g, "03302", ZONE.Limbo), ZONE.EncounterDeck, { top: true }),
        ),
        { t: STEP.DrawEncounter, inv: R },
      );
      return inv(gOf(r), R).damage - before;
    };
    expect(flood(1)).toBe(1);
    expect(flood(2)).toBe(2);
  });

  it("agendas 2c and 3c: each Monster enemy gets +1 fight; 2a and 3a: each Ancient Evils gains surge", () => {
    let r = bsr({
      prep: (g) => {
        moveCard(g, createCard(g, BYAKHEE, ZONE.Limbo), ZONE.Enemy, {
          location: inv(g, R).location,
        });
        createCard(g, "01166", ZONE.EncounterDeck);
      },
    });
    const byakhee = () => findByCode(gOf(r), BYAKHEE, [ZONE.Enemy])!.id;
    const evils = () => findByCode(gOf(r), "01166")!.id;
    const fight = enemyStat(gOf(r), byakhee(), "fight");
    expect(gainsKeyword(gOf(r), evils(), "surge")).toBe(false);
    r = run(r, { t: STEP.AdvanceAgenda, deck: "c" });
    expect(enemyStat(gOf(r), byakhee(), "fight")).toBe(fight + 1);
    r = run(r, { t: STEP.AdvanceAgenda });
    expect(gainsKeyword(gOf(r), evils(), "surge")).toBe(true);
  });
});

// ---------- 8.6 the end and the campaign ----------
describe("the end of the game", () => {
  it("records Ashleigh Clarke in the victory display as slain", () => {
    const r = toEnd(
      inject(bsr({ prep: (g) => moveCard(g, aside(g, ASHLEIGH)[0].id, ZONE.Victory) }), () => {}, {
        t: STEP.Resolution,
        id: "R1",
      }),
    );
    expect(r.state.flags[`log:vipsSlain:${ASHLEIGH}`]).toBe(true);
  });
});

describe("the campaign", () => {
  function walk(c: CampaignState): CampaignState {
    for (let k = 0; k < 160 && c.flow.waiting; k++) {
      const st = c.flow.waiting.step;
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
  function finish(
    c: CampaignState,
    resolution: string,
    fn: (game: GameContext) => void = () => {},
  ) {
    let r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c, 1))));
    r = inject(r, fn, { t: STEP.Resolution, id: resolution });
    return applyScenarioEnd(db, c, r.state);
  }
  const atBlackStars = (before?: (c: CampaignState) => void) => {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-path-to-carcosa",
        difficulty: "standard",
        seed: 2,
        investigators: [
          { code: R, deckId: "roland-starter" },
          { code: D, deckId: "daisy-starter" },
        ],
      }),
    );
    for (const res of ["R1", "R1", "R1", "R3", "R1"]) c = walk(finish(c, res));
    before?.(c);
    c = walk(finish(c, "R1"));
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "black-stars-rise" });
    return c;
  };

  it("the setup adds the difficulty's token for the rest of the campaign and a basic weakness to each deck", () => {
    const TRAITS = ["Madness", "Pact", "Cultist", "Detective"];
    const weaknesses = (c: CampaignState) =>
      c.investigators.map(
        (i) =>
          i.deck.filter(
            (code) =>
              db.cards[code].subtype === "basicweakness" &&
              db.cards[code].traits.some((t) => TRAITS.includes(t)),
          ).length,
      );
    let at: number[] = [];
    const c = atBlackStars((pallid) => (at = weaknesses(pallid)));
    expect(c.chaosBag).toContain("-5");
    expect(weaknesses(c)).toEqual(at.map((n) => n + 1));
  });

  it("R3: each investigator is driven insane, with mental trauma equal to their sanity, and the campaign is lost", () => {
    const c = walk(finish(atBlackStars(), "R3"));
    expect(c.investigators.map((i) => i.status)).toEqual(["insane", "insane"]);
    expect(c.investigators.map((i) => i.mentalTrauma)).toEqual([
      db.cards[R].sanity,
      db.cards[D].sanity,
    ]);
    expect(hasEntry(c.log, "carcosaMerged", "campaign_notes")).toBe(true);
    expect(c.result).toBe("lose");
  });

  it("no resolution goes to R3", () => {
    const c = walk(finish(atBlackStars(), "none"));
    expect(c.investigators.every((i) => i.status === "insane")).toBe(true);
    expect(c.result).toBe("lose");
  });

  it("R1: the path below opened, all cultist, tablet and elder thing tokens replaced by 2 cultist and 2 tablet; no Ashleigh question", () => {
    const c = walk(finish(atBlackStars(), "R1"));
    expect(hasEntry(c.log, "openedPathBelow", "campaign_notes")).toBe(true);
    expect(c.chaosBag.filter((t) => t === "cultist")).toHaveLength(2);
    expect(c.chaosBag.filter((t) => t === "tablet")).toHaveLength(2);
    expect(c.chaosBag.filter((t) => t === "elderThing")).toHaveLength(0);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "dim-carcosa" });
  });

  it("R2: the path above opened, 2 cultist and 2 elder thing", () => {
    const c = walk(finish(atBlackStars(), "R2"));
    expect(hasEntry(c.log, "openedPathAbove", "campaign_notes")).toBe(true);
    expect(c.chaosBag.filter((t) => t === "elderThing")).toHaveLength(2);
    expect(c.chaosBag.filter((t) => t === "tablet")).toHaveLength(0);
  });
});
