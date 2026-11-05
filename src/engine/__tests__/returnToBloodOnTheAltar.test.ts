/** Return to Blood on the Altar (campaign-return-to-the-dunwich-legacy, group 6): setup card 51032 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { db, giveCard, gOf, mutate, options } from "../kits/testkit";
import { game, inject, investigate, toTurn, until } from "../kits/driver";
import { addTempMod, cardsIn, connections, findByCode, gainsKeyword, locations } from "../queries";
import {
  card,
  cardsBeneath,
  currentAgenda,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setCounter,
  sideDeck,
  unreveal,
  type GameContext,
} from "../context";
import { createCard, moveCard, putBeneath } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";
import * as flags from "../world/flags";
import { preyCandidates } from "../rules/enemies";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const COMMONS = "51033";
const CHAMBER = "02214";
const SILAS = "02216";
const HIRED_GUN = "51040";
const TRIPLES = [
  ["02202", "02203", "51034"],
  ["02204", "02205", "51035"],
  ["02206", "02207", "51036"],
  ["02208", "02209", "51037"],
  ["02210", "02211", "51038"],
  ["02212", "02213", "51039"],
];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const rtbota = ({ invs = [R], bag = ["0"], seed = 1, log = {}, prep }: Opts = {}) =>
  game({
    scenario: "return-to-blood-on-the-altar",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-dunwich-legacy", campaignLog: log },
  });

/** the location of a code in play, put into play (revealed, no clues) when it isn't */
function loc(game: GameContext, code: string): InstId {
  const there = findByCode(game, code, [ZONE.Location]);
  if (there) return there.id;
  const id = createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  reveal(game, id);
  return id;
}
function standAt(game: GameContext, code: string, who = R): InstId {
  const id = loc(game, code);
  reveal(game, id);
  setCounter(game, id, "clues", 0);
  placeInvestigator(game, who, id);
  return id;
}
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const names = (game: GameContext, ids: InstId[]) => ids.map((id) => card(game, id).code).sort();

describe("setup", () => {
  it("the Silent Decay Commons and one of three copies of five of the six others; no Naomi's Crew card beneath them", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const r = rtbota({ invs: [R, D], seed, log: { boneToPick: true } });
      const g = gOf(r);
      const now = locations(g).map((l) => l.code);
      expect(now).toHaveLength(6);
      expect(now).toContain(COMMONS);
      expect(findByCode(g, "02201")?.zone).toBe(ZONE.Removed);
      expect(TRIPLES.filter((t) => t.some((c) => now.includes(c)))).toHaveLength(5);
      for (const t of TRIPLES) {
        expect(t.filter((c) => now.includes(c)).length).toBeLessThan(2);
        for (const c of t.filter((x) => !now.includes(x)))
          expect(findByCode(g, c)?.zone).toBe(ZONE.Removed);
      }
      expect(inv(g, R).location).toBe(loc(g, COMMONS));
      const under = locations(g).flatMap((l) => cardsBeneath(g, l.id));
      expect(under).toHaveLength(5);
      for (const id of under)
        expect(db.cards[card(g, id).code].encounterSet).not.toBe("naomis_crew");
      for (const c of now) seen.add(c);
    }
    expect(["51034", "51035", "51036", "51037", "51038", "51039"].some((c) => seen.has(c))).toBe(
      true,
    );
  });

  it("no bone to pick: both Hired Guns stay set aside, Naomi's Crew out of the game", () => {
    const g = gOf(rtbota());
    expect(cardsIn(g, ZONE.SetAside).filter((c) => c.code === HIRED_GUN)).toHaveLength(2);
    expect(findByCode(g, "02097")?.zone).toBe(ZONE.Removed);
  });

  it("a bone to pick: one Hired Gun spawns at a location not connected to the Commons, the other is shuffled in", () => {
    for (const seed of [1, 2, 3]) {
      const g = gOf(rtbota({ seed, log: { boneToPick: true } }));
      const guns = [...cardsIn(g, ZONE.Enemy), ...cardsIn(g, ZONE.EncounterDeck)].filter(
        (c) => c.code === HIRED_GUN,
      );
      expect(guns.map((c) => c.zone).sort()).toEqual([ZONE.Enemy, ZONE.EncounterDeck].sort());
      const gun = guns.find((c) => c.zone === ZONE.Enemy)!;
      const commons = loc(g, COMMONS);
      expect(gun.location).not.toBe(commons);
      expect(connections(g, commons)).not.toContain(gun.location);
      expect(connections(g, gun.location!)).not.toContain(commons);
    }
  });

  it("the box's copies have their base namesakes' connections, one-way links included", () => {
    const g = gOf(
      rtbota({
        prep: (x) => {
          for (const c of ["51034", "02202", "51037", "51036", "51039"]) loc(x, c);
        },
      }),
    );
    const commons = loc(g, COMMONS);
    const out = names(g, connections(g, commons));
    expect(out).toContain("51034");
    expect(out).toContain("02202");
    expect(out).toContain("51039");
    expect(out).toContain("51036"); // the Commons to Osborn's, one way
    expect(names(g, connections(g, loc(g, "51036")))).not.toContain(COMMONS);
    expect(names(g, connections(g, loc(g, "51037")))).toContain(COMMONS); // the Church to the Commons
    expect(out).not.toContain("51037");
  });
});

