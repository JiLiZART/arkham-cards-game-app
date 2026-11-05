/** Curtain Call (campaign-the-path-to-carcosa, group 2): setup, tokens, map, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, type Result } from "../index";
import { db, gOf, mutate, options, pick, putEnemy, skipMulligans } from "../kits/testkit";
import { game, hand, inject, lastTest, offered, toTurn, until, use } from "../kits/driver";
import { connections, enemies, findByCode } from "../queries";
import { handCount } from "../rules/investigators";
import {
  addCounter,
  card,
  currentAct,
  currentAgenda,
  deckCards,
  inv,
  placeInvestigator,
  reveal,
  setCode,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { campaignTokens, countEntry, rememberedFact } from "../world/flags";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry, logCount } from "../campaign/log";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { ContentDb, Step } from "../world/types";
import { scriptFnFor } from "../world/scripts";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002";
const LOLA = "03006";
const THEATRE = "03049";
const LOBBY = "03050";
const BALCONY = "03051";
const BACKSTAGE = "03052";
const MITPM = "03059";
const EMISSARY = "03060";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  prep?: (game: GameContext) => void;
}
const cc = ({ invs = [R], bag = ["0"], difficulty = "standard", prep }: Opts = {}) =>
  game({
    scenario: "curtain-call",
    investigators: invs,
    bag,
    prep,
    extra: { campaignId: "the-path-to-carcosa", campaignLog: {}, difficulty },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const at = (r: Result, who = R) => card(gOf(r), inv(gOf(r), who).location!).code;
/** a set-aside location into play, revealed */
const place = (game: GameContext, code: string) => {
  const c = findByCode(game, code, [ZONE.SetAside])!;
  moveCard(game, c.id, ZONE.Location);
  reveal(game, c.id);
  setCounter(game, c.id, "clues", 0);
  return c.id;
};
const goTo = (game: GameContext, code: string, who = R) => {
  const id = loc(game, code) ?? place(game, code);
  reveal(game, id);
  placeInvestigator(game, who, id);
  return id;
};
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const testOf = (skill: "willpower" | "agility" | "intellect", difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill, difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
const code = (r: Result, id: string | null | undefined) => (id ? card(gOf(r), id).code : null);
/** act 2 is the given version (the deck drew one at random) */
const version = (v: string) => (game: GameContext) => {
  setCode(game, deckCards(game, "act")[0], v);
};
/** act 1 advanced: a set-aside location and The Man in the Pallid Mask in play, act 2 current */
const toAct2 = (opts: Opts & { v?: string } = {}) =>
  run(cc({ ...opts, prep: (g) => (version(opts.v ?? "03047a")(g), opts.prep?.(g)) }), {
    t: STEP.AdvanceAct,
    by: "objective",
  });
const him = (r: Result) => enemies(gOf(r)).find((e) => e.code === MITPM);

// ---------- 2.1 setup ----------
describe("setup", () => {
  it("Theatre, Lobby, Balcony and Backstage in play; everyone at the Theatre, Lola Hayes at Backstage", () => {
    const r = cc({ invs: [R, LOLA] });
    const g = gOf(r);
    for (const c of [THEATRE, LOBBY, BALCONY, BACKSTAGE]) expect(loc(g, c)).toBeDefined();
    expect(at(r, R)).toBe(THEATRE);
    expect(at(r, LOLA)).toBe(BACKSTAGE);
  });

  it("set aside: the six Doorways, The Man in the Pallid Mask, Royal Emissary", () => {
    const g = gOf(cc());
    for (const c of ["03053", "03054", "03055", "03056", "03057", "03058", MITPM, EMISSARY])
      expect(findByCode(g, c)?.zone).toBe(ZONE.SetAside);
    expect(enemies(g)).toEqual([]);
  });

  it("act 2 is one of the three versions, drawn at random, the others out of the game", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = game({
        scenario: "curtain-call",
        investigators: [R],
        seed,
        extra: { campaignId: "the-path-to-carcosa", campaignLog: {} },
      });
      const g = gOf(r);
      const versions = ["03047a", "03047b", "03047c"].filter((c) => findByCode(g, c));
      expect(versions).toHaveLength(1);
      seen.add(versions[0]);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

// ---------- 2.2 tokens ----------
describe("chaos tokens", () => {
  const draw = (token: ChaosToken, difficulty: Difficulty, horror = 0, prep?: Opts["prep"]) =>
    run(
      cc({
        bag: [token],
        difficulty,
        prep: (g) => {
          setCounter(g, R, "horror", horror);
          prep?.(g);
        },
      }),
      testOf("willpower"),
    );

  it("Easy/Standard skull: −1, −3 with 3 or more horror on you", () => {
    for (const d of ["easy", "standard"] as const) {
      expect(mods(draw("skull", d, 2))).toEqual([-1]);
      expect(mods(draw("skull", d, 3))).toEqual([-3]);
    }
  });

  it("Hard/Expert skull: −X, X the horror on you, 1 with none", () => {
    for (const d of ["hard", "expert"] as const) {
      expect(mods(draw("skull", d, 2))).toEqual([-2]);
      expect(mods(draw("skull", d, 0))).toEqual([-1]);
    }
  });

  it("their function is the reference card's: Return to Curtain Call, with the same card, finds it", () => {
    const fake = { scripts: db.scripts, scenarios: { x: { card: "03043" } } } as unknown as Pick<
      ContentDb,
      "scripts" | "scenarios"
    >;
    expect(scriptFnFor(fake, "x", "x", "horrorHere")?.code).toBe("03043");
    expect(db.scenarios["curtain-call"].tokens.standard?.cultist?.onReveal).toEqual([
      { op: "script", fn: "horrorHere" },
    ]);
  });

  it("cultist, tablet, elder thing: −4 (−5 on Hard); horror on your location gives you 1, none places 1 there", () => {
    for (const t of ["cultist", "tablet", "elderThing"] as const) {
      const none = draw(t, "standard");
      expect(mods(none)).toEqual([-4]);
      expect(card(gOf(none), loc(gOf(none), THEATRE)!).horror).toBe(1);
      expect(inv(gOf(none), R).horror).toBe(0);
      const some = draw(t, "hard", 0, (g) => addCounter(g, loc(g, THEATRE)!, "horror", 1));
      expect(mods(some)).toEqual([-5]);
      expect(inv(gOf(some), R).horror).toBe(1);
    }
  });
});

// ---------- 2.5 connections ----------
describe("connections", () => {
  it("as the card scans print them: the Balcony drops one way into the Theatre; each Doorway to its hall", () => {
    const r = cc({
      prep: (g) => {
        for (const c of ["03053", "03054", "03055", "03056", "03057", "03058"]) place(g, c);
      },
    });
    const g = gOf(r);
    const links = (c: string) =>
      connections(g, loc(g, c)!)
        .map((id) => card(g, id).code)
        .sort();
    expect(links(THEATRE)).toEqual([LOBBY, BACKSTAGE].sort());
    expect(links(BALCONY)).toEqual([THEATRE, LOBBY].sort());
    expect(links(LOBBY)).toEqual([THEATRE, BALCONY, "03053", "03054", "03055"].sort());
    expect(links(BACKSTAGE)).toEqual([THEATRE, "03056", "03057", "03058"].sort());
    for (const c of ["03053", "03054", "03055"]) expect(links(c)).toEqual([LOBBY]);
    for (const c of ["03056", "03057", "03058"]) expect(links(c)).toEqual([BACKSTAGE]);
  });
});

// ---------- 2.3 / 2.4 the scenario's cards ----------
describe("acts and agendas", () => {
  it("03046 Awakening's back: a set-aside location into play, The Man in the Pallid Mask spawns there", () => {
    const r = toAct2();
    const m = him(r)!;
    expect(m).toBeDefined();
    expect(["03053", "03054", "03055", "03056", "03057", "03058"]).toContain(code(r, m.location));
    expect(code(r, currentAct(gOf(r)))).toBe("03047a");
  });

  it("act 2: defeating him advances it; he moves to the Lobby; 2 tokens for the campaign; A City Aflame burns the Theatre", () => {
    let r = toAct2();
    const bag = r.state.chaosBag.filter((t) => t === "cultist").length;
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    const g = gOf(r);
    expect(code(r, currentAct(g))).toBe("03048");
    expect(code(r, him(r)!.location)).toBe(LOBBY);
    expect(r.state.chaosBag.filter((t) => t === "cultist").length).toBe(bag + 2);
    expect(campaignTokens.get(g)).toEqual(["cultist", "cultist"]);
    expect(card(g, loc(g, THEATRE)!).horror).toBe(1);
    expect(countEntry.get(g, ["chasingTheStranger", "chasingTheStranger"])).toBe(1);
    expect(r.state.flags["log:hidden:ccaAddChaosToken"]).toBe(true);
  });

  it("The Path is Mine: horror where he was, tablets; The Shores of Hali: horror on each Private location, elder things", () => {
    let r = toAct2({ v: "03047b" });
    const from = him(r)!.location!;
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    expect(card(gOf(r), from).horror).toBe(1);
    expect(campaignTokens.get(gOf(r))).toEqual(["tablet", "tablet"]);
    r = toAct2({ v: "03047c" });
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    const g = gOf(r);
    const inPlayPrivate = ["03053", "03054", "03055", "03056", "03057", "03058"]
      .map((c) => findByCode(g, c, [ZONE.Location]))
      .filter((c) => !!c);
    expect(inPlayPrivate.length).toBeGreaterThan(0);
    for (const c of inPlayPrivate) expect(card(g, c!.id).horror).toBe(1);
    expect(card(g, loc(g, THEATRE)!).horror).toBe(0);
    expect(campaignTokens.get(g)).toEqual(["elderThing", "elderThing"]);
  });

  /** act 3 with the given spreading horror, Roland at the Theatre */
  const act3 = (v: string, bag: ChaosToken[] = ["0"]) => {
    let r = toAct2({ v, bag });
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    return r;
  };

  it("flames: entering a location with horror tests agility (3), once per round there", () => {
    let r = act3("03047a", ["-8"]);
    r = mutate(r, (g) => goTo(g, LOBBY));
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), THEATRE)! });
    expect(lastTest(r)?.difficulty).toBe(3);
    expect(inv(gOf(r), R).damage).toBe(1);
    r = mutate(r, (g) => placeInvestigator(g, R, loc(g, LOBBY)!));
    const tests = r.state.log.filter((e) => e.type === "testResult").length;
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), THEATRE)! });
    expect(r.state.log.filter((e) => e.type === "testResult").length).toBe(tests);
  });

  it("ooze: leaving a location with horror tests agility (4): 1 horror and 1 damage", () => {
    let r = act3("03047b", ["-8"]);
    r = mutate(r, (g) => addCounter(g, loc(g, THEATRE)!, "horror", 1));
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! });
    expect(lastTest(r)?.difficulty).toBe(4);
    expect(inv(gOf(r), R)).toMatchObject({ damage: 1, horror: 1 });
  });

  it("flood: a failed agility (2) as you would leave cancels the move", () => {
    let r = act3("03047c", ["-8"]);
    r = mutate(r, (g) => addCounter(g, loc(g, THEATRE)!, "horror", 1));
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! });
    expect(lastTest(r)?.difficulty).toBe(2);
    expect(at(r)).toBe(THEATRE);
    expect(inv(gOf(r), R).damage).toBe(1);
  });

  it("act 3: at the end of the round horror spreads to each location with none connected to one with horror", () => {
    let r = act3("03047a");
    r = run(r, { t: STEP.Window, trigger: "roundEnds", data: {} });
    const g = gOf(r);
    // the Theatre burns: its neighbours catch (the Balcony too, which drops into it); the doorway further on doesn't
    for (const c of [LOBBY, BACKSTAGE, BALCONY]) expect(card(g, loc(g, c)!).horror).toBe(1);
    const doorway = ["03053", "03054", "03055", "03056", "03057", "03058"]
      .map((c) => findByCode(g, c, [ZONE.Location]))
      .find((c) => !!c)!;
    expect(card(g, doorway.id).horror).toBe(0);
  });

  it("the Lobby's resign: on act 3, only while The Man in the Pallid Mask is not in play", () => {
    let r = act3("03047a");
    r = mutate(r, (g) => goTo(g, LOBBY));
    expect(options(r)).not.toContain("Lobby: resign");
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    expect(options(r)).toContain("Lobby: resign");
    expect(countEntry.get(gOf(r), ["chasingTheStranger", "chasingTheStranger"])).toBe(2);
  });

  it("03044's back: Royal Emissary spawns in the Theatre; 03045 Encore: defeating it resets the agenda deck with 3 doom", () => {
    let r = run(cc(), { t: STEP.AdvanceAgenda });
    const emissary = enemies(gOf(r)).find((e) => e.code === EMISSARY)!;
    expect(code(r, emissary.location)).toBe(THEATRE);
    expect(code(r, currentAgenda(gOf(r)))).toBe("03045");
    let ghoul = "";
    r = mutate(r, (g) => {
      ghoul = putEnemy(g, "01160", loc(g, BALCONY)!);
      setCounter(g, ghoul, "doom", 2);
      setCounter(g, currentAgenda(g)!, "doom", 4);
    });
    r = run(r, { t: STEP.DefeatEnemy, enemy: emissary.id, by: R });
    const g = gOf(r);
    expect(code(r, currentAgenda(g))).toBe("03044");
    expect(card(g, currentAgenda(g)!).doom).toBe(3);
    expect(card(g, ghoul).doom).toBe(0);
    expect(card(g, emissary.id).zone).toBe(ZONE.Victory);
    r = run(r, { t: STEP.AdvanceAgenda });
    expect(card(gOf(r), emissary.id).zone).toBe(ZONE.Enemy);
  });

  it("03045's back: each investigator takes 100 horror: no resolution", () => {
    let r = run(cc({ invs: [R, D] }), { t: STEP.AdvanceAgenda });
    r = until(
      inject(r, () => {}, { t: STEP.AdvanceAgenda }),
      () => false,
      300,
    );
    expect(r.state.resolution).toBe("none");
  });
});

