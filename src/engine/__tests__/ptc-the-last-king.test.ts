/** The Last King (campaign-the-path-to-carcosa, group 3): setup, tokens, map, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, type Result } from "../index";
import { db, gOf, mutate, options, pick, putEnemy, skipMulligans } from "../kits/testkit";
import { game, hand, inject, lastTest, toTurn, until, use, windowOf } from "../kits/driver";
import { connections, enemies, enemyStat, findByCode } from "../queries";
import {
  allCards,
  card,
  cardsBeneath,
  currentAct,
  currentAgenda,
  exhaust,
  inv,
  setPhase,
  pile,
  placeInvestigator,
  reveal,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { rememberedFact } from "../world/flags";
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

const R = "01001"; // Roland: willpower 3, intellect 3; 5 resources
const D = "01002";
const FOYER = "03070";
const BALLROOM = "03071";
const LIVING = "03072";
const GALLERY = "03073";
const COURTYARD = "03074";
const DINING = "03075";
const CONSTANCE = "03076a";
const JORDAN = "03077";
const ASHLEIGH = "03080";
const BYSTANDERS = [CONSTANCE, JORDAN, "03078", "03079", ASHLEIGH];
const DIANNE = "03081";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  prep?: (game: GameContext) => void;
}
const tlk = ({ invs = [R], bag = ["0"], difficulty = "standard", seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "the-last-king",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-path-to-carcosa", campaignLog: {}, difficulty },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])!.id;
const bystander = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Attached])!;
/** Roland at the location of this Bystander, revealed */
const visit = (game: GameContext, code: string, who = R) => {
  const at = bystander(game, code).location!;
  reveal(game, at);
  placeInvestigator(game, who, at);
  return at;
};
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
const code = (r: Result, id: string | null | undefined) => (id ? card(gOf(r), id).code : null);
const scenarioCard = (game: GameContext) => allCards(game).find((c) => c.zone === ZONE.Scenario)!;
const toEnd = (r: Result) => until(r, () => false, 300);

// ---------- 3.1 setup ----------
describe("setup", () => {
  it("six locations, everyone in the Foyer; a Bystander at each other location with 1 + 1 per investigator clues", () => {
    const g = gOf(tlk({ invs: [R, D, "01003"] }));
    for (const c of [FOYER, BALLROOM, LIVING, GALLERY, COURTYARD, DINING])
      expect(loc(g, c)).toBeDefined();
    expect(card(g, inv(g, R).location!).code).toBe(FOYER);
    const at = BYSTANDERS.map((b) => bystander(g, b));
    expect(new Set(at.map((b) => b.location)).size).toBe(5);
    expect(at.map((b) => card(g, b.location!).code)).not.toContain(FOYER);
    for (const b of at) expect(card(g, b.id)).toMatchObject({ clues: 4, controller: null });
  });

  it("the five Sickening Reality cards beneath the scenario reference card; Dianne Devine set aside", () => {
    const g = gOf(tlk());
    expect(
      cardsBeneath(g, scenarioCard(g).id)
        .map((id) => card(g, id).code)
        .sort(),
    ).toEqual(["03065", "03066", "03067", "03068", "03069"]);
    expect(findByCode(g, DIANNE)?.zone).toBe(ZONE.SetAside);
  });

  it("the Bystanders' places are random", () => {
    const where = (seed: number) => {
      const g = gOf(tlk({ seed }));
      return BYSTANDERS.map((b) => card(g, bystander(g, b).location!).code).join();
    };
    expect(new Set([1, 2, 3, 4, 5].map(where)).size).toBeGreaterThan(1);
  });
});

