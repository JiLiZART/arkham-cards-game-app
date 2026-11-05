/**
 * The six replacement encounter sets of Return to The Dunwich Legacy (campaign-return-to-the-dunwich-legacy, task 1.4):
 * one test per card, drawn in Extracurricular Activity.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import {
  card,
  cardsOf,
  def,
  inv,
  pile,
  placeInvestigator,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { connections, findByCode } from "../queries";
import { win } from "../rules/cards";
import { game, inject, inPlay, lastTest, move, toTurn, until, use } from "../kits/driver";
import { gOf, mutate, pick, putEnemy } from "../kits/testkit";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy: willpower 3, intellect 5
const A = "01004"; // Agnes
const QUAD = "02048";

const ea = (invs = [R], bag: ChaosToken[] = ["0"], prep?: (game: GameContext) => void) =>
  game({
    scenario: "extracurricular-activity",
    investigators: invs,
    bag,
    prep,
    extra: { campaignId: "the-dunwich-legacy" },
  });

/** `who` draws this encounter card */
function draw(r: Result, code: string, who = R): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.EncounterDeck);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const labels = (r: Result) => r.state.pending?.options.map((o) => o.label) ?? [];
const zoneOf = (r: Result, code: string) => cardsOf(r.state).find((c) => c.code === code)?.zone;
const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])!.id;
const near = (game: GameContext) => connections(game, loc(game, QUAD))[0];
const horror = (r: Result, i = R) => inv(gOf(r), i).horror;
const damage = (r: Result, i = R) => inv(gOf(r), i).damage;
const handOf = (code: string) => (game: GameContext) => {
  const id = createCard(game, code, ZONE.Limbo, R);
  moveCard(game, id, ZONE.Hand);
  return id;
};

describe("51064 Resurgent Evils (data)", () => {
  it("you choose: 1 doom on the agenda, or the top 2 cards of the encounter deck", () => {
    const r = draw(ea(), "51064");
    expect(labels(r)).toEqual([
      "Draw the top 2 cards of the encounter deck",
      "Place 1 doom on the current agenda",
    ]);
    const agenda = () => r.state.agendas.a!;
    const before = card(gOf(r), agenda()).doom;
    const doom = toTurn(pick(r, /^Place 1 doom/), R);
    expect(card(gOf(doom), agenda()).doom).toBe(before + 1);
    const deck = pile(gOf(r), ZONE.EncounterDeck).length;
    const drawn = toTurn(pick(r, /^Draw the top 2/), R);
    expect(pile(gOf(drawn), ZONE.EncounterDeck).length).toBeLessThanOrEqual(deck - 2);
  });
});

describe("51065 Secret Door (data)", () => {
  it("attaches where the most investigators are and keeps them there; a second goes where none is attached", () => {
    let r = ea([R, D, A], ["0"], (g) => placeInvestigator(g, R, near(g)));
    r = toTurn(draw(r, "51065"), R);
    const g = gOf(r);
    const door = findByCode(g, "51065", [ZONE.Attached])!;
    expect(door.location).toBe(loc(g, QUAD));
    r = toTurn(draw(r, "51065"), R);
    const doors = cardsOf(r.state).filter((c) => c.code === "51065" && c.zone === ZONE.Attached);
    expect(doors.map((c) => c.location).sort()).toEqual([loc(g, QUAD), near(g)].sort());
  });

  it("nobody can leave its location; a willpower or intellect (3) test discards it", () => {
    let r = toTurn(draw(ea(), "51065"), R);
    expect(labels(r).some((l) => l.startsWith("Move to"))).toBe(false);
    r = use(r, "51065", 2);
    expect(labels(r).length).toBe(2); // the skill to test with
    r = toTurn(pick(r, /intellect/i), R);
    expect(lastTest(r)).toMatchObject({ difficulty: 3, success: true });
    expect(zoneOf(r, "51065")).not.toBe(ZONE.Attached);
    expect(labels(r).some((l) => l.startsWith("Move to"))).toBe(true);
  });
});

describe("51066 Inexplicable Cold (data)", () => {
  it("agility (4): for each point failed by, discard a card from your hand or play area, or take 1 damage", () => {
    let rosary = "";
    let r = ea([R], ["0"], (g) => void (rosary = inPlay(g, R, "01059")));
    r = draw(r, "51066");
    r = until(r, (x) => labels(x).includes("Take 1 damage"));
    expect(labels(r)).toEqual([
      "Discard a card from your hand",
      "Discard a card from your play area",
      "Take 1 damage",
    ]);
    r = pick(r, /play area/);
    r = until(r, (x) => labels(x).includes("Take 1 damage"));
    expect(labels(r)).not.toContain("Discard a card from your play area");
    r = toTurn(pick(r, "Take 1 damage"), R);
    expect(card(gOf(r), rosary).zone).toBe(ZONE.Discard);
    expect(damage(r)).toBe(1);
  });
});

