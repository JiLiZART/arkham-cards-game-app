/** Return to A Phantom of Truth (campaign-return-to-the-path-to-carcosa, group 6): setup card 52040 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { giveCard, gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import { evade, game, inject, toTurn, until } from "../kits/driver";
import { addTempMod, connections, enemies, enemyStat, findByCode, skillValue } from "../queries";
import {
  allCards,
  card,
  currentAgenda,
  exhaust,
  inv,
  placeInvestigator,
  reveal,
  setCounter,
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

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const PAIRS: [string, string][] = [
  ["03208", "52041"],
  ["03211", "52042"],
  ["03215", "52043"],
  ["03216", "52044"],
  ["03219", "52045"],
  ["03220", "52046"],
];
const GARE = "03214";
const ORGANIST = "03221";
const DRAPED = "03221b";
const FIGURE = "52047";
const BYAKHEE = "01175";
const CONVICTION = { conviction: 3, doubt: 1 };

interface Opts {
  bag?: ChaosToken[];
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const rapot = ({ bag = ["0"], seed = 1, log = {}, prep }: Opts = {}) =>
  game({
    scenario: "return-to-a-phantom-of-truth",
    investigators: [R],
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-path-to-carcosa", campaignLog: log },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** this location in play (moved in from wherever the setup put it), revealed, with Roland there */
const visit = (game: GameContext, code: string) => {
  let at = loc(game, code);
  if (!at) {
    at = findByCode(game, code)!.id;
    moveCard(game, at, ZONE.Location);
  }
  reveal(game, at);
  placeInvestigator(game, R, at);
  return at;
};
const toEnd = (r: Result) => until(r, () => false, 400);
function draw(r: Result, code: string): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.EncounterDeck);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: R, card: id });
}

describe("setup", () => {
  it("each of the six is the base or the box's version at random, never both; the other is out of the game", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = gOf(rapot({ seed }));
      for (const pair of PAIRS) {
        const here = pair.filter((c) => loc(g, c));
        expect(here).toHaveLength(1);
        seen.add(here[0]);
        expect(
          findByCode(
            g,
            pair.find((c) => c !== here[0])!,
          )?.zone,
        ).toBe(ZONE.Removed);
      }
      expect(codeOf(g, inv(g, R).location)).toBe(GARE);
      expect(
        allCards(g)
          .filter((c) => c.code === FIGURE)
          .map((c) => c.zone),
      ).toEqual([ZONE.SetAside, ZONE.SetAside]);
    }
    expect([...seen].some((c) => c >= "52041")).toBe(true);
    expect([...seen].some((c) => c < "52041")).toBe(true);
  });

  it("a box version takes the base's place on the map", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = gOf(rapot({ seed }));
      const gare = connections(g, loc(g, GARE)!).map((id) => g.db.cards[codeOf(g, id)!].name);
      expect(gare).toEqual(expect.arrayContaining(["Gardens of Luxembourg", "Montparnasse"]));
    }
  });

  it("Jordan interviewed: everyone begins at whichever Montparnasse is in play", () => {
    for (const seed of [1, 2, 3, 4]) {
      const g = gOf(rapot({ seed, log: { "03077": true } }));
      expect(g.db.cards[codeOf(g, inv(g, R).location)!].name).toBe("Montparnasse");
    }
  });
});

describe("52040: after The Organist enters play", () => {
  it("both Figures in the Shadows and the encounter discard pile are shuffled into the encounter deck", () => {
    let discarded = "";
    const r0 = rapot({
      prep: (g) => {
        discarded = createCard(g, "01163", ZONE.EncounterDiscard);
      },
    });
    const g0 = gOf(r0);
    expect(
      allCards(g0).filter((c) => c.code === FIGURE && c.zone === ZONE.EncounterDeck),
    ).toHaveLength(0);
    const g = gOf(run(r0, { t: STEP.AdvanceAct }));
    expect(enemies(g).some((e) => e.code === DRAPED)).toBe(true);
    expect(
      allCards(g).filter((c) => c.code === FIGURE && c.zone === ZONE.EncounterDeck),
    ).toHaveLength(2);
    expect(card(g, discarded).zone).toBe(ZONE.EncounterDeck);
  });
});