// ---------- 3.2 tokens ----------
describe("chaos tokens", () => {
  const draw = (bag: ChaosToken[], difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(tlk({ bag, difficulty, prep }), testOf("willpower", against));
  const withPossessed = (game: GameContext) => {
    putEnemy(game, "03095", loc(game, DINING)); // Seer of the Sign, Possessed: 4 health
    putEnemy(game, "03096", loc(game, DINING)); // Puppet of Hastur: 2 health
  };

  it("skull: reveal another; a failure places 1 doom on a Possessed enemy (Hard: the one with the most remaining health)", () => {
    // a seed on which the skull comes out first, then the −1
    const skullFirst = (difficulty: Difficulty) => {
      for (let seed = 1; seed < 40; seed++) {
        const r = run(
          tlk({ bag: ["skull", "-1"], difficulty, seed, prep: withPossessed }),
          testOf("willpower", 10),
        );
        const seen = r.state.log.filter((e) => e.type === "token").map((e) => e.data?.token);
        if (seen.join() === "skull,-1") return r;
      }
      throw new Error("no seed reveals the skull first");
    };
    let r = skullFirst("standard");
    expect(enemies(gOf(r)).reduce((n, e) => n + e.doom, 0)).toBe(1);
    r = skullFirst("hard");
    expect(enemies(gOf(r)).find((e) => e.code === "03095")!.doom).toBe(1);
  });

  it("cultist −2, a failure puts 1 of your clues on your location; Hard −3 and always", () => {
    let r = draw(["cultist"], "standard", 10, (g) => setCounter(g, R, "clues", 2));
    expect(mods(r)).toEqual([-2]);
    expect(inv(gOf(r), R).clues).toBe(1);
    r = draw(["cultist"], "standard", 0, (g) => setCounter(g, R, "clues", 2));
    expect(inv(gOf(r), R).clues).toBe(2);
    r = draw(["cultist"], "hard", 0, (g) => setCounter(g, R, "clues", 2));
    expect(mods(r)).toEqual([-3]);
    expect(inv(gOf(r), R).clues).toBe(1);
  });

  it("tablet −4, a failure takes 1 horror; Hard always", () => {
    expect(inv(gOf(draw(["tablet"], "standard", 0)), R).horror).toBe(0);
    expect(inv(gOf(draw(["tablet"], "standard", 10)), R).horror).toBe(1);
    expect(inv(gOf(draw(["tablet"], "hard", 0)), R).horror).toBe(1);
  });

  it("elder thing −X, X the shroud of your location; Hard: a failure takes 1 damage", () => {
    const r = draw(["elderThing"], "standard", 0);
    expect(mods(r)).toEqual([-2]); // the Foyer's shroud
    expect(inv(gOf(draw(["elderThing"], "hard", 10)), R).damage).toBe(1);
  });
});

// ---------- 3.5 connections ----------
describe("connections", () => {
  it("the guide's map: the Courtyard to every room, Foyer–Ballroom, Foyer–Living Room, Ballroom–Dining Room, Living Room–Gallery", () => {
    const g = gOf(tlk());
    const links = (c: string) =>
      connections(g, loc(g, c))
        .map((id) => card(g, id).code)
        .sort();
    expect(links(COURTYARD)).toEqual([FOYER, BALLROOM, LIVING, GALLERY, DINING].sort());
    expect(links(FOYER)).toEqual([BALLROOM, LIVING, COURTYARD].sort());
    expect(links(BALLROOM)).toEqual([FOYER, COURTYARD, DINING].sort());
    expect(links(LIVING)).toEqual([FOYER, GALLERY, COURTYARD].sort());
    expect(links(GALLERY)).toEqual([LIVING, COURTYARD].sort());
    expect(links(DINING)).toEqual([BALLROOM, COURTYARD].sort());
  });
});

// ---------- 3.3 / 3.4 the Bystanders ----------
describe("the Bystanders", () => {
  const parley = (r: Result, name: RegExp) => toTurn(pick(r, name), R);

  it("a parley's success takes control of 1 of the clues; the last one flips it: interviewed, then back to a Bystander", () => {
    let r = tlk({
      bag: ["+1"],
      prep: (g) => (visit(g, CONSTANCE), setCounter(g, bystander(g, CONSTANCE).id, "clues", 2)),
    });
    r = parley(r, /Constance Dumaine: parley/);
    expect(lastTest(r)).toMatchObject({ skill: "intellect", difficulty: 3 });
    expect(inv(gOf(r), R).clues).toBe(1);
    r = parley(r, /Constance Dumaine: parley/);
    const g = gOf(r);
    expect(inv(g, R).clues).toBe(2);
    expect(rememberedFact.get(g, "interviewedConstance")).toBe(true);
    expect(
      r.events.some((e) => e.type === "storyShown") ||
        r.state.log.some((e) => e.type === "storyShown"),
    ).toBe(true);
    const b = bystander(g, CONSTANCE);
    expect(card(g, b.id)).toMatchObject({ code: CONSTANCE, zone: ZONE.Attached, clues: 0 });
    expect(options(r).some((o) => /Constance Dumaine: parley/.test(o))).toBe(false);
  });

  it("Jordan Perry only with 10 or more resources; Ishimaru Haruko only with 6 or more cards in hand", () => {
    const offeredWith = (code: string, prep: (game: GameContext) => void) =>
      options(tlk({ prep: (g) => (visit(g, code), prep(g)) })).some((o) => /parley/.test(o));
    expect(offeredWith(JORDAN, (g) => setCounter(g, R, "resources", 9))).toBe(false);
    expect(offeredWith(JORDAN, (g) => setCounter(g, R, "resources", 10))).toBe(true);
    expect(
      offeredWith("03078", (g) => {
        for (const h of inv(g, R).hand.slice()) moveCard(g, h, ZONE.Discard);
        for (let k = 0; k < 5; k++) hand(g, R, "01088");
      }),
    ).toBe(false);
    expect(
      offeredWith("03078", (g) => {
        for (let k = 0; k < 6; k++) hand(g, R, "01088");
      }),
    ).toBe(true);
  });

  it("Ashleigh Clarke: two actions, no test", () => {
    let r = tlk({ prep: (g) => visit(g, ASHLEIGH) });
    r = parley(r, /Ashleigh Clarke: parley/);
    expect(lastTest(r)).toBeNull();
    expect(inv(gOf(r), R)).toMatchObject({ clues: 1, actionsLeft: 1 });
  });

  it("the Ballroom and the Living Room react to a parley there", () => {
    const after = (room: string) => {
      let r = tlk({
        prep: (g) => {
          const b = bystander(g, ASHLEIGH);
          moveCard(g, b.id, ZONE.Attached, { location: loc(g, room) });
          visit(g, ASHLEIGH);
        },
      });
      r = until(pick(r, /Ashleigh Clarke: parley/), (x) => windowOf(x) === "parleyed");
      return toTurn(pick(r, room === BALLROOM ? /Ballroom/ : /Living Room/), R);
    };
    expect(inv(gOf(after(BALLROOM)), R).resources).toBe(5 + 2);
    const before = inv(gOf(tlk()), R).hand.length;
    expect(inv(gOf(after(LIVING)), R).hand.length).toBe(before + 1);
  });

  it("Dianne Devine: at her location no clue is taken by parley, nor discovered", () => {
    let r = tlk({
      bag: ["+1"],
      prep: (g) => {
        const at = visit(g, CONSTANCE);
        putEnemy(g, DIANNE, at);
        moveCard(g, findByCode(g, DIANNE, [ZONE.SetAside])!.id, ZONE.Removed);
        setCounter(g, at, "clues", 1);
      },
    });
    r = toTurn(pick(r, /Constance Dumaine: parley/), R);
    expect(inv(gOf(r), R).clues).toBe(0);
    r = toTurn(pick(r, /^Investigate/), R);
    expect(inv(gOf(r), R).clues).toBe(0);
  });
});

describe("acts and agendas", () => {
  it("03062's back: Dianne spawns at the Bystander with the fewest clues; the encounter discard pile is shuffled in", () => {
    let r = tlk({
      prep: (g) => {
        setCounter(g, bystander(g, JORDAN).id, "clues", 0);
        moveCard(g, pile(g, ZONE.EncounterDeck)[0], ZONE.EncounterDiscard);
      },
    });
    r = run(r, { t: STEP.AdvanceAgenda });
    const g = gOf(r);
    const dianne = enemies(g).find((e) => e.code === DIANNE)!;
    expect(dianne.location).toBe(bystander(g, JORDAN).location);
    expect(pile(g, ZONE.EncounterDiscard)).toEqual([]);
    expect(code(r, currentAgenda(g))).toBe("03063");
  });

  it("03081 Dianne: as the enemy phase begins she moves to the Bystander with the fewest clues", () => {
    let r = tlk({
      prep: (g) => {
        putEnemy(g, DIANNE, loc(g, FOYER));
        setCounter(g, bystander(g, ASHLEIGH).id, "clues", 0);
      },
    });
    r = run(
      mutate(r, (g) => setPhase(g, "enemy")),
      {
        t: STEP.Window,
        trigger: "phaseBegins",
        data: { phase: "enemy" },
      },
    );
    const g = gOf(r);
    expect(enemies(g).find((e) => e.code === DIANNE)!.location).toBe(
      bystander(g, ASHLEIGH).location,
    );
  });

  it("03063: at its threshold the doom in play goes and a Sickening Reality turns its Bystander", () => {
    let r = run(tlk({ invs: [R, D] }), { t: STEP.AdvanceAgenda });
    let at = "";
    r = mutate(r, (g) => {
      at = visit(g, CONSTANCE, D);
      setCounter(g, currentAgenda(g)!, "doom", 3);
      // only Constance's reality left beneath the scenario card
      const others = cardsBeneath(g, scenarioCard(g).id).filter(
        (id) => card(g, id).code !== "03065",
      );
      for (const id of others) moveCard(g, id, ZONE.Removed);
    });
    r = run(r, { t: STEP.CheckDoom });
    const g = gOf(r);
    expect(code(r, currentAgenda(g))).toBe("03063");
    expect(card(g, currentAgenda(g)!).doom).toBe(0);
    const constance = enemies(g).find((e) => e.code === "03065b")!;
    expect(constance.location).toBe(at);
    expect(findByCode(g, CONSTANCE, [ZONE.Attached])).toBeUndefined();
    expect(card(g, at).clues).toBe(3); // her 3 clues (two investigators)
    expect(inv(g, D).horror).toBe(1);
    // nothing left beneath: it advances, (→R3)
    r = mutate(r, (x) => setCounter(x, currentAgenda(x)!, "doom", 3));
    expect(toEnd(inject(r, () => {}, { t: STEP.CheckDoom })).state.resolution).toBe("R3");
  });

  it("03064: an eliminated investigator's clues go on the act; everyone gone ends the game: R1 if anyone resigned, else R2", () => {
    let r = tlk({
      invs: [R, D],
      prep: (g) => (setCounter(g, R, "clues", 3), setCounter(g, D, "clues", 2)),
    });
    r = toTurn(pick(r, "Foyer: resign"), D);
    expect(card(gOf(r), currentAct(gOf(r))!).clues).toBe(3);
    const end = toEnd(inject(r, () => {}, { t: STEP.Defeated, inv: D, by: "effect" }));
    expect(end.state.resolution).toBe("R1");
    expect(end.state.flags["count:hidden:tlkCluesOnAct"]).toBe(5);
    const lost = toEnd(inject(tlk(), () => {}, { t: STEP.Defeated, inv: R, by: "effect" }));
    expect(lost.state.resolution).toBe("R2");
  });

  it("the act can't be advanced by clues", () => {
    const r = tlk({ prep: (g) => setCounter(g, R, "clues", 10) });
    expect(options(r).some((o) => /Advance act/.test(o))).toBe(false);
  });
});

describe("locations", () => {
  it("03073 Gallery: ending your turn there, a failed willpower (2) leaves 1 of your clues", () => {
    let r = tlk({
      bag: ["-8"],
      prep: (g) => (
        visit(g, "03079"),
        placeInvestigator(g, R, loc(g, GALLERY)),
        reveal(g, loc(g, GALLERY)),
        setCounter(g, R, "clues", 1)
      ),
    });
    r = until(pick(r, "End turn"), (x) => x.state.phase !== "investigation");
    expect(inv(gOf(r), R).clues).toBe(0);
    expect(card(gOf(r), loc(gOf(r), GALLERY)).clues).toBeGreaterThanOrEqual(1);
  });

  it("03074 Courtyard: entering it discards the top encounter card; an enemy is drawn", () => {
    let r = tlk({
      prep: (g) => {
        const e = createCard(g, "01160", ZONE.Limbo);
        moveCard(g, e, ZONE.EncounterDeck, { top: true });
      },
    });
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), COURTYARD) });
    expect(enemies(gOf(r)).some((e) => e.code === "01160" && e.engagedWith === R)).toBe(true);
  });

  it("03075 Dining Room: heal 1 horror, then a skull takes 1 horror and places 1 doom there", () => {
    let r = tlk({
      bag: ["skull"],
      prep: (g) => (
        placeInvestigator(g, R, loc(g, DINING)),
        reveal(g, loc(g, DINING)),
        setCounter(g, R, "horror", 2)
      ),
    });
    r = toTurn(use(r, DINING), R);
    expect(inv(gOf(r), R).horror).toBe(2);
    expect(card(gOf(r), loc(gOf(r), DINING)).doom).toBe(1);
  });
});