describe("locations", () => {
  it("03050 Lobby: revealed, 2 Lobby Doorways into play; [action][action] draws 3 cards", () => {
    let r = cc();
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! });
    const g = gOf(r);
    const inPlay = ["03053", "03054", "03055"].filter((c) => findByCode(g, c, [ZONE.Location]));
    expect(inPlay).toHaveLength(2);
    const before = inv(g, R).hand.length;
    r = use(r, LOBBY, 1);
    expect(inv(gOf(r), R).hand.length).toBe(before + 3);
  });

  it("03052 Backstage: revealed, 2 Backstage Doorways; a hidden card counts as 3 there", () => {
    let r = cc();
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), BACKSTAGE)! });
    const g = gOf(r);
    expect(
      ["03056", "03057", "03058"].filter((c) => findByCode(g, c, [ZONE.Location])),
    ).toHaveLength(2);
    r = mutate(r, (x) => {
      const w = createCard(x, "03084a", ZONE.Limbo);
      moveCard(x, w, ZONE.Hand, { inv: R });
      x.s.world.tables.controller = { ...x.s.world.tables.controller, [w]: R };
    });
    expect(handCount(gOf(r), R)).toBe(inv(gOf(r), R).hand.length + 2);
  });

  it("03051 Balcony: moving from it to the Theatre takes 2 damage", () => {
    let r = cc({ prep: (g) => goTo(g, BALCONY) });
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), THEATRE)! });
    expect(inv(gOf(r), R).damage).toBe(2);
    r = cc({ prep: (g) => goTo(g, BALCONY) });
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! });
    expect(inv(gOf(r), R).damage).toBe(0);
  });

  it("03053 Lighting Box: cards in your hand cost 2 more there", () => {
    const cache = (where: string) =>
      options(
        cc({
          prep: (g) => {
            goTo(g, where);
            for (const h of inv(g, R).hand.slice()) moveCard(g, h, ZONE.Discard);
            hand(g, R, "01088"); // Emergency Cache, cost 0
            setCounter(g, R, "resources", 1);
          },
        }),
      ).some((o) => /Emergency Cache/.test(o));
    expect(cache("03053")).toBe(false);
    expect(cache(THEATRE)).toBe(true);
  });

  it("03054 Box Office: 5 resources once per game; you stole from the box office", () => {
    let r = cc({ prep: (g) => goTo(g, "03054") });
    r = use(r, "03054");
    expect(inv(gOf(r), R).resources).toBe(10);
    expect(rememberedFact.get(gOf(r), "stoleFromBoxOffice")).toBe(true);
    expect(options(r)).not.toContain(
      "Box Office: gain 5 resources (you stole from the box office)",
    );
  });

  it("03055 Green Room: investigate with +3 intellect, then discard your hand", () => {
    let r = cc({ prep: (g) => goTo(g, "03055") });
    r = toTurn(use(r, "03055"), R);
    expect(lastTest(r)?.total).toBe(3 + 3);
    expect(inv(gOf(r), R).hand).toEqual([]);
  });

  it("03056 Dressing Room: three actions heal 3 horror", () => {
    let r = cc({ prep: (g) => (goTo(g, "03056"), setCounter(g, R, "horror", 4)) });
    r = use(r, "03056");
    expect(inv(gOf(r), R).horror).toBe(1);
    expect(inv(gOf(r), R).actionsLeft).toBe(0);
  });

  it("03057 Rehearsal Room: succeeding by 2 or more investigating it takes 1 horror", () => {
    let r = cc({
      bag: ["+1"],
      prep: (g) => (goTo(g, "03057"), addCounter(g, loc(g, "03057")!, "clues", 1)),
    });
    r = toTurn(pick(r, /^Investigate/), R);
    expect(inv(gOf(r), R).horror).toBe(1);
  });

  it("03058 Trap Room: revealed, a Swarm of Rats engages you (2 with 3 investigators)", () => {
    const rats = (invs: string[]) => {
      let r = cc({
        invs,
        prep: (g) => {
          const t = findByCode(g, "03058", [ZONE.SetAside])!;
          moveCard(g, t.id, ZONE.Location);
        },
      });
      r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), "03058")! });
      return enemies(gOf(r)).filter((e) => e.code === "01159" && e.engagedWith === R).length;
    };
    expect(rats([R])).toBe(1);
    expect(rats([R, D, "01003"])).toBe(2);
  });
});