describe("51067 Oppressive Mists (data)", () => {
  it("after an investigator here draws cards, they test willpower (3) and discard as many on a failure; limit 1 here", () => {
    let r = toTurn(draw(ea([R], ["-1"]), "51067"), R);
    expect(findByCode(gOf(r), "51067", [ZONE.Attached])?.location).toBe(loc(gOf(r), QUAD));
    const handSize = inv(gOf(r), R).hand.length;
    r = toTurn(
      inject(r, () => {}, { t: STEP.Draw, inv: R, n: 2 }),
      R,
    );
    expect(lastTest(r)).toMatchObject({ skill: "willpower", difficulty: 3, success: false });
    expect(inv(gOf(r), R).hand.length).toBe(handSize);
    expect(r.state.log.filter((e) => e.type === "testResult")).toHaveLength(1);
    // a second copy at the same location is discarded
    r = toTurn(draw(r, "51067"), R);
    expect(
      cardsOf(r.state).filter((c) => c.code === "51067" && c.zone === ZONE.Attached),
    ).toHaveLength(1);
    expect(labels(r)).toContain("Discard Oppressive Mists [2 actions]");
  });
});

describe("51068 Violent Commands (data)", () => {
  it("in your threat area: [action] 2 damage to an investigator here and discard it; at the end of your turn willpower (3) or 1 horror", () => {
    let r = toTurn(draw(ea([R, D], ["-1"]), "51068"), R);
    expect(zoneOf(r, "51068")).toBe(ZONE.Threat);
    r = use(r, "51068", 1);
    r = pick(r, /Daisy/);
    r = toTurn(r, R);
    expect(damage(r, D)).toBe(2);
    expect(zoneOf(r, "51068")).toBe(ZONE.EncounterDiscard);
    r = toTurn(draw(r, "51068"), R);
    r = toTurn(pick(r, "End turn"), D);
    expect(lastTest(r)).toMatchObject({ skill: "willpower", difficulty: 3, success: false });
    expect(horror(r)).toBe(1);
  });
});

describe("51069 Idle Hands (data)", () => {
  it("[fast] during your turn: take 2 damage and discard it for an additional action; at the end of your turn 1 horror", () => {
    let r = toTurn(draw(ea([R, D]), "51069"), R);
    expect(zoneOf(r, "51069")).toBe(ZONE.Threat);
    const actions = inv(gOf(r), R).actionsLeft;
    const used = toTurn(use(r, "51069", 1), R);
    expect(damage(used)).toBe(2);
    expect(inv(gOf(used), R).actionsLeft).toBe(actions + 1);
    expect(zoneOf(used, "51069")).toBe(ZONE.EncounterDiscard);
    const ended = toTurn(pick(r, "End turn"), D);
    expect(horror(ended)).toBe(1);
  });
});

describe("51070 Need for Knowledge (data)", () => {
  it("with no clues it surges", () => {
    const r = ea();
    const deck = pile(gOf(r), ZONE.EncounterDeck).length;
    const after = until(draw(r, "51070"), () => true);
    expect(pile(gOf(after), ZONE.EncounterDeck).length).toBeLessThan(deck);
    expect(lastTest(after)).toBeNull();
  });

  it("else intellect (X = your clues, at most 5): per point, 1 horror or 1 of your clues on your location", () => {
    let r = ea([R], ["-2"], (g) => setCounter(g, R, "clues", 3));
    const here = inv(gOf(r), R).location!;
    const before = card(gOf(r), here).clues;
    r = draw(r, "51070");
    r = until(r, (x) => labels(x).includes("Take 1 horror"));
    expect(lastTest(r)).toMatchObject({ skill: "intellect", difficulty: 3, success: false });
    r = pick(r, /^Place 1 of your clues/);
    r = until(r, (x) => labels(x).includes("Take 1 horror"));
    r = toTurn(pick(r, "Take 1 horror"), R);
    expect(inv(gOf(r), R).clues).toBe(2);
    expect(card(gOf(r), here).clues).toBe(before + 1);
    expect(horror(r)).toBe(1);
    const capped = until(
      draw(
        ea([R], ["0"], (g) => setCounter(g, R, "clues", 7)),
        "51070",
      ),
      (x) => !!lastTest(x),
    );
    expect(lastTest(capped)?.difficulty).toBe(5);
  });
});

describe("51071 Vassal of the Lurker (data)", () => {
  it("Hunter; at the end of the enemy phase each investigator at its location discards the top card of their deck", () => {
    let r = ea([R, D], ["0"], (g) => {
      placeInvestigator(g, D, near(g));
      putEnemy(g, "51071", loc(g, QUAD));
    });
    expect(def(gOf(r), findByCode(gOf(r), "51071")!.id).keywords).toContain("hunter");
    const top = inv(gOf(r), R).deck[0];
    const daisy = inv(gOf(r), D).discard.length;
    r = toTurn(
      inject(r, () => {}, win("enemyPhaseEnds", {})),
      R,
    );
    expect(inv(gOf(r), R).discard).toContain(top);
    expect(inv(gOf(r), D).discard.length).toBe(daisy);
  });
});

