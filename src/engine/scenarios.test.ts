import { beforeAll, describe, expect, it } from "vitest";
import { loadCampaign, loadPack } from "../content";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "./campaign";
import { flatLog, record } from "./campaignLog";
import { card, createCard, def, enemyStat, findByCode, inv, locationByName, moveCard } from "./core";
import { createGame, type Result } from "./engine";
import { finalResolution } from "./rules/scenario";
import { commitDone, db, gOf, mutate, pick, skipMulligans, start } from "./testkit";

const ROLAND = "01001";

/** answer every non-turn choice with a neutral option until it's someone's turn (or the game ends) */
function settle(r: Result, prefer: RegExp = /^(Pass|done|Keep hand|Done|Not now)$/): Result {
  for (let k = 0; k < 200 && r.state.pending && r.state.pending.kind !== "turn"; k++) {
    const p = r.state.pending;
    const o = p.options.find((x) => prefer.test(x.label) || prefer.test(x.id)) ?? p.options[0];
    r = pick(r, o.id);
  }
  return r;
}

const act = (r: Result) => (r.state.act ? def(gOf(r), r.state.act).name : null);

describe("The Gathering", () => {
  it("plays through to Resolution 1", () => {
    let r = skipMulligans(start("the-gathering", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = mutate(r, (g) => {
      inv(g, ROLAND).clues = 2;
    });
    r = pick(r, /^Advance act/);
    expect(act(r)).toBe("The Barrier");
    r = mutate(r, (g) => {
      inv(g, ROLAND).clues = 3;
    });
    r = pick(r, "End turn");
    r = settle(r, /Spend 3 clues and advance|^(Pass|done|Done)$/);
    expect(act(r)).toBe("What Have You Done?");
    const g0 = gOf(r);
    expect(card(g0, findByCode(g0, "01115")!.id).revealed).toBe(true);
    const priest = findByCode(g0, "01116", ["enemy"])!;
    expect(def(g0, priest.location!).name).toBe("Hallway");
    expect(findByCode(g0, "01117")!.zone).toBe("attached"); // Lita waits in the Parlor
    r = mutate(r, (g) => {
      card(g, priest.id).damage = enemyStat(g, priest.id, "health") - 1;
      card(g, priest.id).engagedWith = ROLAND;
      inv(g, ROLAND).location = priest.location;
    });
    r = pick(r, /^Fight Ghoul Priest/);
    r = commitDone(r);
    expect(r.state.pending?.prompt).toMatch(/Defending the Home/);
    r = settle(r, /Burn it down|^(Pass|done|Done)$/);
    expect(r.state.log.some((e) => e.type === "actAdvance" && /Defending the Home/.test(e.text))).toBe(true);
    expect(r.state.phase).toBe("ended");
    expect(r.state.resolution).toBe("R1");
  });

  it("agenda 3 at act 1 sends the investigators to Resolution 3", () => {
    let r = skipMulligans(start("the-gathering", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = mutate(r, (g) => {
      for (const id of g.s.agendaDeck.slice(0, 1)) moveCard(g, id, "removed");
      moveCard(g, g.s.agenda!, "removed");
      moveCard(g, g.s.agendaDeck[0], "agenda");
      card(g, g.s.agenda!).doom = 9;
    });
    r = pick(r, "End turn");
    r = settle(r);
    expect(r.state.resolution).toBe("R3");
  });
});

describe("The Midnight Masks", () => {
  it("parley with Victoria Devereux adds her to the victory display", () => {
    let r = skipMulligans(start("the-midnight-masks", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    let victoria = "";
    r = mutate(r, (g) => {
      const north = locationByName(g, "Northside")!;
      inv(g, ROLAND).location = north.id;
      inv(g, ROLAND).resources = 5;
      victoria = g.s.sideDecks.cultists.find((id) => card(g, id).code === "01140")!;
      moveCard(g, victoria, "enemy", { location: north.id });
      card(g, victoria).exhausted = true;
    });
    r = pick(r, /Victoria Devereux: spend 5 resources/);
    expect(r.state.cards[victoria].zone).toBe("victory");
    expect(r.state.invs[ROLAND].resources).toBe(0);
  });

  it("six unique cultists in the victory display → Resolution 1, recorded in the campaign log", () => {
    const c = startCampaign(db, { campaignId: "night-of-the-zealot", difficulty: "standard", seed: 4, investigators: [{ code: ROLAND, deckId: "roland-starter" }] });
    // the campaign as it stands on the way to The Midnight Masks, the house still standing
    const c2 = { ...c, log: record(c.log, "houseStanding"), flow: { ...c.flow, play: "the-midnight-masks", pos: 1 } };
    let r = skipMulligans(createGame(db, scenarioSetup(db, c2, 3)));
    r = settle(r);
    r = mutate(r, (g) => {
      for (const code of ["01137", "01138", "01139", "01140", "01141", "01121b"]) moveCard(g, findByCode(g, code)!.id, "victory");
    });
    r = pick(r, "Gain 1 resource");
    expect(r.state.resolution).toBe("R1");
    const next = applyScenarioEnd(db, c2, r.state);
    expect((flatLog(next.log).cultistsInterrogated as string[]).sort()).toEqual(["01121b", "01137", "01138", "01139", "01140", "01141"]);
    expect(flatLog(next.log).cultistsGotAway).toEqual([]);
  });

  it("the second agenda advancing ends the scenario at midnight (Resolution 2)", () => {
    let r = skipMulligans(start("the-midnight-masks", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = mutate(r, (g) => {
      moveCard(g, g.s.agenda!, "removed");
      moveCard(g, g.s.agendaDeck[0], "agenda");
      card(g, g.s.agenda!).doom = 7;
    });
    r = pick(r, "End turn");
    r = settle(r);
    expect(r.state.resolution).toBe("R2");
  });

  it("the first agenda advancing spawns The Masked Hunter", () => {
    let r = skipMulligans(start("the-midnight-masks", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = mutate(r, (g) => {
      card(g, g.s.agenda!).doom = 5;
    });
    r = pick(r, "End turn");
    r = settle(r);
    const hunter = findByCode(gOf(r), "01121b")!;
    expect(hunter.zone).toBe("enemy");
    expect(hunter.engagedWith).toBe(ROLAND);
    expect(enemyStat(gOf(r), hunter.id, "health")).toBe(6);
  });
});

describe("The Devourer Below", () => {
  const escaped = ["01137", "01139"];

  it("acts 1–3 lead to Resolution 1", () => {
    let r = skipMulligans(start("the-devourer-below", [ROLAND], 2, { chaosBag: ["+1"] as never, campaignLog: { cultistsGotAway: escaped } }));
    r = settle(r);
    expect(card(gOf(r), r.state.agenda!).doom).toBe(1); // 2 cultists got away
    r = mutate(r, (g) => {
      inv(g, ROLAND).clues = 3;
    });
    r = pick(r, /^Advance act/);
    r = settle(r);
    const g1 = gOf(r);
    expect(findByCode(g1, "01156")!.zone).toBe("location");
    for (const code of escaped) expect(def(g1, findByCode(g1, code, ["enemy"])!.location!).name).toBe("Main Path");
    expect(act(r)).toBe("Into the Darkness");
    r = mutate(r, (g) => {
      for (const e of Object.values(g.s.cards)) if (e.zone === "enemy") e.engagedWith = null;
      inv(g, ROLAND).location = findByCode(g, "01156")!.id;
    });
    r = pick(r, "Gain 1 resource");
    r = settle(r);
    expect(act(r)).toBe("Disrupting the Ritual");
    r = mutate(r, (g) => {
      card(g, g.s.act!).clues = 1;
      inv(g, ROLAND).clues = 1;
      for (const e of Object.values(g.s.cards)) if (e.zone === "enemy") moveCard(g, e.id, "encounterDiscard");
    });
    r = pick(r, /Disrupting the Ritual: spend 1 clue/);
    r = settle(r, /^Test willpower|^(Pass|done|Done)$/);
    expect(r.state.resolution).toBe("R1");
  });

  it("defeating Umôrdhoth after the final agenda → Resolution 2", () => {
    let r = skipMulligans(start("the-devourer-below", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = settle(r);
    r = mutate(r, (g) => {
      moveCard(g, g.s.agenda!, "removed");
      moveCard(g, g.s.agendaDeck.shift()!, "removed");
      moveCard(g, g.s.agendaDeck.shift()!, "agenda");
      card(g, g.s.agenda!).doom = 4;
    });
    r = pick(r, "End turn");
    r = settle(r);
    expect(r.state.flags.devourer).toBe(true);
    const u = findByCode(gOf(r), "01157", ["enemy"])!;
    expect(def(gOf(r), u.location!).name).toBe("Ritual Site");
    r = mutate(r, (g) => {
      inv(g, ROLAND).location = u.location;
      card(g, u.id).damage = enemyStat(g, u.id, "health") - 1;
      inv(g, ROLAND).actionsLeft = 3;
    });
    // Umôrdhoth (fight 5): Roland 4 + 1 = 5
    r = pick(r, /^Fight Umôrdhoth/);
    r = commitDone(r);
    r = settle(r);
    expect(r.state.resolution).toBe("R2");
  });

  it("throwing Lita to Umôrdhoth → Resolution 3", () => {
    let r = skipMulligans(start("the-devourer-below", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = settle(r);
    r = mutate(r, (g) => {
      const here = inv(g, ROLAND).location!;
      const u = findByCode(g, "01157")!;
      moveCard(g, u.id, "enemy", { location: here });
      // Lita is not part of this scenario's encounter sets: she comes from the campaign
      createCard(g, "01117", "play", ROLAND);
    });
    r = pick(r, /^Throw Lita/);
    r = settle(r); // Umôrdhoth is massive: the action provokes an attack of opportunity first
    expect(r.state.resolution).toBe("R3");
  });
});

describe("a generated scenario ends at its last act or agenda", () => {
  beforeAll(async () => {
    await loadPack("dwl");
    await loadCampaign("the-dunwich-legacy");
  });
  const dunwich = (seed = 3) => skipMulligans(start("extracurricular-activity", [ROLAND], seed, { campaignId: "the-dunwich-legacy", chaosBag: ["+1"] as never }));

  it("advancing the act when no act is left ends the scenario: After Hours, made the last, names none and gives Resolution 1", () => {
    let r = dunwich();
    r = mutate(r, (g) => {
      for (const id of g.s.actDeck.splice(0)) moveCard(g, id, "removed");
      inv(g, g.s.lead).clues = 20;
    });
    expect(act(r)).toBe("After Hours");
    r = pick(r, /^Advance act/);
    r = settle(r);
    expect(r.state.phase).toBe("ended");
    expect(r.state.resolution).toBe("R1");
  });

  it("the last agenda's back names the resolution: The Beast Unleashed gives Resolution 4", () => {
    let r = dunwich();
    r = mutate(r, (g) => {
      const last = g.s.agendaDeck.pop()!;
      for (const id of [...g.s.agendaDeck.splice(0), g.s.agenda!]) moveCard(g, id, "removed");
      moveCard(g, last, "agenda");
      card(g, g.s.agenda!).doom = 20;
    });
    r = pick(r, "End turn");
    r = settle(r);
    expect(r.state.resolution).toBe("R4");
  });

  it("without a marker the last act gives the first numbered resolution, the last agenda none", () => {
    expect(finalResolution("Proceed to <b>(→R2)</b>.", ["none", "R1", "R2"], "act")).toBe("R2");
    expect(finalResolution("The campus is quiet again.", ["none", "R2", "R1"], "act")).toBe("R1");
    expect(finalResolution("Each investigator is defeated.", ["none", "R1"], "agenda")).toBe("none");
    expect(finalResolution("(→R5)", ["none", "R1"], "act")).toBe("R1");
  });
});
