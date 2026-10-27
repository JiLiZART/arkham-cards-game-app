import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content/index";
import { createGame, dispatch, run, type Result } from "./engine";
import { next } from "./rng";
import { db, gOf, mutate, options, pick, putEnemy, skipMulligans, start } from "./testkit";
import { card, cardsIn, findByCode, inv, moveCard, type G } from "./core";
import { neutral, toTurn } from "./natkit";
import { applyScenarioEnd, scenarioSetup, startCampaign, type CampaignState } from "./campaign";
import { advance } from "./flow";
import { hasEntry } from "./campaignLog";

beforeAll(async () => {
  await loadPack("core_2026");
});

const CAMPAIGN = { campaignId: "brethren-of-ash" };

/** random legal choices to the end of the scenario: the engine must never throw or dead-lock */
function randomPlay(
  scenario: string,
  invs: string[],
  seed: number,
  log: Record<string, unknown> = {},
  maxSteps = 4000,
): Result {
  let r = start(scenario, invs, seed, { ...CAMPAIGN, campaignLog: log });
  const rng = { rng: seed * 7919 };
  let steps = 0;
  while (r.state.pending && steps++ < maxSteps) {
    const p = r.state.pending;
    const end = p.options.find((o) => o.label === "End turn");
    const o = end && next(rng) < 0.3 ? end : p.options[Math.floor(next(rng) * p.options.length)];
    const res = dispatch(db, r.state, { type: "choose", inv: p.inv, option: o.id });
    if (res.error) throw new Error(res.error);
    r = res;
  }
  return r;
}

describe("Brethren of Ash, random play", () => {
  const runs: [string, string[], Record<string, unknown>][] = [
    ["spreading-flames", ["01001"], {}],
    ["spreading-flames", ["01002", "01003"], {}],
    ["spreading-flames", ["01004", "01005", "01001", "01002"], {}],
    ["smoke-and-mirrors", ["01001"], { miskatonic_university_burned: true }],
    ["smoke-and-mirrors", ["01002", "01003"], {}],
    ["smoke-and-mirrors", ["01004", "01005", "01001"], {}],
    ["queen-of-ash", ["01001"], { discovered_the_cults_whereabouts: true }],
    [
      "queen-of-ash",
      ["01002", "01003"],
      { stirred_up_trouble: true, scoured_arkham_for_answers: true },
    ],
    ["queen-of-ash", ["01004", "01005", "01001", "01002"], { killed_the_servant_of_flame: true }],
  ];
  for (const [scenario, invs, log] of runs)
    for (const seed of [1, 2, 3])
      it(`${scenario} ${invs.join("+")} seed ${seed}`, () => {
        const r = randomPlay(scenario, invs, seed, log);
        expect(r.state.phase === "ended" || r.state.pending).toBeTruthy();
      });
});

// ---------- the scenarios, act by act ----------

const R = "01001";
const D = "01002";
const codesIn = (r: Result, zone: string) =>
  Object.values(r.state.cards)
    .filter((c) => c.zone === zone)
    .map((c) => c.code);
const count = (r: Result, code: string, zone: string) =>
  codesIn(r, zone).filter((c) => c === code).length;
const actCode = (r: Result) => (r.state.act ? r.state.cards[r.state.act].code : null);
const agendaCode = (r: Result) => (r.state.agenda ? r.state.cards[r.state.agenda].code : null);
/** the scenario at its first turn, with a neutral bag */
const begin = (
  scenario: string,
  invs: string[],
  log: Record<string, unknown> = {},
  bag: string[] = ["0"],
) =>
  toTurn(
    skipMulligans(
      start(scenario, invs, 1, { ...CAMPAIGN, campaignLog: log, chaosBag: bag as never }),
    ),
  );
/** change the state, then resolve `steps` before the choice that was pending is asked again */
function inject(r: Result, fn: (g: G) => void, ...steps: G["s"]["queue"]): Result {
  const s = structuredClone(r.state);
  const g: G = { s, db, events: [] };
  fn(g);
  if (s.pending) {
    s.queue.push({ ...s.pending.step, choice: undefined });
    s.pending = null;
  }
  s.queue.push(...steps.reverse());
  run(g);
  return { state: s, events: g.events };
}
/** jump the act deck forward to `code` */
function toAct(g: G, code: string) {
  while (g.s.act && card(g, g.s.act).code !== code) {
    moveCard(g, g.s.act, "removed");
    const nextAct = g.s.actDeck.shift();
    if (nextAct) moveCard(g, nextAct, "act");
  }
}
/** answer until the predicate holds or a turn comes */
const until = (r: Result, stop: (r: Result) => boolean) => toTurn(r, stop);
/** end every turn until the round ends and the next turn begins */
function endRound(r: Result, stop: (r: Result) => boolean = () => false): Result {
  const round = r.state.round;
  for (let k = 0; k < 200 && r.state.pending && !stop(r); k++) {
    if (r.state.round > round && r.state.pending.kind === "turn") break;
    const p = r.state.pending;
    r = p.kind === "turn" ? pick(r, "End turn") : neutral(r);
  }
  return r;
}

