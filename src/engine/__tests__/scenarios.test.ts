import { beforeAll, describe, expect, it } from "vitest";
import { loadCampaign, loadPack } from "../../content";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import { flatLog, record } from "../campaign/log";
import { card, def, inv } from "../context";
import { createCard, moveCard } from "../movement";
import { enemyStat, findByCode, locationByName } from "../queries";
import { createGame, type Result } from "../index";
import { finalResolution } from "../rules/scenario";
import { commitDone, db, gOf, mutate, pick, skipMulligans, start } from "../kits/testkit";
import { allCardRecsIn, cardRecIn, invStateIn, pileRecIn } from "../world/store";
import { EVENT } from "../events/event";
import { ZONE, PILE } from "../world/constants";

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

const act = (r: Result) => (r.state.acts.a ? def(gOf(r), r.state.acts.a).name : null);

describe("The Gathering", () => {
  it("plays through to Resolution 1", () => {
    let r = skipMulligans(start("the-gathering", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).clues = 2;
    });
    r = pick(r, /^Advance act/);
    expect(act(r)).toBe("The Barrier");
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).clues = 3;
    });
    r = pick(r, "End turn");
    r = settle(r, /Spend 3 clues and advance|^(Pass|done|Done)$/);
    expect(act(r)).toBe("What Have You Done?");
    const g0 = gOf(r);
    expect(card(g0, findByCode(g0, "01115")!.id).revealed).toBe(true);
    const priest = findByCode(g0, "01116", [ZONE.Enemy])!;
    expect(def(g0, priest.location!).name).toBe("Hallway");
    expect(findByCode(g0, "01117")!.zone).toBe("attached"); // Lita waits in the Parlor
    r = mutate(r, (game) => {
      cardRecIn(game.s, priest.id).damage = enemyStat(game, priest.id, "health") - 1;
      cardRecIn(game.s, priest.id).engagedWith = ROLAND;
      invStateIn(game.s, ROLAND).location = priest.location;
    });
    r = pick(r, /^Fight Ghoul Priest/);
    r = commitDone(r);
    expect(r.state.pending?.prompt).toMatch(/Defending the Home/);
    r = settle(r, /Burn it down|^(Pass|done|Done)$/);
    expect(
      r.state.log.some((e) => e.type === "actAdvance" && /Defending the Home/.test(e.text)),
    ).toBe(true);
    expect(r.state.phase).toBe("ended");
    expect(r.state.resolution).toBe("R1");
  });

  it("agenda 3 at act 1 sends the investigators to Resolution 3", () => {
    let r = skipMulligans(start("the-gathering", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = mutate(r, (game) => {
      for (const id of pileRecIn(game.s, PILE.AgendaDeck).slice(0, 1))
        moveCard(game, id, ZONE.Removed);
      moveCard(game, game.s.agendas.a!, ZONE.Removed);
      moveCard(game, pileRecIn(game.s, PILE.AgendaDeck)[0], ZONE.Agenda);
      cardRecIn(game.s, game.s.agendas.a!).doom = 9;
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
    r = mutate(r, (game) => {
      const north = locationByName(game, "Northside")!;
      invStateIn(game.s, ROLAND).location = north.id;
      invStateIn(game.s, ROLAND).resources = 5;
      victoria = pileRecIn(game.s, "sideDeck:cultists").find(
        (id) => card(game, id).code === "01140",
      )!;
      moveCard(game, victoria, ZONE.Enemy, { location: north.id });
      cardRecIn(game.s, victoria).exhausted = true;
    });
    r = pick(r, /Victoria Devereux: spend 5 resources/);
    expect(cardRecIn(r.state, victoria).zone).toBe("victory");
    expect(invStateIn(r.state, ROLAND).resources).toBe(0);
  });

  it("six unique cultists in the victory display → Resolution 1, recorded in the campaign log", () => {
    const c = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 4,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
    });
    // the campaign as it stands on the way to The Midnight Masks, the house still standing
    const c2 = {
      ...c,
      log: record(c.log, "houseStanding"),
      flow: { ...c.flow, play: "the-midnight-masks", pos: 1 },
    };
    let r = skipMulligans(createGame(db, scenarioSetup(db, c2, 3)));
    r = settle(r);
    r = mutate(r, (game) => {
      for (const code of ["01137", "01138", "01139", "01140", "01141", "01121b"])
        moveCard(game, findByCode(game, code)!.id, ZONE.Victory);
    });
    r = pick(r, "Gain 1 resource");
    expect(r.state.resolution).toBe("R1");
    const next = applyScenarioEnd(db, c2, r.state);
    expect((flatLog(next.log).cultistsInterrogated as string[]).sort()).toEqual([
      "01121b",
      "01137",
      "01138",
      "01139",
      "01140",
      "01141",
    ]);
    expect(flatLog(next.log).cultistsGotAway).toEqual([]);
  });

  it("the second agenda advancing ends the scenario at midnight (Resolution 2)", () => {
    let r = skipMulligans(start("the-midnight-masks", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = mutate(r, (game) => {
      moveCard(game, game.s.agendas.a!, ZONE.Removed);
      moveCard(game, pileRecIn(game.s, PILE.AgendaDeck)[0], ZONE.Agenda);
      cardRecIn(game.s, game.s.agendas.a!).doom = 7;
    });
    r = pick(r, "End turn");
    r = settle(r);
    expect(r.state.resolution).toBe("R2");
  });

  it("the first agenda advancing spawns The Masked Hunter", () => {
    let r = skipMulligans(start("the-midnight-masks", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = mutate(r, (game) => {
      cardRecIn(game.s, game.s.agendas.a!).doom = 5;
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
  it("its setup adds an elder thing token to the bag for the rest of the campaign", () => {
    const c0 = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
    });
    const before = c0.chaosBag.filter((t) => t === "elderThing").length;
    const setup = scenarioSetup(db, { ...c0, flow: { ...c0.flow, play: "the-devourer-below" } }, 1);
    const r = skipMulligans(createGame(db, { ...setup, scenarioId: "the-devourer-below" }));
    expect(r.state.chaosBag.filter((t) => t === "elderThing")).toHaveLength(before + 1);
  });

  const escaped = ["01137", "01139"];

  it("acts 1–3 lead to Resolution 1", () => {
    let r = skipMulligans(
      start("the-devourer-below", [ROLAND], 2, {
        chaosBag: ["+1"] as never,
        campaignLog: { cultistsGotAway: escaped },
      }),
    );
    r = settle(r);
    expect(card(gOf(r), r.state.agendas.a!).doom).toBe(1); // 2 cultists got away
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).clues = 3;
    });
    r = pick(r, /^Advance act/);
    r = settle(r);
    const g1 = gOf(r);
    expect(findByCode(g1, "01156")!.zone).toBe("location");
    for (const code of escaped)
      expect(def(g1, findByCode(g1, code, [ZONE.Enemy])!.location!).name).toBe("Main Path");
    expect(act(r)).toBe("Into the Darkness");
    r = mutate(r, (game) => {
      for (const e of allCardRecsIn(game.s)) if (e.zone === "enemy") e.engagedWith = null;
      invStateIn(game.s, ROLAND).location = findByCode(game, "01156")!.id;
    });
    r = pick(r, "Gain 1 resource");
    r = settle(r);
    expect(act(r)).toBe("Disrupting the Ritual");
    r = mutate(r, (game) => {
      cardRecIn(game.s, game.s.acts.a!).clues = 1;
      invStateIn(game.s, ROLAND).clues = 1;
      for (const e of allCardRecsIn(game.s))
        if (e.zone === "enemy") moveCard(game, e.id, ZONE.EncounterDiscard);
    });
    r = pick(r, /Disrupting the Ritual: spend 1 clue/);
    r = settle(r, /^Test willpower|^(Pass|done|Done)$/);
    expect(r.state.resolution).toBe("R1");
  });

  it("defeating Umôrdhoth after the final agenda → Resolution 2", () => {
    let r = skipMulligans(start("the-devourer-below", [ROLAND], 2, { chaosBag: ["+1"] as never }));
    r = settle(r);
    r = mutate(r, (game) => {
      moveCard(game, game.s.agendas.a!, ZONE.Removed);
      moveCard(game, pileRecIn(game.s, PILE.AgendaDeck).shift()!, ZONE.Removed);
      moveCard(game, pileRecIn(game.s, PILE.AgendaDeck).shift()!, ZONE.Agenda);
      cardRecIn(game.s, game.s.agendas.a!).doom = 4;
    });
    r = pick(r, "End turn");
    r = settle(r);
    expect(r.state.flags.devourer).toBe(true);
    const u = findByCode(gOf(r), "01157", [ZONE.Enemy])!;
    expect(def(gOf(r), u.location!).name).toBe("Ritual Site");
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).location = u.location;
      cardRecIn(game.s, u.id).damage = enemyStat(game, u.id, "health") - 1;
      invStateIn(game.s, ROLAND).actionsLeft = 3;
      // the setup added its elder thing token: the test's bag is +1 alone
      game.s.chaosBag = ["+1"];
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
    r = mutate(r, (game) => {
      const here = inv(game, ROLAND).location!;
      const u = findByCode(game, "01157")!;
      moveCard(game, u.id, ZONE.Enemy, { location: here });
      // Lita is not part of this scenario's encounter sets: she comes from the campaign
      createCard(game, "01117", ZONE.Play, ROLAND);
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
  const dunwich = (seed = 3) =>
    skipMulligans(
      start("extracurricular-activity", [ROLAND], seed, {
        campaignId: "the-dunwich-legacy",
        chaosBag: ["+1"] as never,
      }),
    );

  it("advancing the act when no act is left ends the scenario: After Hours, made the last, names none and gives Resolution 1", () => {
    let r = dunwich();
    r = mutate(r, (game) => {
      for (const id of pileRecIn(game.s, PILE.ActDeck).splice(0)) moveCard(game, id, ZONE.Removed);
      invStateIn(game.s, game.s.lead).clues = 20;
    });
    expect(act(r)).toBe("After Hours");
    r = pick(r, /^Advance act/);
    r = settle(r);
    expect(r.state.phase).toBe("ended");
    expect(r.state.resolution).toBe("R1");
  });

  it("the last agenda's back names the resolution: The Beast Unleashed gives Resolution 4", () => {
    let r = dunwich();
    r = mutate(r, (game) => {
      const last = pileRecIn(game.s, PILE.AgendaDeck).pop()!;
      for (const id of [...pileRecIn(game.s, PILE.AgendaDeck).splice(0), game.s.agendas.a!])
        moveCard(game, id, ZONE.Removed);
      moveCard(game, last, ZONE.Agenda);
      cardRecIn(game.s, game.s.agendas.a!).doom = 20;
    });
    r = pick(r, "End turn");
    r = settle(r);
    expect(r.state.resolution).toBe("R4");
  });

  it("without a marker the last act gives the first numbered resolution, the last agenda none", () => {
    expect(finalResolution("Proceed to <b>(→R2)</b>.", ["none", "R1", "R2"], EVENT.Act)).toBe("R2");
    expect(finalResolution("The campus is quiet again.", ["none", "R2", "R1"], EVENT.Act)).toBe(
      "R1",
    );
    expect(finalResolution("Each investigator is defeated.", ["none", "R1"], EVENT.Agenda)).toBe(
      "none",
    );
    expect(finalResolution("(→R5)", ["none", "R1"], EVENT.Act)).toBe("R1");
  });
});
