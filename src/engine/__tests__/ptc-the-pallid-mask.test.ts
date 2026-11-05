/** The Pallid Mask (campaign-the-path-to-carcosa, group 7): setup, tokens, the catacombs grid, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, type Result } from "../index";
import { db, gOf, options, pick, skipMulligans } from "../kits/testkit";
import { fight, game, inject, lastTest, move as moveTo, toTurn, until } from "../kits/driver";
import { cellOf, connections, enemies, enemyStat, findByCode, locationAt } from "../queries";
import { enterCost } from "../rules/investigators";
import {
  allCards,
  card,
  currentAct,
  currentAgenda,
  exhaust,
  inv,
  placeInvestigator,
  reveal,
  setController,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard, setCell } from "../movement";
import * as flags from "../world/flags";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry, logCount } from "../campaign/log";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002";
const GATE = "03247";
const ARCHWAYS = "03248";
const CRYPT = "03249";
const WELL = "03251";
const LABYRINTH = "03253";
const BLOCKED = "03256";
const TOMB = "03257";
const MITPM = "03059";
const HARUKO = "03067b";
const SPECTER = "03241b";
const GHOUL = "01160";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const tpm = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
  prep,
}: Opts = {}) =>
  game({
    scenario: "the-pallid-mask",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-path-to-carcosa", campaignLog: log, difficulty },
  });

const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const start = (game: GameContext) => flags.startLocation.get(game)!;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const testOf = (skill: "willpower" | "intellect", difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill, difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
/** a set-aside Catacombs (by code) put into play on a cell, unrevealed */
function place(game: GameContext, code: string, cell: [number, number]): InstId {
  const c = allCards(game).find((x) => x.code === code && x.zone === ZONE.SetAside)!;
  moveCard(game, c.id, ZONE.Location);
  setCell(game, c.id, cell);
  return c.id;
}
/** the map around the start emptied: everything the start's Forced ability put into play goes back to the deck */
function clearMap(game: GameContext) {
  for (const l of allCards(game).filter((x) => x.zone === ZONE.Location && x.id !== start(game)))
    moveCard(game, l.id, ZONE.SetAside);
}
const inPlay = (game: GameContext) => allCards(game).filter((c) => c.zone === ZONE.Location).length;
const toEnd = (r: Result) => until(r, () => false, 400);
/** the first turn's start: answer the start's Forced ability and get to Roland's turn */
const firstTurn = (o: Opts = {}) => toTurn(tpm(o), R);

// ---------- 7.1 setup ----------
describe("setup", () => {
  it("entered on their own: The Gate to Hell is the start, revealed with everyone there; the rest is the Catacombs deck", () => {
    const g = gOf(tpm({ invs: [R, D] }));
    const s = start(g);
    expect(codeOf(g, s)).toBe(GATE);
    expect(cellOf(g, s)).toEqual([0, 0]);
    expect(card(g, s).revealed).toBe(true);
    expect(inv(g, R).location).toBe(s);
    expect(inv(g, D).location).toBe(s);
    const deck = flags.catacombs.get(g)!;
    // 14 Catacombs: the start, the two its Forced ability put into play on the first turn, the deck
    expect(deck.length + allCards(g).filter((c) => c.zone === ZONE.Location).length).toBe(14);
    const bottom = deck.slice(-5).map((id) => codeOf(g, id));
    expect(bottom).toContain(TOMB);
    expect(bottom).toContain(BLOCKED);
    expect(findByCode(g, HARUKO, [ZONE.SetAside])).toBeDefined();
    expect(findByCode(g, MITPM, [ZONE.SetAside])).toBeDefined();
    expect(findByCode(gOf(tpm({ log: { [HARUKO]: true } })), HARUKO, [ZONE.SetAside])).toBeFalsy();
  });

  it("awoke inside the catacombs: a random Catacombs other than the Tomb and the Blocked Passage is the start", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = gOf(tpm({ seed, log: { awokeInsideCatacombs: true } }));
      expect([TOMB, BLOCKED]).not.toContain(codeOf(g, start(g)));
    }
  });

  it("the start's Forced ability resolves on the first turn: The Gate to Hell puts Catacombs above and below it", () => {
    const g = gOf(firstTurn());
    const s = start(g);
    const above = locationAt(g, [0, -1]);
    const below = locationAt(g, [0, 1]);
    expect(above && card(g, above).revealed).toBe(false);
    expect(below && card(g, below).revealed).toBe(false);
    expect(flags.catacombs.get(g)!).toHaveLength(11);
    // 7.5: adjacency is the grid's
    expect(connections(g, s).sort()).toEqual([above, below].sort());
    expect(connections(g, above!)).toEqual([s]);
  });

  it("the secret passageway: the lead reveals a Catacombs beside the start", () => {
    let r = skipMulligans(
      createGame(db, {
        campaignId: "the-path-to-carcosa",
        scenarioId: "the-pallid-mask",
        difficulty: "standard",
        seed: 1,
        chaosBag: ["0"],
        campaignLog: { "03078": true },
        investigators: [{ code: R, deck: [] }],
      }),
    );
    r = until(r, (x) => /beside the starting location/.test(x.state.pending?.prompt ?? ""));
    const choice = r.state.pending!.options[0].value as string;
    r = toTurn(pick(r, r.state.pending!.options[0].id), R);
    expect(card(gOf(r), choice).revealed).toBe(true);
    const g = gOf(tpm());
    expect([locationAt(g, [0, -1]), locationAt(g, [0, 1])].some((l) => card(g, l!).revealed)).toBe(
      false,
    );
  });
});