describe("Spreading Flames", () => {
  it("sets up in your friend's room with Fire!, Armitage and the Servant set aside", () => {
    const r = begin("spreading-flames", [R]);
    expect(codesIn(r, "location")).toEqual(["12113"]);
    expect(count(r, "12129", "setAside")).toBe(5);
    expect(codesIn(r, "setAside")).toEqual(expect.arrayContaining(["12115", "12114"]));
    expect(codesIn(r, "encounterDeck")).not.toContain("12129");
  });

  it("act 1 advances at the end of the round: the dorms and the quad, the Servant, Fire!", () => {
    let r = begin("spreading-flames", [R]);
    r = mutate(r, (g) => {
      inv(g, R).clues = 2;
    });
    r = endRound(r, (x) => options(x).some((o) => /^Advance act/.test(o)));
    r = until(pick(r, /^Advance act/), () => false);
    expect(actCode(r)).toBe("12110");
    expect(codesIn(r, "location")).toEqual(expect.arrayContaining(["12113", "12116", "12117"]));
    const servant = Object.values(r.state.cards).find((c) => c.code === "12114")!;
    expect(servant.zone).toBe("enemy");
    expect(r.state.cards[servant.location!].code).toBe("12117");
    expect(count(r, "12129", "attached")).toBe(1);
    expect(count(r, "12129", "encounterDiscard")).toBe(4);
  });

  it("act 2 advances when everyone is at the quad: the room goes, the campus opens", () => {
    let r = begin("spreading-flames", [R]);
    r = mutate(r, (g) => {
      inv(g, R).clues = 2;
    });
    r = until(
      pick(
        endRound(r, (x) => options(x).some((o) => /^Advance act/.test(o))),
        /^Advance act/,
      ),
      () => false,
    );
    r = inject(
      r,
      (g) => {
        inv(g, R).location = findByCode(g, "12116", ["location"])!.id;
      },
      { t: "CheckObjectives" },
    );
    r = toTurn(r);
    expect(actCode(r)).toBe("12111");
    expect(codesIn(r, "location")).not.toContain("12113");
    expect(codesIn(r, "location")).toEqual(expect.arrayContaining(["12118", "12119", "12120"]));
    expect(Object.values(r.state.cards).find((c) => c.code === "12114")!.zone).toBe("setAside");
  });

  it("act 3 advances from Orne Library: Armitage joins, the Servant returns, Fire! for the lead", () => {
    let r = begin("spreading-flames", [R]);
    r = mutate(r, (g) => {
      for (const code of ["12116", "12120"]) {
        const l = Object.values(g.s.cards).find((c) => c.code === code)!;
        moveCard(g, l.id, "location");
        l.revealed = true;
      }
      toAct(g, "12111");
      inv(g, R).location = findByCode(g, "12120", ["location"])!.id;
      inv(g, R).clues = 3;
    });
    r = endRound(r, (x) => options(x).some((o) => /^Advance act/.test(o)));
    r = toTurn(pick(r, /^Advance act/));
    expect(actCode(r)).toBe("12112");
    const armitage = Object.values(r.state.cards).find((c) => c.code === "12115")!;
    expect(armitage).toMatchObject({ zone: "play", controller: R });
    expect(Object.values(r.state.cards).find((c) => c.code === "12114")!.zone).toBe("enemy");
  });

  it("act 4 ends the scenario (R1) when the Servant is defeated", () => {
    let r = begin("spreading-flames", [R]);
    r = mutate(r, (g) => {
      toAct(g, "12112");
      const s = Object.values(g.s.cards).find((c) => c.code === "12114")!;
      moveCard(g, s.id, "enemy", { location: inv(g, R).location });
      s.damage = 4;
      s.engagedWith = R;
    });
    r = until(pick(r, /^Fight Servant of Flame/), (x) => x.state.phase === "ended");
    expect(r.state.log.some((e) => e.type === "enemyDefeated")).toBe(true);
    expect(r.state.resolution).toBe("R1");
  });

  it("Lit Up puts four set-aside Fire! in the encounter discard; Bystanders are doomed", () => {
    let r = begin("spreading-flames", [R]);
    r = inject(
      r,
      (g) => {
        card(g, g.s.agenda!).doom = 3;
      },
      { t: "CheckDoom" },
    );
    r = toTurn(r);
    expect(agendaCode(r)).toBe("12107");
    r = toTurn(inject(r, () => {}, { t: "AdvanceAgenda" }));
    expect(count(r, "12129", "encounterDiscard")).toBe(4);
    let bystander = "";
    r = mutate(r, (g) => {
      bystander = putEnemy(g, "12123", inv(g, R).location!, R);
    });
    r = toTurn(inject(r, () => {}, { t: "DefeatEnemy", enemy: bystander, by: R }));
    expect(card(gOf(r), r.state.agenda!).doom).toBe(1);
  });
});

