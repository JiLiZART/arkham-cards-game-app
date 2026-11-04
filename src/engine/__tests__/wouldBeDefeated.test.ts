import { afterEach, describe, expect, it } from "vitest";
import { addCounter, card, inv } from "../context";
import { enemyHere, game, inject, inPlay, toTurn } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";
import { maxSanity } from "../queries";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const ID = "zz-defeat";
const KEY = "01030"; // Magnifying Glass, given a replacement for the test
const MINION = "01160";
const savedKey = db.cards[KEY].abilities;
const savedMinion = db.cards[MINION].abilities;
afterEach(() => {
  delete db.scenarios[ID];
  delete db.scripts[ID];
  db.cards[KEY].abilities = savedKey;
  db.cards[MINION].abilities = savedMinion;
});

const horrorTo =
  (n: number) => (g: Parameters<NonNullable<Parameters<typeof game>[0]["prep"]>>[0]) =>
    addCounter(g, ROLAND, "horror", n - inv(g, ROLAND).horror);

describe("would be defeated", () => {
  it("a scenario hook keeps an investigator playing at horror up to twice their sanity (Dim Carcosa)", () => {
    db.scenarios[ID] = { ...db.scenarios["the-gathering"], id: ID };
    db.scripts[ID] = {
      ...db.scripts["the-gathering"],
      hooks: {
        wouldBeDefeated: (g, who, by) =>
          by === "horror" && typeof who === "string" && inv(g, who).horror < 2 * maxSanity(g, who),
      },
    };
    let r = game({ scenario: ID, investigators: [ROLAND] });
    const sanity = maxSanity(gOf(r), ROLAND);
    r = toTurn(inject(r, horrorTo(sanity), { t: STEP.CheckDefeat, inv: ROLAND }));
    expect(inv(gOf(r), ROLAND).status).toBe("playing");
    r = inject(r, horrorTo(2 * sanity), { t: STEP.CheckDefeat, inv: ROLAND });
    expect(inv(gOf(r), ROLAND).status).toBe("defeated");
  });

  it("a card's replacement is offered, and taking it heals instead of the defeat", () => {
    db.cards[KEY].abilities = [
      {
        kind: "reaction",
        trigger: "wouldBeDefeated",
        label: "Heal instead",
        effects: [{ op: "cancel" }, { op: "heal", horror: 2 }, { op: "discardSelf" }],
      },
    ];
    let r = game({ investigators: [ROLAND], prep: (g) => void inPlay(g, ROLAND, KEY) });
    const sanity = maxSanity(gOf(r), ROLAND);
    r = inject(r, horrorTo(sanity), { t: STEP.CheckDefeat, inv: ROLAND });
    expect(options(r)).toContain("Heal instead");
    r = toTurn(pick(r, "Heal instead"));
    expect(inv(gOf(r), ROLAND).status).toBe("playing");
    expect(inv(gOf(r), ROLAND).horror).toBe(sanity - 2);
  });

  it("an enemy's replacement takes it elsewhere instead of the victory display or the discard", () => {
    db.cards[MINION].abilities = [
      {
        kind: "forced",
        trigger: "wouldBeDefeated",
        effects: [{ op: "cancel" }, { op: "removeSelf" }],
      },
    ];
    let enemy = "";
    let r = game({ investigators: [ROLAND], prep: (g) => (enemy = enemyHere(g, ROLAND, MINION)) });
    r = toTurn(inject(r, () => {}, { t: STEP.DefeatEnemy, enemy, by: ROLAND }));
    expect(card(gOf(r), enemy).zone).toBe(ZONE.Removed);
  });

  it("without a replacement nothing is asked: the defeat happens at once", () => {
    let r = game({ investigators: [ROLAND] });
    const before = r.state.counters.turn;
    r = inject(r, horrorTo(maxSanity(gOf(r), ROLAND)), { t: STEP.CheckDefeat, inv: ROLAND });
    expect(inv(gOf(r), ROLAND).status).toBe("defeated");
    expect(r.state.counters.turn).toBe(before);
  });
});