// ---------- 7.2 tokens ----------
describe("chaos tokens", () => {
  const draw = (bag: ChaosToken[], difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(firstTurn({ bag, difficulty, prep }), testOf("willpower", against));
  /** Roland `n` locations from the start, along a row of revealed Catacombs */
  const away = (n: number) => (game: GameContext) => {
    clearMap(game);
    const row = [ARCHWAYS, CRYPT, "03250", WELL, "03252", LABYRINTH, "03254"];
    let last = start(game);
    for (let k = 1; k <= n; k++) {
      last = place(game, row[k - 1], [k, 0]);
      reveal(game, last);
    }
    placeInvestigator(game, R, last);
  };

  it("skull −X, the locations away from the start: at most 5 on Easy and Standard", () => {
    expect(mods(draw(["skull"], "standard", 0, away(2)))).toEqual([-2]);
    expect(mods(draw(["skull"], "standard", 0, away(7)))).toEqual([-5]);
    expect(mods(draw(["skull"], "hard", 0, away(7)))).toEqual([-7]);
  });

  /** Roland (combat 4) fights a Ghoul Minion at the start with this token */
  const fightGhoul = (token: ChaosToken, difficulty: Difficulty) => {
    let r = firstTurn({
      bag: [token],
      difficulty,
      prep: (g) => {
        const e = createCard(g, GHOUL, ZONE.Enemy);
        moveCard(g, e, ZONE.Enemy, { location: start(g) });
      },
    });
    const ghoul = enemies(gOf(r)).find((e) => e.code === GHOUL)!.id;
    r = toTurn(fight(r, GHOUL), R);
    return { r, damage: card(gOf(r), ghoul).damage };
  };

  it("cultist −2: a successful attack deals 1 less damage", () => {
    expect(fightGhoul("0", "standard").damage).toBe(1);
    const { r, damage } = fightGhoul("cultist", "standard");
    expect(lastTest(r)?.success).toBe(true);
    expect(damage).toBe(0);
    expect(mods(draw(["cultist"], "hard"))).toEqual([-3]);
  });

  it("tablet −2: a ready Ghoul or Geist at your location attacks you; Hard −3: an exhausted one readies first", () => {
    const ghoulHere = (exhausted: boolean) => (game: GameContext) => {
      const e = createCard(game, GHOUL, ZONE.Enemy);
      moveCard(game, e, ZONE.Enemy, { location: start(game) });
      if (exhausted) exhaust(game, e);
    };
    const hurt = (r: Result) => inv(gOf(r), R).damage + inv(gOf(r), R).horror;
    const r = draw(["tablet"], "standard", 0, ghoulHere(false));
    expect(mods(r)).toEqual([-2]);
    expect(hurt(r)).toBeGreaterThan(0);
    expect(hurt(draw(["tablet"], "standard", 0, ghoulHere(true)))).toBe(0);
    expect(hurt(draw(["tablet"], "hard", 0, ghoulHere(true)))).toBeGreaterThan(0);
  });

  it("elder thing −3: a failure draws a Ghoul or Geist from the encounter deck or discard pile", () => {
    const r = draw(["elderThing"], "standard", 5);
    expect(mods(r)).toEqual([-3]);
    const drawn = enemies(gOf(r)).filter((e) =>
      ["Ghoul", "Geist"].some((t) => db.cards[e.code].traits.includes(t)),
    );
    expect(drawn.length).toBeGreaterThan(0);
  });
});

// ---------- 7.3 the catacombs ----------
describe("the catacombs", () => {
  it("a choice of spots asks the revealer, among the free ones; with none free, nothing is put into play", () => {
    let r = firstTurn({
      prep: (g) => {
        clearMap(g);
        place(g, WELL, [1, 0]);
        place(g, LABYRINTH, [2, -1]);
      },
    });
    const well = findByCode(gOf(r), WELL, [ZONE.Location])!.id;
    const before = inPlay(gOf(r));
    r = inject(r, () => {}, { t: STEP.RevealLocation, location: well });
    r = until(r, (x) => /put the next Catacombs where/.test(x.state.pending?.prompt ?? ""));
    // above [1,-1] and right [2,0] and below [1,1] are free
    expect(options(r).sort()).toEqual(["Above", "Below", "To the right"]);
    r = toTurn(pick(r, "Below"), R);
    const g = gOf(r);
    expect(locationAt(g, [1, 1])).toBeTruthy();
    expect(inPlay(g)).toBe(before + 1);
  });

  it("each spot named gets one, an occupied spot none", () => {
    let r = firstTurn({
      prep: (g) => {
        clearMap(g);
        place(g, LABYRINTH, [1, 0]);
        place(g, ARCHWAYS, [1, -1]);
      },
    });
    const lab = findByCode(gOf(r), LABYRINTH, [ZONE.Location])!.id;
    const before = inPlay(gOf(r));
    r = run(r, { t: STEP.RevealLocation, location: lab });
    const g = gOf(r);
    expect(locationAt(g, [1, 1])).toBeTruthy();
    expect(locationAt(g, [2, 0])).toBeTruthy();
    expect(inPlay(g)).toBe(before + 2);
  });

  it("entering an unrevealed Catacombs costs 1 clue per investigator, as a group; not beside revealed Stone Archways", () => {
    const g = gOf(
      firstTurn({
        invs: [R, D],
        prep: (x) => {
          clearMap(x);
          place(x, CRYPT, [1, 0]);
          const a = place(x, ARCHWAYS, [-1, 0]);
          reveal(x, a);
          place(x, WELL, [-2, 0]);
        },
      }),
    );
    expect(enterCost(g, findByCode(g, CRYPT, [ZONE.Location])!.id)).toBe(2);
    expect(enterCost(g, findByCode(g, WELL, [ZONE.Location])!.id)).toBe(0);
  });

  it("the Tomb of Shadows revealed advances act 1: The Man in the Pallid Mask spawns there, Ishimaru Haruko at the start", () => {
    let r = firstTurn({ prep: (g) => void place(g, TOMB, [1, 0]) });
    const tomb = findByCode(gOf(r), TOMB, [ZONE.Location])!.id;
    r = run(r, { t: STEP.RevealLocation, location: tomb });
    const g = gOf(r);
    expect(codeOf(g, currentAct(g))).toBe("03244");
    const him = enemies(g).find((e) => e.code === MITPM)!;
    expect(him.location).toBe(tomb);
    expect(enemyStat(g, him.id, "health")).toBe(3 + 1);
    expect(enemies(g).find((e) => e.code === HARUKO)!.location).toBe(start(g));
  });

  it("the Blocked Passage: revealing it takes 2 damage and you can't leave this round", () => {
    let r = firstTurn({ prep: (g) => void place(g, BLOCKED, [1, 0]) });
    const blocked = findByCode(gOf(r), BLOCKED, [ZONE.Location])!.id;
    r = run(r, { t: STEP.RevealLocation, location: blocked, by: R } as Step);
    expect(inv(gOf(r), R).damage).toBe(2);
  });
});

// ---------- the acts and agendas ----------
describe("the acts", () => {
  const toAct = (game: GameContext, code: string) => {
    moveCard(game, currentAct(game)!, ZONE.Removed);
    moveCard(game, findByCode(game, code, [ZONE.ActDeck])!.id, ZONE.Act, { deck: "a" });
  };

  it("2: The Man in the Pallid Mask defeated marks two Conviction; The Way Out follows", () => {
    let r = firstTurn({
      prep: (g) => {
        toAct(g, "03244");
        const tomb = place(g, TOMB, [1, 0]);
        reveal(g, tomb);
        placeInvestigator(g, R, tomb);
        moveCard(g, findByCode(g, MITPM, [ZONE.SetAside])!.id, ZONE.Enemy, { location: tomb });
      },
    });
    const him = enemies(gOf(r)).find((e) => e.code === MITPM)!.id;
    r = run(r, { t: STEP.DefeatEnemy, enemy: him, by: R } as Step);
    const g = gOf(r);
    expect(codeOf(g, currentAct(g))).toBe("03245");
    expect(flags.countEntry.get(g, ["conviction", "conviction"])).toBe(2);
    expect(r.state.flags["log:hidden:tpmConvictionOrDoubt"]).toBe(true);
    expect(allCards(g).some((c) => c.code === "03246" && c.zone === ZONE.ActDeck)).toBe(false);
  });

  it("2: clues spent in the Tomb of Shadows mark two Doubt; Leading the Way follows", () => {
    const g = gOf(
      run(firstTurn({ prep: (x) => toAct(x, "03244") }), {
        t: STEP.AdvanceAct,
        spend: true,
      } as Step),
    );
    expect(codeOf(g, currentAct(g))).toBe("03246");
    expect(flags.countEntry.get(g, ["doubt", "doubt"])).toBe(2);
  });

  it("3a The Way Out: at the end of the round the location farthest from The Gate to Hell collapses; everyone at the Gate: R1", () => {
    let r = firstTurn({
      prep: (g) => {
        toAct(g, "03245");
        clearMap(g);
        reveal(g, place(g, ARCHWAYS, [1, 0]));
        reveal(g, place(g, CRYPT, [2, 0]));
      },
    });
    r = toTurn(pick(r, "End turn"), R);
    const g = gOf(r);
    expect(findByCode(g, CRYPT, [ZONE.Location])).toBeFalsy();
    expect(findByCode(g, ARCHWAYS, [ZONE.Location])).toBeTruthy();
    const end = run(r, { t: STEP.CheckObjectives } as Step);
    expect(toEnd(end).state.resolution).toBe("R1");
  });

  it("3b Leading the Way: the Blocked Passage's Forced ability is ignored; everyone there: R2", () => {
    let r = firstTurn({
      prep: (g) => {
        toAct(g, "03246");
        const b = place(g, BLOCKED, [1, 0]);
        placeInvestigator(g, R, b);
      },
    });
    const b = findByCode(gOf(r), BLOCKED, [ZONE.Location])!.id;
    r = inject(r, () => {}, { t: STEP.RevealLocation, location: b, by: R } as Step);
    expect(toEnd(r).state.resolution).toBe("R2");
    expect(inv(gOf(r), R).damage).toBe(0);
  });
});

describe("the agendas", () => {
  it("1b: Specter of Death spawns at the starting location", () => {
    const g = gOf(
      run(firstTurn({ prep: (x) => setCounter(x, currentAgenda(x)!, "doom", 6) }), {
        t: STEP.CheckDoom,
      }),
    );
    expect(codeOf(g, currentAgenda(g))).toBe("03242");
    expect(enemies(g).find((e) => e.code === SPECTER)?.location).toBe(start(g));
  });

  it("2b: each investigator is defeated (physical trauma): no resolution", () => {
    const r = toEnd(
      inject(
        firstTurn({
          prep: (g) => {
            moveCard(g, currentAgenda(g)!, ZONE.Removed);
            moveCard(g, findByCode(g, "03242", [ZONE.AgendaDeck])!.id, ZONE.Agenda, { deck: "a" });
            setCounter(g, currentAgenda(g)!, "doom", 12);
          },
        }),
        () => {},
        { t: STEP.CheckDoom },
      ),
    );
    expect(r.state.resolution).toBe("none");
    expect(r.state.log.some((e) => /physical trauma/.test(e.text))).toBe(true);
  });
});

// ---------- 7.4 cards ----------
describe("cards", () => {
  it("03262 The Pit Below: +1 shroud; at the end of the round 3 damage to each investigator there", () => {
    let r = firstTurn({ prep: (g) => void createCard(g, "03262", ZONE.Limbo) });
    const pit = allCards(gOf(r)).find((c) => c.code === "03262")!.id;
    r = run(r, { t: STEP.Revelation, inv: R, card: pit });
    expect(card(gOf(r), pit).zone).toBe(ZONE.Attached);
    r = toTurn(pick(r, "End turn"), R);
    expect(inv(gOf(r), R).damage).toBe(3);
  });

  it("03261 The Shadow Behind You: not looking behind you discards your resources or your hand", () => {
    let r = firstTurn({ prep: (g) => void createCard(g, "03261", ZONE.Limbo) });
    const shadow = allCards(gOf(r)).find((c) => c.code === "03261")!.id;
    r = run(r, { t: STEP.Revelation, inv: R, card: shadow });
    expect(card(gOf(r), shadow).zone).toBe(ZONE.Threat);
    r = pick(r, "End turn");
    r = until(r, (x) => /Discard all your resources/.test(options(x).join("|")));
    r = toTurn(pick(r, /Discard all your resources/), R);
    expect(inv(gOf(r), R).resources).toBeLessThanOrEqual(1);
    expect(card(gOf(r), shadow).zone).not.toBe(ZONE.Threat);
  });

  it("03260 Eyes in the Walls: the horror is divided as evenly as possible among the cards that can take it", () => {
    let r = firstTurn({
      bag: ["-2"],
      prep: (g) => {
        const ally = createCard(g, "01018", ZONE.Play); // Beat Cop: 2 health, 2 sanity
        setController(g, ally, R);
        createCard(g, "03260", ZONE.Limbo);
      },
    });
    const eyes = allCards(gOf(r)).find((c) => c.code === "03260")!.id;
    r = inject(r, () => {}, { t: STEP.Revelation, inv: R, card: eyes });
    // willpower 3 − 2 against 3: 2 horror; after the first to Roland, the second must go to the Beat Cop
    r = until(r, (x) => /assign 1 horror/.test(x.state.pending?.prompt ?? ""));
    r = pick(r, /to Roland/);
    expect(options(r)).toEqual([expect.stringMatching(/to Beat Cop/)]);
  });

  it("03259 Corpse Dweller: spawns where a Humanoid enemy is, discarding it; with none it is discarded and the drawer draws again", () => {
    let r = firstTurn({
      prep: (g) => {
        const docent = createCard(g, "03258", ZONE.Enemy);
        moveCard(g, docent, ZONE.Enemy, { location: start(g) });
        createCard(g, "03259", ZONE.Limbo);
      },
    });
    const dweller = allCards(gOf(r)).find((c) => c.code === "03259")!.id;
    r = run(r, { t: STEP.Spawn, enemy: dweller, inv: R } as Step);
    const g = gOf(r);
    expect(card(g, dweller).location).toBe(start(g));
    expect(enemies(g).some((e) => e.code === "03258")).toBe(false);
    const alone = firstTurn({ prep: (x) => void createCard(x, "03259", ZONE.Limbo) });
    const d2 = allCards(gOf(alone)).find((c) => c.code === "03259")!.id;
    const drawn = alone.state.log.length;
    const after = run(alone, { t: STEP.Spawn, enemy: d2, inv: R } as Step);
    expect(card(gOf(after), d2).zone).toBe(ZONE.EncounterDiscard);
    expect(after.state.log.slice(drawn).some((e) => e.type === "encounter")).toBe(true);
  });

  it("03254 Narrow Shaft: moving from it to an unrevealed location tests agility (3); a failure takes 1 damage and stays", () => {
    let r = firstTurn({
      bag: ["-2"],
      prep: (g) => {
        clearMap(g);
        const shaft = place(g, "03254", [1, 0]);
        reveal(g, shaft);
        placeInvestigator(g, R, shaft);
        place(g, CRYPT, [2, 0]);
        setCounter(g, R, "clues", 1);
      },
    });
    const shaft = findByCode(gOf(r), "03254", [ZONE.Location])!.id;
    r = toTurn(moveTo(r, CRYPT), R);
    expect(inv(gOf(r), R).location).toBe(shaft);
    expect(inv(gOf(r), R).damage).toBe(1);
  });

  it("03249 Crypt of the Sepulchral Lamp: investigated with willpower", () => {
    expect(db.cards[CRYPT].investigateSkill).toBe("willpower");
  });

  it("03241b Specter of Death: while exhausted an attack deals it 1 less damage", () => {
    let r = firstTurn({
      bag: ["+1"],
      prep: (g) => {
        const s = createCard(g, SPECTER, ZONE.Enemy);
        moveCard(g, s, ZONE.Enemy, { location: start(g) });
        exhaust(g, s);
      },
    });
    const s = enemies(gOf(r)).find((e) => e.code === SPECTER)!.id;
    r = toTurn(fight(r, SPECTER), R);
    expect(card(gOf(r), s).damage).toBe(0);
  });
});

// ---------- 7.6 the end and the campaign ----------
describe("the end of the game", () => {
  it("records Ishimaru Haruko in the victory display as slain", () => {
    const r = toEnd(
      inject(
        tpm({ prep: (g) => moveCard(g, findByCode(g, HARUKO, [ZONE.SetAside])!.id, ZONE.Victory) }),
        () => {},
        { t: STEP.Resolution, id: "R1" },
      ),
    );
    expect(r.state.flags[`log:vipsSlain:${HARUKO}`]).toBe(true);
  });
});

describe("the campaign", () => {
  function walk(c: CampaignState): CampaignState {
    for (let k = 0; k < 120 && c.flow.waiting; k++) {
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
  const atPallid = (phantom = "R1") => {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-path-to-carcosa",
        difficulty: "standard",
        seed: 2,
        investigators: [{ code: R, deckId: "roland-starter" }],
      }),
    );
    for (const res of ["R1", "R1", "R1", "R3", phantom]) c = walk(finish(c, res));
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-pallid-mask" });
    return c;
  };

  it("from Phantom's R1 the investigators entered on their own: The Gate to Hell is the start", () => {
    const c = atPallid("R1");
    expect(hasEntry(c.log, "enteredCatacombs", "campaign_notes")).toBe(true);
    const g = gOf(toTurn(skipMulligans(createGame(db, scenarioSetup(db, c, 1)))));
    expect(codeOf(g, start(g))).toBe(GATE);
  });

  it("R1 reads the Conviction the act recorded: no question, two Conviction, two cultists", () => {
    const c0 = atPallid();
    const before = logCount(c0.log, "conviction", "conviction");
    const c = walk(
      finish(c0, "R1", (g) => {
        flags.countEntry.set(g, ["conviction", "conviction"], 2);
        flags.logEntry.set(g, ["hidden", "tpmConvictionOrDoubt"], true);
      }),
    );
    expect(logCount(c.log, "conviction", "conviction")).toBe(before + 2);
    expect(hasEntry(c.log, "knowSiteOfGate", "campaign_notes")).toBe(true);
    expect(c.chaosBag.filter((t) => t === "cultist")).toHaveLength(2);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "black-stars-rise" });
  });

  it("no resolution: each investigator chooses whether to read Act II; the readers earn 2 experience", () => {
    const c0 = atPallid();
    const xp = c0.investigators[0].xp;
    const c = walk(finish(c0, "none"));
    expect(hasEntry(c.log, "readAct2", "campaign_notes")).toBe(true);
    expect(c.investigators[0].xp).toBeGreaterThanOrEqual(xp + 2);
    expect(c.chaosBag.filter((t) => t === "elderThing")).toHaveLength(2);
  });
});