describe("Smoke and Mirrors", () => {
  it("deals the suspects beneath six locations and sets the harbinger aside", () => {
    const r = begin("smoke-and-mirrors", [R, D]);
    const beneath = Object.keys(r.state.flags).filter((k) => k.startsWith("beneath:"));
    expect(beneath).toHaveLength(6);
    expect(r.state.flags.harbinger).toBeTruthy();
    expect(codesIn(r, "encounterDeck").some((c) => /^1213[89]$|^1214[0-4]$/.test(c))).toBe(false);
    expect(card(gOf(r), r.state.agenda!).doom).toBe(3); // 1 per investigator, 1 for the quiet campus
    expect(r.state.chaosBag.filter((t) => t === "cultist")).toHaveLength(2);
  });

  it("the act draws the suspect beneath your location; a codex entry with enough leads puts them beneath the act", () => {
    let r = begin("smoke-and-mirrors", [R], {}, ["+1"]);
    r = mutate(r, (g) => {
      // Northside, with Cornelia Akely beneath it
      const north = findByCode(g, "12149", ["location"])!;
      north.revealed = true;
      inv(g, R).location = north.id;
      inv(g, R).clues = 2;
      g.s.chaosBag = ["+1"];
      const cornelia = Object.values(g.s.cards).find((c) => c.code === "12140")!;
      for (const k of Object.keys(g.s.flags)) if (g.s.flags[k] === cornelia.id) delete g.s.flags[k];
      if (g.s.flags.harbinger === cornelia.id) g.s.flags.harbinger = "none";
      moveCard(g, cornelia.id, "setAside");
      g.s.flags[`beneath:${north.id}`] = cornelia.id;
    });
    r = toTurn(pick(r, /^Augurs of Flame/));
    const cornelia = Object.values(r.state.cards).find((c) => c.code === "12140")!;
    expect(cornelia.zone).toBe("enemy");
    r = until(pick(r, /^Evade Cornelia/), (x) => options(x).some((o) => /^Cornelia Akely/.test(o)));
    r = toTurn(pick(r, /^Cornelia Akely/));
    expect(r.state.flags.underAct).toEqual([cornelia.id]);
    expect(r.state.log.some((e) => e.type === "codex")).toBe(true);
  });

  it("records the harbinger and what the investigators found for the campaign log", () => {
    let r = begin("smoke-and-mirrors", [R]);
    r = inject(r, () => {}, { t: "Resolution", id: "R1" });
    const h = r.state.cards[r.state.flags.harbinger as string].code;
    const names: Record<string, string> = {
      "12139": "david",
      "12140": "cornelia",
      "12141": "naomi",
      "12142": "earl",
      "12143": "abigail",
      "12144": "margaret",
    };
    expect(r.state.flags[`log:campaign_notes:${names[h]}_harbinger`]).toBe(true);
    expect(r.state.flags["log:campaign_notes:discovered_the_cults_whereabouts"]).toBe(true);
  });
});