describe("enemies", () => {
  it("03059 The Man in the Pallid Mask: spawns farthest from the investigators; investigated (+2 shroud) he is defeated", () => {
    let r = cc({
      bag: ["+1"],
      prep: (g) => {
        const m = findByCode(g, MITPM, [ZONE.SetAside])!;
        moveCard(g, m.id, ZONE.Enemy, { location: loc(g, THEATRE)! });
      },
    });
    r = toTurn(pick(r, /Pallid Mask: investigate/), R);
    expect(lastTest(r)?.difficulty).toBe(2 + 2);
    expect(him(r)).toBeUndefined();
    expect(countEntry.get(gOf(r), ["chasingTheStranger", "chasingTheStranger"])).toBe(1);
    const g = gOf(cc());
    expect(g.db.cards[MITPM].spawn).toEqual({ farthest: true, to: "investigators" });
  });

  it("03060 Royal Emissary: at the end of the enemy phase each investigator at or next to it takes 1 horror", () => {
    let r = cc({
      invs: [R, D],
      prep: (g) => {
        goTo(g, BALCONY, D);
        const e = findByCode(g, EMISSARY, [ZONE.SetAside])!;
        moveCard(g, e.id, ZONE.Enemy, { location: loc(g, BACKSTAGE)! });
      },
    });
    r = run(r, { t: STEP.Window, trigger: "enemyPhaseEnds", data: {} });
    expect(inv(gOf(r), R).horror).toBe(1);
    expect(inv(gOf(r), D).horror).toBe(0);
  });
});

