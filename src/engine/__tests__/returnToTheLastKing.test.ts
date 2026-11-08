/** Return to The Last King (campaign-return-to-the-path-to-carcosa, group 3): setup card 52021 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import { game, inject, lastTest, toTurn, until } from "../kits/driver";
import { enemies, enemyStat, findByCode } from "../queries";
import {
  allCards,
  card,
  cardsBeneath,
  currentAgenda,
  deckCards,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setCounter,
  setPhase,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const R = "01001"; // Roland: intellect 3; 5 resources
const D = "01002";
const FOYER = "03070";
const CONSTANCE = "03076a";
const JORDAN = "03077";
const ASHLEIGH = "03080";
const BYSTANDERS = [CONSTANCE, JORDAN, "03078", "03079", ASHLEIGH];
const DIANNE_ASSET = "52025";
const DIANNE_ENEMY = "52023";
const CRAZED = "52024";
const GUEST = "52026";
const DISPLAY = "52027";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  prep?: (game: GameContext) => void;
}
const rtlk = ({ invs = [R], bag = ["0"], seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "return-to-the-last-king",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-path-to-carcosa", campaignLog: {} },
  });

const bystander = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Attached])!;
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
const code = (r: Result, id: string | null | undefined) => (id ? card(gOf(r), id).code : null);
const scenarioCard = (game: GameContext) => allCards(game).find((c) => c.zone === ZONE.Scenario)!;
const beneath = (game: GameContext) =>
  cardsBeneath(game, scenarioCard(game).id).map((id) => card(game, id).code);
/** only this Sickening Reality left beneath the scenario card */
const onlyBeneath = (game: GameContext, keep: string) => {
  let kept = false;
  for (const id of cardsBeneath(game, scenarioCard(game).id).slice()) {
    if (card(game, id).code === keep && !kept) kept = true;
    else moveCard(game, id, ZONE.Removed);
  }
};
/** the Dianne Devine asset at this Bystander's location */
const dianneAt = (game: GameContext, code: string) => {
  const her = findByCode(game, DIANNE_ASSET, [ZONE.SetAside])!;
  moveCard(game, her.id, ZONE.Attached, { location: bystander(game, code).location });
  return her.id;
};
/** a Party Guest in play at this Bystander's location */
const guestAt = (game: GameContext, code: string) => {
  const g = findByCode(game, GUEST, [ZONE.EncounterDeck])!;
  moveCard(game, g.id, ZONE.Attached, { location: bystander(game, code).location });
  return g.id;
};
const resolveBeneath = (r: Result, keep: string, prep: (game: GameContext) => void = () => {}) => {
  let story = "";
  const ready = mutate(r, (g) => {
    prep(g);
    onlyBeneath(g, keep);
    story = cardsBeneath(g, scenarioCard(g).id)[0];
  });
  return { story, r: run(ready, { t: STEP.ResolveStory, card: story, you: R }) };
};
const toEnd = (r: Result) => until(r, () => false, 300);

describe("setup", () => {
  it("agendas 52022 then 03063; eight Sickening Reality cards beneath the reference card; the base Dianne gone", () => {
    const g = gOf(rtlk());
    expect(card(g, currentAgenda(g)!).code).toBe("52022");
    expect(deckCards(g, "agenda").map((id) => card(g, id).code)).toEqual(["03063"]);
    expect(beneath(g).sort()).toEqual(
      ["03065", "03066", "03067", "03068", "03069", "52023b", "52024b", "52024b"].sort(),
    );
    expect(findByCode(g, "03062")).toBeUndefined();
    expect(findByCode(g, "03081")?.zone ?? ZONE.Removed).toBe(ZONE.Removed);
    expect(findByCode(g, DIANNE_ASSET)?.zone).toBe(ZONE.SetAside);
    expect(findByCode(g, DISPLAY)?.zone).toBe(ZONE.SetAside);
    const deck = pile(g, "encounterDeck").map((id) => card(g, id).code);
    expect(deck.filter((c) => c === GUEST)).toHaveLength(2);
    for (const c of [DIANNE_ENEMY, CRAZED, DISPLAY, DIANNE_ASSET]) expect(deck).not.toContain(c);
  });

  it("the five Bystanders, one at each location but the Foyer, as the base sets them", () => {
    const g = gOf(rtlk({ invs: [R, D] }));
    const at = BYSTANDERS.map((b) => bystander(g, b));
    expect(new Set(at.map((b) => b.location)).size).toBe(5);
    expect(at.map((b) => card(g, b.location!).code)).not.toContain(FOYER);
    for (const b of at) expect(card(g, b.id).clues).toBe(3);
  });
});