describe("the Possessed", () => {
  it("03065b Constance: +3 fight while exhausted", () => {
    let id = "";
    const r = tlk({ prep: (g) => (id = putEnemy(g, "03065b", loc(g, DINING))) });
    expect(enemyStat(gOf(mutate(r, (x) => exhaust(x, id))), id, "fight")).toBe(4 + 3);
    expect(enemyStat(gOf(r), id, "fight")).toBe(4);
  });

  it("03066b Jordan: heals 1 damage as the enemy phase begins", () => {
    let id = "";
    let r = tlk({
      prep: (g) => {
        id = putEnemy(g, "03066b", loc(g, DINING));
        setCounter(g, id, "damage", 2);
        setPhase(g, "enemy");
      },
    });
    r = run(r, { t: STEP.Window, trigger: "phaseBegins", data: { phase: "enemy" } });
    expect(card(gOf(r), id).damage).toBe(1);
  });

  it("03067b Haruko: damage from an effect, not an attack, draws an encounter card", () => {
    let id = "";
    let r = tlk({ prep: (g) => (id = putEnemy(g, "03067b", loc(g, FOYER))) });
    const deck = pile(gOf(r), ZONE.EncounterDeck).length;
    r = run(r, { t: STEP.DamageEnemy, enemy: id, amount: 1, source: null, by: R });
    expect(pile(gOf(r), ZONE.EncounterDeck).length).toBe(deck - 1);
  });

  it("03068b Sebastien: his attacks can't be cancelled", () => {
    const g = gOf(tlk());
    expect(g.db.cards["03068b"].abilities[0].modifiers?.[0].flag).toBe("attacksCannotBeCancelled");
  });

  it("03069b Ashleigh: no upkeep draw at her location", () => {
    let r = tlk({ prep: (g) => void putEnemy(g, "03069b", loc(g, FOYER)) });
    const before = inv(gOf(r), R).hand.length;
    r = until(pick(r, "End turn"), (x) => x.state.phase === "mythos" || x.state.round === 2);
    expect(inv(gOf(r), R).hand.length).toBeLessThanOrEqual(before);
  });
});