// ---------- 2.6 resolutions ----------
describe("the resolutions, played", () => {
  const act3Gone = () => {
    let r = toAct2();
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    return mutate(r, (g) => goTo(g, LOBBY));
  };

  it("act 3: resigned at the Lobby, the investigators decide (→R1) or (→R2)", () => {
    const decide = () => until(pick(act3Gone(), "Lobby: resign"), offered(/warn the police/));
    expect(options(decide())).toHaveLength(2);
    expect(until(pick(decide(), /warn the police/), () => false).state.resolution).toBe("R1");
    expect(until(pick(decide(), /solve this mystery/), () => false).state.resolution).toBe("R2");
  });

  it("everyone defeated: no resolution, the Stranger's defeats counted; a resolution counts none", () => {
    let r = toAct2();
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    const lost = until(
      inject(r, () => {}, { t: STEP.Defeated, inv: R, by: "effect" }),
      () => false,
    );
    expect(lost.state.resolution).toBe("none");
    expect(lost.state.flags["count:chasingTheStranger:chasingTheStranger"]).toBe(1);
    const won = until(
      pick(until(pick(act3Gone(), "Lobby: resign"), offered(/warn/)), /warn/),
      () => false,
    );
    expect(won.state.flags["count:chasingTheStranger:chasingTheStranger"]).toBeUndefined();
  });

  it("whoever stole from the box office is told to the campaign log", () => {
    const r = cc({ prep: (g) => rememberedFact.set(g, "stoleFromBoxOffice", true) });
    const end = until(
      inject(r, () => {}, { t: STEP.Defeated, inv: R, by: "effect" }),
      () => false,
    );
    expect(end.state.flags["log:hidden:stoleFromBoxOffice"]).toBe(true);
  });
});

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
              : st.kind === "counter"
                ? 0
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
  const begin = () =>
    walk(
      startCampaign(db, {
        campaignId: "the-path-to-carcosa",
        difficulty: "standard",
        seed: 2,
        investigators: [{ code: R, deckId: "roland-starter" }],
      }),
    );

  it("no resolution: the Stranger is on to you, a tally per defeat, no question about tokens", () => {
    let c = begin();
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "curtain-call" });
    const asked: string[] = [];
    c = finish(c, "none", (g) => {
      countEntry.set(g, ["chasingTheStranger", "chasingTheStranger"], 1);
      campaignTokens.set(g, ["tablet", "tablet"]);
    });
    for (let k = 0; k < 50 && c.flow.waiting && c.flow.waiting.step.kind !== "play"; k++) {
      asked.push(c.flow.waiting.id);
      c = walk(c);
      if (c.flow.waiting?.step.kind !== "play") c = advance(db, c, "continue");
    }
    expect(asked.filter((id) => /mid_game|chasing_the_stranger$/.test(id))).toEqual([]);
    expect(hasEntry(c.log, "strangerIsOnToYou")).toBe(true);
    expect(logCount(c.log, "chasingTheStranger", "chasingTheStranger")).toBe(1);
    expect(c.chaosBag.filter((t) => t === "tablet").length).toBe(
      (db.campaigns["the-path-to-carcosa"].chaosBags.standard ?? []).filter((t) => t === "tablet")
        .length + 2,
    );
    expect(c.investigators[0].deck).toContain(MITPM);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-last-king" });
  });

  it("R1: tried to warn the police, a Conviction, two tallies; the police are suspicious of whoever stole", () => {
    let c = walk(finish(begin(), "R1", (g) => rememberedFact.set(g, "stoleFromBoxOffice", true)));
    expect(hasEntry(c.log, "triedToWarnPolice")).toBe(true);
    expect(hasEntry(c.log, "policeAreSuspicious")).toBe(true);
    expect(logCount(c.log, "conviction", "conviction")).toBe(1);
    expect(logCount(c.log, "chasingTheStranger", "chasingTheStranger")).toBe(2);
    c = walk(finish(begin(), "R1", () => {}));
    expect(hasEntry(c.log, "policeAreSuspicious")).toBe(false);
  });

  it("R2: chose not to go to the police, a Doubt", () => {
    const c = walk(finish(begin(), "R2", () => {}));
    expect(hasEntry(c.log, "choseNotToWarnPolice")).toBe(true);
    expect(logCount(c.log, "doubt", "doubt")).toBe(1);
  });
});