describe("the box's locations", () => {
  const kinds = (r: Result) =>
    (r.state.pending?.options ?? []).map((o) => (o.value as { kind?: string }).kind);

  it("51033 Village Commons: no draw or resource actions there", () => {
    const r = rtbota();
    expect(kinds(r)).not.toContain("draw");
    expect(kinds(r)).not.toContain("resource");
    const away = toTurn(
      mutate(r, (g) => void standAt(g, "02202")),
      R,
    );
    expect(kinds(away)).toContain("draw");
    expect(kinds(away)).toContain("resource");
  });

  /** Roland reveals a location of the code, put into play unrevealed */
  const revealed = (code: string, agility = 0) => {
    const r = rtbota({
      prep: (g) => {
        unreveal(g, loc(g, code));
        if (agility) addTempMod(g, { stat: "agility", value: agility }, R, "round");
      },
    });
    return { before: r, after: run(r, revealStep(r, code)) };
  };
  const revealStep = (r: Result, code: string): Step => ({
    t: STEP.RevealLocation,
    location: findByCode(gOf(r), code, [ZONE.Location])!.id,
    by: R,
  });

  it("51034 Bishop's Brook: revealed, failing agility (4) is 2 damage; passing, none", () => {
    expect(inv(gOf(revealed("51034").after), R).damage).toBe(2);
    expect(inv(gOf(revealed("51034", 2).after), R).damage).toBe(0);
  });

  it("51035 Burned Ruins: a successful investigation is 1 damage", () => {
    const r = rtbota({
      bag: ["+1"],
      prep: (g) => {
        const id = standAt(g, "51035");
        setCounter(g, id, "clues", 2);
      },
    });
    const after = toTurn(investigate(r), R);
    expect(inv(gOf(after), R).damage).toBe(1);
    expect(inv(gOf(after), R).clues).toBe(1);
  });

  it("51036 Osborn's General Store: revealed, 2 resources", () => {
    const { before, after } = revealed("51036");
    expect(inv(gOf(after), R).resources).toBe(inv(gOf(before), R).resources + 2);
  });

  it("51037 Congregational Church: revealed, Kidnapped! is drawn from the encounter deck", () => {
    const { before, after } = revealed("51037");
    const kidnapped = (r: Result) =>
      pile(gOf(r), ZONE.EncounterDeck).filter((id) => card(gOf(r), id).code === "02220").length;
    expect(kidnapped(after)).toBe(kidnapped(before) - 1);
    // drawn as a treachery, its revelation resolved: never put into play as an enemy
    expect(cardsIn(gOf(after), ZONE.Enemy).some((c) => c.code === "02220")).toBe(false);
  });

  it("51038 House in the Reeds: no assets played there", () => {
    const armed = (code: string) =>
      rtbota({
        prep: (g) => {
          standAt(g, code);
          giveCard(g, R, "01016"); // .45 Automatic
          setCounter(g, R, "resources", 5);
        },
      });
    const offeredGun = (r: Result) => options(r).some((o) => o.startsWith("Play .45 Automatic"));
    expect(offeredGun(armed("02202"))).toBe(true);
    expect(offeredGun(armed("51038"))).toBe(false);
  });

  it("51039 Schoolhouse: discovering a clue here draws a Servant of Many Mouths", () => {
    const r = rtbota({
      bag: ["+1"],
      prep: (g) => {
        const id = standAt(g, "51039");
        setCounter(g, id, "clues", 1);
      },
    });
    const after = toTurn(investigate(r), R);
    expect(findByCode(gOf(after), "02224", [ZONE.Enemy])).toBeDefined();
  });
});