describe("agenda 1 and Dianne Devine", () => {
  it("52022's back: the Dianne asset at the fewest-clue Bystander with any clue; Shocking Display shuffled in", () => {
    let r = rtlk({
      prep: (g) => {
        setCounter(g, bystander(g, JORDAN).id, "clues", 0);
        setCounter(g, bystander(g, ASHLEIGH).id, "clues", 1);
      },
    });
    r = run(r, { t: STEP.AdvanceAgenda });
    const g = gOf(r);
    expect(findByCode(g, DIANNE_ASSET)).toMatchObject({
      zone: ZONE.Attached,
      location: bystander(g, ASHLEIGH).location,
    });
    expect(findByCode(g, DISPLAY)?.zone).toBe(ZONE.EncounterDeck);
    expect(code(r, currentAgenda(g))).toBe("03063");
  });

  it("52025: no clue discovered or taken at her location; as the enemy phase begins she moves", () => {
    let r = rtlk({
      bag: ["+1"],
      prep: (g) => {
        const at = visit(g, CONSTANCE);
        dianneAt(g, CONSTANCE);
        setCounter(g, at, "clues", 1);
        setCounter(g, bystander(g, ASHLEIGH).id, "clues", 1);
      },
    });
    r = toTurn(pick(r, /Constance Dumaine: parley/), R);
    r = toTurn(pick(r, /^Investigate/), R);
    expect(inv(gOf(r), R).clues).toBe(0);
    r = run(
      mutate(r, (g) => setPhase(g, "enemy")),
      { t: STEP.Window, trigger: "phaseBegins", data: { phase: "enemy" } },
    );
    const g = gOf(r);
    expect(findByCode(g, DIANNE_ASSET)!.location).toBe(bystander(g, ASHLEIGH).location);
  });

  it("52023b: horror at her location; the enemy Dianne takes the asset's place, +3 health per investigator", () => {
    const { story, r } = resolveBeneath(rtlk({ invs: [R, D] }), "52023b", (g) => {
      visit(g, JORDAN);
      dianneAt(g, JORDAN);
    });
    const g = gOf(r);
    expect(card(g, story)).toMatchObject({ code: DIANNE_ENEMY, zone: ZONE.Enemy });
    expect(card(g, story).location).toBe(bystander(g, JORDAN).location);
    expect(findByCode(g, DIANNE_ASSET)?.zone).toBe(ZONE.Removed);
    expect(inv(g, R).horror).toBe(1);
    expect(inv(g, D).horror).toBe(0);
    expect(enemyStat(g, story, "health")).toBe(3 + 3 * 2);
  });

  it("52023: after any investigator parleys, she moves once toward them", () => {
    let her = "";
    let r = rtlk({
      prep: (g) => {
        visit(g, ASHLEIGH);
        her = putEnemy(g, DIANNE_ENEMY, findByCode(g, FOYER, [ZONE.Location])!.id);
        setCounter(g, R, "actionsLeft", 3);
      },
    });
    const before = card(gOf(r), her).location;
    r = toTurn(pick(r, /Ashleigh Clarke: parley/), R);
    const g = gOf(r);
    expect(card(g, her).location).not.toBe(before);
  });
});