describe("treacheries", () => {
  function draw(r: Result, c: string): Result {
    let id = "";
    const made = mutate(r, (g) => {
      id = createCard(g, c, ZONE.EncounterDeck);
    });
    return inject(made, () => {}, { t: STEP.DrawEncounter, inv: R, card: id });
  }

  it("03082 Fine Dining: a clue onto a Bystander, or 1 horror and 1 damage", () => {
    let r = draw(tlk({ prep: (g) => setCounter(g, R, "clues", 1) }), "03082");
    r = toTurn(
      pick(r, /Bystander/),
      (x) =>
        x.state.pending?.kind === "turn" || /Choose|choose/.test(x.state.pending?.prompt ?? ""),
    );
    r = toTurn(r, R);
    expect(inv(gOf(r), R).clues).toBe(0);
    r = toTurn(draw(tlk(), "03082"), R);
    expect(inv(gOf(r), R)).toMatchObject({ horror: 1, damage: 1 });
  });

  it("03083 Tough Crowd: parleys cost 1 more action until the end of the round", () => {
    let r = toTurn(draw(tlk({ prep: (g) => visit(g, ASHLEIGH) }), "03083"), R);
    expect(options(r).find((o) => /Ashleigh/.test(o))).toMatch(/\[3 actions\]/);
    r = run(r, { t: STEP.Window, trigger: "roundEnds", data: {} });
    expect(options(r).find((o) => /Ashleigh/.test(o))).toMatch(/\[2 actions\]/);
  });
});