describe("51061 Haunting Recollections (script)", () => {
  it("1 horror per card in hand with a copy in the discard pile, at most 3", () => {
    const r = ea([R], ["0"], (g) => {
      handOf("01059")(g);
      handOf("01059")(g);
      moveCard(g, handOf("01059")(g), ZONE.Discard);
    });
    expect(horror(toTurn(draw(r, "51061"), R))).toBe(2);
    const four = ea([R], ["0"], (g) => {
      for (let k = 0; k < 4; k++) handOf("01059")(g);
      moveCard(g, handOf("01059")(g), ZONE.Discard);
    });
    expect(horror(toTurn(draw(four, "51061"), R))).toBe(3);
  });

  it("no horror taken: the top 3 cards of your deck are discarded", () => {
    const r = ea();
    const top = inv(gOf(r), R).deck.slice(0, 3);
    const after = toTurn(draw(r, "51061"), R);
    expect(horror(after)).toBe(0);
    expect(inv(gOf(after), R).discard).toEqual(expect.arrayContaining(top));
  });
});

describe("51062 A Baleful Welcome (script)", () => {
  it("two actions chosen: no investigator can take them for the rest of the round", () => {
    let r = ea([R], ["0"], (g) => void handOf("01059")(g)); // Holy Rosary: played by a play action
    r = draw(r, "51062");
    expect(labels(r)).toEqual(["Investigate", "Fight", "Evade", "Move", "Play"]);
    r = pick(r, "Move");
    expect(labels(r)).toEqual(["Investigate", "Fight", "Evade", "Play"]);
    r = toTurn(pick(r, "Play"), R);
    expect(labels(r).some((l) => l.startsWith("Move to") || l === "Play Holy Rosary")).toBe(false);
    expect(labels(r)).toContain("Play Mind over Matter (fast)"); // a fast card is no play action
    expect(labels(r).some((l) => l.startsWith("Investigate"))).toBe(true);
    expect(r.state.tempMods.every((m) => m.until === "round")).toBe(true);
  });

  it("not the first copy this phase: three are chosen", () => {
    let r = toTurn(pick(pick(draw(ea(), "51062"), "Move"), "Play"), R);
    r = draw(r, "51062");
    r = pick(pick(r, "Fight"), "Evade");
    expect(labels(r)).toEqual(["Investigate", "Move", "Play"]);
    r = toTurn(pick(r, "Investigate"), R);
    expect(labels(r).some((l) => l.startsWith("Investigate"))).toBe(false);
  });
});

describe("51063 Infinite Doorway (script)", () => {
  it("moving out costs the top card of your deck: for each copy in hand or play, 1 horror or discard it", () => {
    let r = ea([R], ["0"], (g) => {
      const top = createCard(g, "01059", ZONE.Limbo, R);
      moveCard(g, top, ZONE.Deck, { inv: R, top: true });
      handOf("01059")(g);
    });
    r = toTurn(draw(r, "51063"), R);
    expect(findByCode(gOf(r), "51063", [ZONE.Attached])?.location).toBe(loc(gOf(r), QUAD));
    const to = card(gOf(r), near(gOf(r))).code;
    r = until(move(r, to), (x) => labels(x).includes("Take 1 horror"));
    expect(labels(r)).toEqual(["Take 1 horror", "Discard the copy"]);
    r = toTurn(pick(r, "Take 1 horror"), R);
    expect(horror(r)).toBe(1);
    expect(card(gOf(r), inv(gOf(r), R).location!).code).toBe(to);
  });

  it("a weakness discarded is drawn", () => {
    let cover = "";
    let r = ea([R], ["0"], (g) => {
      cover = findByCode(g, "01007")!.id; // Cover Up
      moveCard(g, cover, ZONE.Deck, { inv: R, top: true });
    });
    r = toTurn(draw(r, "51063"), R);
    r = toTurn(move(r, card(gOf(r), near(gOf(r))).code), R);
    expect(card(gOf(r), cover).zone).toBe(ZONE.Threat);
  });
});

describe("51072 Eldritch Accord (script)", () => {
  it("may draw 1, may discard up to 2, then willpower (X = cards in hand): a failure is 2 horror", () => {
    let r = draw(ea(), "51072");
    expect(labels(r)).toEqual(["Draw 1 card", "No"]);
    r = pick(r, "Draw 1 card");
    r = until(r, (x) => labels(x).includes("Done"));
    const first = r.state.pending!.options[0].id;
    r = pick(r, first);
    r = until(r, (x) => labels(x).includes("Done"));
    r = pick(r, "Done");
    const inHand = inv(gOf(r), R).hand.length;
    r = toTurn(r, R);
    expect(lastTest(r)).toMatchObject({ skill: "willpower", difficulty: inHand, success: false });
    expect(horror(r)).toBe(2);
  });
});