describe("51040 Hired Gun", () => {
  it("each Criminal enemy gains Hunter and prey most resources; Hunted Down gains peril and surge", () => {
    const r = rtbota({
      invs: [R, D],
      log: { boneToPick: true },
      prep: (g) => {
        setCounter(g, D, "resources", 9);
        const thug = createCard(g, "02097", ZONE.Limbo);
        moveCard(g, thug, ZONE.Enemy, { location: inv(g, R).location });
      },
    });
    const g = gOf(r);
    const thug = findByCode(g, "02097", [ZONE.Enemy])!.id;
    expect(gainsKeyword(g, thug, "hunter")).toBe(true);
    expect(preyCandidates(g, thug, [R, D])).toEqual([D]);
    const hunted = findByCode(g, "02099")!.id;
    expect(gainsKeyword(g, hunted, "peril")).toBe(true);
    expect(gainsKeyword(g, hunted, "surge")).toBe(true);
    // without a Hired Gun in play, nothing is gained
    const none = gOf(
      rtbota({
        log: { boneToPick: true },
        prep: (x) => {
          for (const c of cardsIn(x, ZONE.Enemy).filter((e) => e.code === HIRED_GUN))
            moveCard(x, c.id, ZONE.SetAside);
        },
      }),
    );
    expect(gainsKeyword(none, findByCode(none, "02099")!.id, "surge")).toBe(false);
  });
});

describe("the resolutions, played", () => {
  /** act 2 current, Roland in The Hidden Chamber with Silas Bishop */
  const act2 = () =>
    run(
      rtbota({
        prep: (game) => {
          standAt(game, CHAMBER);
          setCounter(game, loc(game, CHAMBER), "clues", 2);
        },
      }),
      { t: STEP.AdvanceAct },
    );

  it("R1: Silas Bishop defeated", () => {
    const r = act2();
    const silas = findByCode(gOf(r), SILAS, [ZONE.Enemy])!;
    const end = until(
      inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: silas.id, by: R }),
      () => false,
      20,
    );
    expect(end.state.resolution).toBe("R1");
  });

  it("R2 with the Necronomicon in play, else R3: no clues in the Chamber", () => {
    const clear = (r: Result, necro = false) =>
      inject(
        r,
        (g) => {
          setCounter(g, loc(g, CHAMBER), "clues", 0);
          if (necro) {
            const id = createCard(g, "02140", ZONE.Limbo, R);
            moveCard(g, id, ZONE.Play, { inv: R });
          }
        },
        { t: STEP.CheckObjectives },
      );
    expect(clear(act2()).state.resolution).toBe("R3");
    expect(clear(act2(), true).state.resolution).toBe("R2");
  });
});

describe("the sacrificed", () => {
  const sacrificed = (r: Result) => flags.cardsEntry.get(gOf(r), ["sacrificed", "sacrificed"]);

  it("a resolution: the unique cards beneath the agenda deck are noted as sacrificed to Yog-Sothoth", () => {
    const end = inject(
      rtbota(),
      (g) => {
        const zeb = sideDeck(g, "sacrifices").find((id) => card(g, id).code === "02217")!;
        putBeneath(g, zeb, currentAgenda(g)!);
        putBeneath(g, createCard(g, "01021", ZONE.Limbo), currentAgenda(g)!);
      },
      { t: STEP.Resolution, id: "R1" },
    );
    expect(sacrificed(end)).toEqual(["02217"]);
  });

  it("no resolution: every potential sacrifice left as well", () => {
    const end = inject(rtbota(), () => {}, { t: STEP.Resolution, id: "none" });
    expect([...(sacrificed(end) ?? [])].sort()).toEqual(["02217", "02218"]);
  });
});