// ---------- 3.6 resolutions ----------
describe("the end of the game", () => {
  it("records the VIPs interviewed and slain and the clues on the act", () => {
    const r = tlk({
      prep: (g) => {
        rememberedFact.set(g, "interviewedJordan", true);
        const s = createCard(g, "03068b", ZONE.Limbo);
        moveCard(g, s, ZONE.Victory);
      },
    });
    const end = toEnd(pick(r, "Foyer: resign"));
    expect(end.state.flags["log:vipsInterviewed:03077"]).toBe(true);
    expect(end.state.flags["log:vipsSlain:03068b"]).toBe(true);
  });
});

describe("the campaign", () => {
  function walk(c: CampaignState): CampaignState {
    for (let k = 0; k < 60 && c.flow.waiting; k++) {
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
  function finish(c: CampaignState, resolution: string, fn: (game: GameContext) => void) {
    const setup = scenarioSetup(db, c, 1);
    let r = toTurn(skipMulligans(createGame(db, setup)));
    r = inject(r, fn, { t: STEP.Resolution, id: resolution });
    return applyScenarioEnd(db, c, r.state);
  }
  /** at The Last King: Curtain Call played to R1 */
  const atLastKing = (invs = [R]) => {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-path-to-carcosa",
        difficulty: "standard",
        seed: 2,
        investigators: invs.map((code) => ({
          code,
          deckId: code === R ? "roland-starter" : "daisy-starter",
        })),
      }),
    );
    c = walk(finish(c, "R1", () => {}));
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-last-king" });
    return c;
  };

  it("R1: no prompt for the VIPs; 1 experience per 2 clues on the act split evenly; Interlude I next", () => {
    const c0 = atLastKing([R, D]);
    const xp0 = c0.investigators.map((i) => i.xp);
    const c = walk(
      finish(c0, "R1", (g) => {
        rememberedFact.set(g, "interviewedSebastien", true);
        setCounter(g, currentAct(g)!, "clues", 7);
      }),
    );
    expect(c.investigators.map((i, k) => i.xp - xp0[k])).toEqual([2, 1]);
    expect(hasEntry(c.log, "03079", "vipsInterviewed")).toBe(true);
    expect(JSON.stringify(c.flow)).not.toMatch(/vips_interviewed|check_vips_slain/);
    expect(c.flow.skipped).not.toContain("ptc-interlude1");
  });

  it("R2: the cultist, tablet and elder thing tokens become one of each; Interlude I is skipped", () => {
    const c0 = atLastKing();
    const c = walk(finish(c0, "R2", () => {}));
    for (const t of ["cultist", "tablet", "elderThing"] as const)
      expect(c.chaosBag.filter((x) => x === t).length).toBe(1);
    expect(c.flow.skipped).toContain("ptc-interlude1");
  });

  it("R3: the interviewed VIPs are crossed off", () => {
    const c = walk(
      finish(atLastKing(), "R3", (g) => rememberedFact.set(g, "interviewedJordan", true)),
    );
    expect(hasEntry(c.log, "03077", "vipsInterviewed")).toBe(false);
    expect(hasEntry(c.log, "03077", "vipsInterviewed", true)).toBe(true);
  });

  it("no resolution goes the way of R1 when anyone resigned, R2 otherwise", () => {
    const f = db.flows["the-path-to-carcosa"];
    const none = f.steps["the-last-king:none"];
    if (none.kind !== "branch") throw new Error("the-last-king:none is not a branch");
    expect(none.condition).toEqual({ kind: "anyResigned" });
    expect(none.then).toEqual(f.resolutions["the-last-king"].R1);
    expect(none.else).toEqual(f.resolutions["the-last-king"].R2);
  });
});