describe("the Crazed Guests and Party Guests", () => {
  it("52024b with no Party Guest in play: it stays beneath and another Sickening Reality resolves", () => {
    let r = rtlk();
    let crazed = "";
    r = mutate(r, (g) => {
      visit(g, CONSTANCE);
      const pileIds = [...cardsBeneath(g, scenarioCard(g).id)];
      crazed = pileIds.find((id) => card(g, id).code === "52024b")!;
      for (const id of pileIds)
        if (id !== crazed && !["03065", "52024b"].includes(card(g, id).code))
          moveCard(g, id, ZONE.Removed);
    });
    r = run(r, { t: STEP.ResolveStory, card: crazed, you: R });
    const g = gOf(r);
    expect(card(g, crazed).zone).toBe(ZONE.Beneath);
    expect(enemies(g).map((e) => e.code)).toContain("03065b");
    expect(beneath(g)).toEqual(["52024b", "52024b"]);
  });

  it("52024b with a Party Guest: 1 damage there, 1 doom on the agenda, a Crazed Guest takes its place", () => {
    let guest = "";
    const { story, r } = resolveBeneath(rtlk(), "52024b", (g) => {
      visit(g, JORDAN);
      guest = guestAt(g, JORDAN);
    });
    const g = gOf(r);
    expect(card(g, story)).toMatchObject({ code: CRAZED, zone: ZONE.Enemy });
    expect(card(g, guest).zone).toBe(ZONE.Removed);
    expect(inv(g, R).damage).toBe(1);
    expect(card(g, currentAgenda(g)!).doom).toBe(1);
  });

  it("52024 Crazed Guest: parley, intellect (4): success evades it", () => {
    let e = "";
    let r = rtlk({
      bag: ["+1"],
      prep: (g) => {
        const at = visit(g, JORDAN);
        e = putEnemy(g, CRAZED, at);
      },
    });
    r = toTurn(pick(r, /Crazed Guest: parley/), R);
    expect(lastTest(r)?.difficulty).toBe(4);
    expect(card(gOf(r), e)).toMatchObject({ exhausted: true, engagedWith: null });
  });

  it("52026 Party Guest: drawn, it joins the Bystander with the most clues; no parley with that Bystander", () => {
    let r = rtlk({
      prep: (g) => {
        setCounter(g, bystander(g, CONSTANCE).id, "clues", 5);
        visit(g, CONSTANCE);
      },
    });
    expect(options(r).some((o) => /Constance Dumaine: parley/.test(o))).toBe(true);
    let guest = "";
    r = mutate(r, (g) => {
      guest = createCard(g, GUEST, ZONE.EncounterDeck);
    });
    r = run(r, { t: STEP.DrawEncounter, inv: R, card: guest });
    const g = gOf(r);
    expect(card(g, guest)).toMatchObject({ zone: ZONE.Attached });
    expect(card(g, guest).location).toBe(bystander(g, CONSTANCE).location);
    expect(options(r).some((o) => /Constance Dumaine: parley/.test(o))).toBe(false);
    // spend 2 resources: it moves to a connecting location, and the Bystander can be parleyed with again
    r = toTurn(pick(r, /Party Guest: spend 2 resources/), R);
    expect(inv(gOf(r), R).resources).toBe(3);
    expect(card(gOf(r), guest).location).not.toBe(bystander(gOf(r), CONSTANCE).location);
    expect(options(r).some((o) => /Constance Dumaine: parley/.test(o))).toBe(true);
  });

  it("52027 Shocking Display: one of the cards beneath resolves at random", () => {
    let r = rtlk();
    let display = "";
    r = mutate(r, (g) => {
      visit(g, ASHLEIGH);
      onlyBeneath(g, "03069");
      display = findByCode(g, DISPLAY, [ZONE.SetAside])!.id;
      moveCard(g, display, ZONE.EncounterDeck, { top: true });
    });
    r = run(r, { t: STEP.DrawEncounter, inv: R, card: display });
    expect(enemies(gOf(r)).map((e) => e.code)).toContain("03069b");
  });
});

describe("the eight Sickening Reality cards", () => {
  it("agenda 2's threshold resolves one of the eight; a Crazed Guest's swaps with a Party Guest", () => {
    let r = run(rtlk(), { t: STEP.AdvanceAgenda });
    let guest = "";
    r = mutate(r, (g) => {
      visit(g, JORDAN);
      guest = guestAt(g, JORDAN);
      onlyBeneath(g, "52024b");
      setCounter(g, currentAgenda(g)!, "doom", 3);
    });
    r = run(r, { t: STEP.CheckDoom });
    const g = gOf(r);
    expect(enemies(g).map((e) => e.code)).toContain(CRAZED);
    expect(card(g, guest).zone).toBe(ZONE.Removed);
    expect(code(r, currentAgenda(g))).toBe("03063");
  });
});

describe("the resolutions, played", () => {
  it("R1: everyone gone, someone resigned; R2: no one resigned", () => {
    let r = rtlk({ invs: [R, D] });
    r = toTurn(pick(r, "Foyer: resign"), D);
    expect(
      toEnd(inject(r, () => {}, { t: STEP.Defeated, inv: D, by: "effect" })).state.resolution,
    ).toBe("R1");
    expect(
      toEnd(inject(rtlk(), () => {}, { t: STEP.Defeated, inv: R, by: "effect" })).state.resolution,
    ).toBe("R2");
  });

  it("R3: agenda 2 with nothing beneath the reference card", () => {
    let r = run(rtlk(), { t: STEP.AdvanceAgenda });
    r = mutate(r, (g) => {
      for (const id of cardsBeneath(g, scenarioCard(g).id).slice()) moveCard(g, id, ZONE.Removed);
      setCounter(g, currentAgenda(g)!, "doom", 3);
    });
    expect(toEnd(inject(r, () => {}, { t: STEP.CheckDoom })).state.resolution).toBe("R3");
  });

  it("none: the scenario's no-resolution entry; the enemy Dianne in the victory display is a VIP slain", () => {
    const r = rtlk({
      prep: (g) => {
        const her = createCard(g, DIANNE_ENEMY, ZONE.Victory);
        expect(card(g, her).zone).toBe(ZONE.Victory);
      },
    });
    const end = toEnd(inject(r, () => {}, { t: STEP.Resolution, id: "none" }));
    expect(end.state.resolution).toBe("none");
    expect(end.state.flags[`log:vipsSlain:${DIANNE_ENEMY}`]).toBe(true);
  });
});
