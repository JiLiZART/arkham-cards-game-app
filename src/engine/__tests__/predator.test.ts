import { afterEach, describe, expect, it } from "vitest";
import type { CardDef } from "../../content/schema";
import { card, inv, type GameContext } from "../context";
import { addLocation, enemyHere, game, inject } from "../kits/driver";
import { db, gOf } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const PREDATOR = "01160"; // Ghoul Minion, a Predator for the test
const RATS = "01159"; // Swarm of Rats: health 1
const SOUTHSIDE = "01126";
const saved: Partial<CardDef> = {
  keywords: db.cards[PREDATOR].keywords,
  abilities: db.cards[RATS].abilities,
};
afterEach(() => {
  db.cards[PREDATOR].keywords = saved.keywords!;
  db.cards[RATS].abilities = saved.abilities!;
});

const enemyAt = (game: GameContext, code: string, loc: string) => {
  const id = createCard(game, code, ZONE.Enemy);
  moveCard(game, id, ZONE.Enemy, { location: loc });
  return id;
};

describe("Predator", () => {
  it("a ready unengaged predator attacks a non-Elite enemy at its location after the attacks; the defeat is via the predator", () => {
    db.cards[PREDATOR].keywords = ["predator"];
    // the rats' reaction to a defeat via the predator keyword (Under a Blood Moon reads it)
    db.cards[RATS].abilities = [
      {
        kind: "forced",
        trigger: "enemyDefeatedSelf",
        condition: { defeatedVia: "predator" },
        effects: [{ op: "gainResources", amount: 3, target: "lead" }],
      },
    ];
    let predator = "";
    let rats = "";
    const r0 = game({
      investigators: [ROLAND],
      prep: (g) => {
        const south = addLocation(g, SOUTHSIDE, [["01111", SOUTHSIDE]]);
        predator = enemyAt(g, PREDATOR, south);
        rats = enemyAt(g, RATS, south);
      },
    });
    const before = inv(gOf(r0), ROLAND).resources;
    const r = inject(r0, () => {}, { t: STEP.PredatorAttacks });
    expect(card(gOf(r), rats).zone).toBe(ZONE.EncounterDiscard);
    expect(
      r.state.log.some(
        (e) => e.type === "enemyDefeated" && e.card === rats && e.data?.via === "predator",
      ),
    ).toBe(true);
    expect(inv(gOf(r), ROLAND).resources).toBe(before + 3);
    expect(card(gOf(r), predator).location).not.toBeNull();
  });

  it("an engaged predator does not attack", () => {
    db.cards[PREDATOR].keywords = ["predator"];
    let rats = "";
    const r0 = game({
      investigators: [ROLAND],
      prep: (g) => {
        enemyHere(g, ROLAND, PREDATOR);
        rats = enemyAt(g, RATS, inv(g, ROLAND).location!);
      },
    });
    const r = inject(r0, () => {}, { t: STEP.PredatorAttacks });
    expect(card(gOf(r), rats).zone).toBe(ZONE.Enemy);
  });
});
