/** The Poisoned weakness (engine-tfa-supplies-vengeance-exploration group 4). */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { CardDef, ScenarioDef } from "../../content/schema";
import { createGame } from "../index";
import { inv, setController } from "../context";
import { createCard } from "../movement";
import { cardsIn, checkCondition, POISONED, poisoned, threatArea } from "../queries";
import { preyCandidates } from "../rules/enemies";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import { game, inject, toTurn } from "../kits/driver";
import { db, gOf, mutate, putEnemy, skipMulligans } from "../kits/testkit";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

beforeAll(async () => {
  await loadPack("tfa");
});

const R = "01001";
const A = "01004";
const FANG = "04098"; // Fang of Yig: Prey - Poisoned investigator
const ID = "zz-poisoned";
let fang: CardDef;
beforeAll(() => {
  fang = db.cards[FANG];
});
afterEach(() => {
  delete db.scenarios[ID];
  db.cards[FANG] = fang;
});

/** The Gathering with every Poisoned set aside first */
const start = (who = [R, A]) => {
  db.scenarios[ID] = {
    ...db.scenarios["the-gathering"],
    id: ID,
    setup: [...db.scenarios["the-gathering"].setup, { do: "setAsidePoisoned", copies: 4 }],
  } as ScenarioDef;
  return toTurn(skipMulligans(game({ scenario: ID, investigators: who, bag: ["0"] })));
};
const poison = (r: ReturnType<typeof start>, you: string) =>
  inject(r, () => {}, { t: STEP.Eff, effect: { op: "poison" }, ctx: { you } });

describe("Poisoned (4.1)", () => {
  it("setup sets aside the copies not in a deck", () => {
    const r = start();
    expect(cardsIn(gOf(r), ZONE.SetAside).filter((c) => c.code === POISONED)).toHaveLength(4);
  });

  it("poison puts a set-aside copy in your threat area once", () => {
    let r = poison(start(), R);
    expect(poisoned(gOf(r), R)).toBe(true);
    expect(checkCondition(gOf(r), { poisoned: true }, { you: R })).toBe(true);
    expect(checkCondition(gOf(r), { poisoned: true }, { you: A })).toBe(false);
    r = poison(r, R);
    expect(threatArea(gOf(r), R).filter((c) => c.code === POISONED)).toHaveLength(1);
    expect(cardsIn(gOf(r), ZONE.SetAside).filter((c) => c.code === POISONED)).toHaveLength(3);
  });

  it("Fang of Yig preys on the poisoned investigator, on anyone when nobody is", () => {
    // the card's data is the campaign change's: its prey set here
    db.cards[FANG] = { ...fang, prey: "poisoned" };
    let id = "";
    let r = mutate(start(), (g) => void (id = putEnemy(g, FANG, inv(g, R).location!)));
    expect([...preyCandidates(gOf(r), id, [R, A])].sort()).toEqual([R, A].sort());
    r = poison(r, A);
    expect(preyCandidates(gOf(r), id, [R, A])).toEqual([A]);
  });
});

describe("Poisoned across scenarios (4.2)", () => {
  it("a Poisoned in play at the end joins the deck and starts the next scenario in the threat area", () => {
    const c = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 3,
      investigators: [{ code: R, deckId: "roland-starter" }],
    });
    const setup = scenarioSetup(db, { ...c, flow: { ...c.flow, play: "the-gathering" } }, 1);
    let r = toTurn(skipMulligans(createGame(db, setup)));
    // as Snake Bite would leave it
    r = mutate(r, (g) => {
      const id = createCard(g, POISONED, ZONE.Threat);
      setController(g, id, R);
    });
    r = inject(r, () => {}, { t: STEP.Resolution, id: "R1" });
    const after = applyScenarioEnd(db, c, r.state);
    expect(after.investigators[0].deck.filter((x) => x === POISONED)).toHaveLength(1);
    const next = createGame(db, {
      ...setup,
      investigators: [{ code: R, deck: after.investigators[0].deck }],
    });
    expect(poisoned(gOf(next), R)).toBe(true);
  });
});