describe("the box's cards", () => {
  it("52047 Figure in the Shadows: Doubt moves The Organist away; Conviction makes him hunt", () => {
    const at = (log: Record<string, unknown>) =>
      rapot({
        log,
        prep: (g) => {
          const o = findByCode(g, ORGANIST, [ZONE.SetAside])!;
          moveCard(g, o.id, ZONE.Enemy, { location: loc(g, "03212") ?? loc(g, "03213")! });
        },
      });
    const dist = (r: Result) => {
      const g = gOf(r);
      const o = enemies(g).find((e) => e.code === ORGANIST)!;
      return o.location === inv(g, R).location
        ? 0
        : connections(g, o.location!).includes(inv(g, R).location!)
          ? 1
          : 2;
    };
    expect(dist(at({}))).toBe(1);
    expect(dist(toTurn(draw(at({}), FIGURE), R))).toBe(2);
    expect(dist(toTurn(draw(at(CONVICTION), FIGURE), R))).toBe(0);
  });

  it("52041 Montparnasse: discovering clues there discards [willpower] icons, or takes 1 horror", () => {
    const at = (withIcons: boolean) =>
      rapot({
        bag: ["+1"],
        prep: (g) => {
          const m = visit(g, "52041");
          setCounter(g, m, "clues", 1);
          for (const h of inv(g, R).hand.slice()) moveCard(g, h, ZONE.Discard);
          if (withIcons) giveCard(g, R, "01089"); // Guts: 2 willpower icons
        },
      });
    const done = (r: Result) => toTurn(pick(r, /^Investigate/), R);
    expect(inv(gOf(done(at(false))), R).horror).toBe(1);
    const g = gOf(done(at(true)));
    expect(inv(g, R).horror).toBe(0);
    expect(inv(g, R).hand).toHaveLength(0);
  });

  it("52042 Grand Guignol: spend 5 resources to place or remove 1 doom, once per game", () => {
    let r = rapot({
      prep: (g) => {
        visit(g, "52042");
        setCounter(g, R, "resources", 10);
        setCounter(g, currentAgenda(g)!, "doom", 1);
      },
    });
    r = toTurn(pick(pick(r, /Grand Guignol: spend 5/), /Remove 1 doom/), R);
    const g = gOf(r);
    expect(card(g, currentAgenda(g)!).doom).toBe(0);
    expect(inv(g, R).resources).toBe(5);
    expect(options(r).some((o) => /Grand Guignol: spend 5/.test(o))).toBe(false);
  });

  it("52043 Père Lachaise: an enemy that moves in gets +1 horror for the round", () => {
    let e = "";
    const r = rapot({
      prep: (g) => {
        const p = visit(g, "52043");
        e = putEnemy(g, "01160", p);
      },
    });
    const g = gOf(
      run(r, {
        t: STEP.Window,
        trigger: "enemyEntersLocation",
        data: { enemy: e, location: card(gOf(r), e).location! },
      }),
    );
    expect(enemyStat(g, e, "horror")).toBe(g.db.cards["01160"].enemy!.horror! + 1);
  });

  it("52044 Canal Saint-Martin: combat and agility swapped while there", () => {
    const g = gOf(rapot({ prep: (x) => void visit(x, "52044") }));
    expect(skillValue(g, R, "combat")).toBe(2);
    expect(skillValue(g, R, "agility")).toBe(4);
  });

  it("52045 Notre-Dame: enemies there +1 fight −1 evade; evading one by 3 or more gives an action", () => {
    let e = "";
    let r = rapot({
      bag: ["+1"],
      prep: (g) => {
        e = putEnemy(g, "01160", visit(g, "52045"), R); // Ghoul Minion: fight 2, evade 2
        addTempMod(g, { stat: "agility", value: 1 }, R, "round"); // agility 3 + 1 against 1
      },
    });
    expect(enemyStat(gOf(r), e, "fight")).toBe(3);
    expect(enemyStat(gOf(r), e, "evade")).toBe(1);
    const before = inv(gOf(r), R).actionsLeft;
    r = evade(r, "01160");
    r = until(
      r,
      (x) => options(x).some((o) => /Notre-Dame: take an additional action/.test(o)),
      40,
    );
    r = pick(r, /Notre-Dame: take an additional action/);
    expect(inv(gOf(r), R).actionsLeft).toBe(before - 1 + 1);
  });

  it("52046 Gardens of Luxembourg: entering it with a Byakhee in play reveals a token; a symbol calls each Byakhee", () => {
    let b = "";
    const r0 = rapot({
      bag: ["skull"],
      prep: (g) => {
        b = putEnemy(g, BYAKHEE, loc(g, GARE)!);
        exhaust(g, b);
        const gardens = findByCode(g, "52046")!.id;
        if (card(g, gardens).zone !== ZONE.Location) moveCard(g, gardens, ZONE.Location);
        reveal(g, gardens);
        placeInvestigator(g, R, gardens);
      },
    });
    const gardens = findByCode(gOf(r0), "52046")!.id;
    const g = gOf(
      run(r0, { t: STEP.Window, trigger: "enterLocation", data: { inv: R, location: gardens } }),
    );
    expect(card(g, b).location).toBe(gardens);
    expect(card(g, b).exhausted).toBe(false);
  });
});

describe("the resolutions, played", () => {
  it("3b: R3 with as much Doubt as Conviction, R1 with more Conviction; everyone defeated: no resolution", () => {
    const night3 = (log: Record<string, unknown>) =>
      toEnd(
        inject(
          rapot({
            log,
            prep: (g) => {
              moveCard(g, currentAgenda(g)!, ZONE.Removed);
              moveCard(g, findByCode(g, "03203", [ZONE.AgendaDeck])!.id, ZONE.Agenda, {
                deck: "a",
              });
              setCounter(g, currentAgenda(g)!, "doom", 5);
            },
          }),
          () => {},
          { t: STEP.CheckDoom },
        ),
      ).state.resolution;
    expect(night3({})).toBe("R3");
    expect(night3(CONVICTION)).toBe("R1");
    expect(night3({ ...CONVICTION, intrudedOnSecretMeeting: true })).toBe("R2");
    expect(
      toEnd(inject(rapot(), () => {}, { t: STEP.Defeated, inv: R, by: "effect" })).state.resolution,
    ).toBe("none");
  });
});