describe("Queen of Ash", () => {
  it("sets up the sewers and the cistern; the bag grows by the difficulty", () => {
    const r = begin("queen-of-ash", [R, D], { scoured_arkham_for_answers: true });
    expect(codesIn(r, "location").sort()).toEqual(
      ["12174", "12182", "12183", "12184", "12185", "12186", "12187"].sort(),
    );
    expect(codesIn(r, "setAside")).toEqual(
      expect.arrayContaining(["12175", "12179", "12179b", "12180"]),
    );
    expect(r.state.invs[R].clues).toBe(1);
    expect(r.state.chaosBag.slice(-2)).toEqual(["elderThing", "tablet"]);
  });

  it("the cistern costs clues to enter; entering it advances the act and Elokoss stirs", () => {
    let r = begin("queen-of-ash", [R]);
    r = mutate(r, (g) => {
      const tunnel = findByCode(g, "12185", ["location"])!;
      tunnel.revealed = true;
      inv(g, R).location = tunnel.id;
    });
    expect(options(r).some((o) => /^Move to Underground Cistern/.test(o))).toBe(false);
    r = mutate(r, (g) => {
      inv(g, R).clues = 3;
    });
    r = until(pick(r, /^Move to Underground Cistern/), () => false);
    expect(r.state.invs[R].clues).toBe(0);
    expect(actCode(r)).toBe("12173");
    expect(Object.values(r.state.cards).find((c) => c.code === "12179")!.zone).toBe("enemy");
    expect(codesIn(r, "location")).toContain("12175");
  });

  it("Elokoss defeated ends the campaign's last scenario (R1)", () => {
    let r = begin("queen-of-ash", [R]);
    let e = "";
    r = mutate(r, (g) => {
      e = putEnemy(g, "12179", inv(g, R).location!, R);
    });
    r = toTurn(
      inject(r, () => {}, { t: "DefeatEnemy", enemy: e, by: R }, { t: "CheckObjectives" }),
    );
    expect(r.state.resolution).toBe("R1");
  });

  it("the Mother Arrives in act 1: Elokoss spawns on her other side, agenda 3 is the act and the agenda", () => {
    let r = begin("queen-of-ash", [R]);
    r = inject(
      r,
      (g) => {
        moveCard(g, g.s.agenda!, "removed");
        moveCard(g, g.s.agendaDeck.shift()!, "agenda");
      },
      { t: "AdvanceAgenda" },
    );
    r = toTurn(r);
    expect(agendaCode(r)).toBe("12171");
    expect(r.state.act).toBe(null);
    expect(Object.values(r.state.cards).find((c) => c.code === "12179b")!.zone).toBe("enemy");
    expect(cardsIn(gOf(r), "enemy").length).toBeGreaterThan(0);
  });
});

// ---------- the campaign, scenario to scenario ----------

/** answer the flow's prompts: read on, play, investigator choices (the first), chooseOne by `choose` */
function walk(c: CampaignState, choose: Record<string, string> = {}): CampaignState {
  for (let k = 0; k < 50 && c.flow.waiting; k++) {
    const w = c.flow.waiting;
    const st = w.step;
    if (st.kind === "play") break;
    const value =
      st.kind === "chooseOne"
        ? (choose[w.id] ?? st.choices[0].id)
        : st.kind === "investigatorChoice" || st.kind === "investigator"
          ? c.investigators[0].code
          : st.kind === "upgradeDecks" || st.kind === "continue"
            ? "continue"
            : null;
    c = advance(db, c, value);
  }
  return c;
}

/** end the campaign's current scenario at a resolution, with `fn` changing the game first */
function finish(
  c: CampaignState,
  resolution: string,
  fn: (g: G) => void = () => {},
): CampaignState {
  const setup = scenarioSetup(db, c, 1);
  let r = toTurn(skipMulligans(createGame(db, setup)));
  r = inject(r, fn, { t: "Resolution", id: resolution });
  return applyScenarioEnd(db, c, r.state);
}

describe("Brethren of Ash, the campaign", () => {
  it("plays through: the Armitage bearer, the burned university, the harbinger, the last scenario's setup", () => {
    let c = startCampaign(db, {
      campaignId: "brethren-of-ash",
      difficulty: "standard",
      seed: 2,
      investigators: [
        { code: R, deckId: "roland-starter" },
        { code: D, deckId: "daisy-starter" },
      ],
    });
    c = walk(c);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "spreading-flames" });
    c = walk(finish(c, "R1"), { "sf:stayOrGo": "go" });
    expect(c.investigators[0].deck).toContain("12115");
    expect(hasEntry(c.log, "miskatonic_university_burned")).toBe(true);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "smoke-and-mirrors" });
    // the burned university is the one in play
    const sm = createGame(db, scenarioSetup(db, c, 1));
    expect(codesIn(sm, "location")).toContain("12155");
    // Dr. Armitage comes into play with his bearer
    expect(Object.values(sm.state.cards).find((x) => x.code === "12115")!.zone).toBe("play");
    c = walk(finish(c, "R1"));
    expect(c.chaosBag.filter((t) => t === "cultist")).toHaveLength(2);
    expect(hasEntry(c.log, "discovered_the_cults_whereabouts")).toBe(true);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "queen-of-ash" });
    const qa = createGame(db, scenarioSetup(db, c, 1));
    // the Servant of Flame was not killed: set aside
    expect(Object.values(qa.state.cards).find((x) => x.code === "12180")!.zone).toBe("setAside");
    c = walk(finish(c, "R2"));
    expect(c.flow.waiting).toBeNull();
    expect(c.investigators.every((i) => i.physicalTrauma >= 2)).toBe(true);
  });
});
