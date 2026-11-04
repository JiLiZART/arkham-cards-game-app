import { afterEach, describe, expect, it } from "vitest";
import {
  addCounter,
  attachTo,
  card,
  cardsOf,
  inv,
  placeInvestigator,
  setCounter,
} from "../context";
import { game, inject, inPlay, toTurn } from "../kits/driver";
import { db, gOf } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { connections } from "../queries";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const DAISY = "01002";
const MINION = "01160"; // Ghoul Minion
const HALLWAY = "01112";
const CELLAR = "01114";
const ID = "zz-removal";

afterEach(() => {
  delete db.scenarios[ID];
  delete db.scripts[ID];
  delete db.cards[HALLWAY].victory;
});

/** The Gathering under a test id, with a script whose locationLeavesPlay hook records what left */
function withHook(seen: string[]) {
  db.scenarios[ID] = { ...db.scenarios["the-gathering"], id: ID };
  db.scripts[ID] = {
    ...db.scripts["the-gathering"],
    hooks: { locationLeavesPlay: (_g, loc) => void seen.push(loc) },
  };
}

describe("removing a location", () => {
  it("defeats the investigator there, discards its enemies, puts a Victory location with no clues in the display and tells the scenario", () => {
    const seen: string[] = [];
    withHook(seen);
    db.cards[HALLWAY].victory = 1;
    let hall = "";
    let enemy = "";
    let r = game({
      scenario: ID,
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        hall = cardsOf(g.s).find((c) => c.code === HALLWAY)!.id;
        moveCard(g, hall, ZONE.Location);
        setCounter(g, hall, "clues", 0);
        placeInvestigator(g, DAISY, hall);
        enemy = createCard(g, MINION, ZONE.Enemy);
        moveCard(g, enemy, ZONE.Enemy, { location: hall });
      },
    });
    r = toTurn(inject(r, () => {}, { t: STEP.RemoveLocation, location: hall }));
    expect(inv(gOf(r), DAISY).status).toBe("defeated");
    expect(inv(gOf(r), DAISY).mentalTrauma + inv(gOf(r), DAISY).physicalTrauma).toBe(0);
    expect(card(gOf(r), enemy).zone).toBe(ZONE.EncounterDiscard);
    expect(card(gOf(r), hall).zone).toBe(ZONE.Victory);
    expect(seen).toEqual([hall]);
  });

  it("moves the investigators there instead when the card says where", () => {
    let hall = "";
    let study = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        study = inv(g, ROLAND).location!;
        hall = cardsOf(g.s).find((c) => c.code === HALLWAY)!.id;
        moveCard(g, hall, ZONE.Location);
      },
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.RemoveLocation,
        location: study,
        investigators: "move",
        to: hall,
      }),
    );
    expect(inv(gOf(r), ROLAND).status).toBe("playing");
    expect(inv(gOf(r), ROLAND).location).toBe(hall);
    expect(card(gOf(r), study).zone).toBe(ZONE.EncounterDiscard);
  });
});

describe("the void", () => {
  it("keeps an enemy's damage and attachments, and a search over the void finds it and spawns it with them", () => {
    let enemy = "";
    let att = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        enemy = createCard(g, MINION, ZONE.Enemy);
        moveCard(g, enemy, ZONE.Enemy, { location: inv(g, ROLAND).location });
        addCounter(g, enemy, "damage", 1);
        att = inPlay(g, ROLAND, "01030");
        attachTo(g, att, enemy);
        for (const c of cardsOf(g.s))
          if (c.code === MINION && c.id !== enemy && c.zone === "encounterDeck")
            moveCard(g, c.id, ZONE.Removed);
      },
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "toVoid" },
        ctx: { source: enemy, you: ROLAND },
      }),
    );
    expect(card(gOf(r), enemy).zone).toBe(ZONE.Void);
    expect(card(gOf(r), enemy).damage).toBe(1);
    expect(card(gOf(r), att).attachedTo).toBe(enemy);
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: {
          op: "searchEncounterDraw",
          filter: { code: MINION },
          zones: ["deck", "discard", "void"],
        },
        ctx: { you: ROLAND },
      }),
    );
    expect(card(gOf(r), enemy).zone).toBe(ZONE.Enemy);
    expect(card(gOf(r), enemy).damage).toBe(1);
    expect(card(gOf(r), att).attachedTo).toBe(enemy);
  });
});

describe("locations in the encounter deck", () => {
  it("a location drawn from the encounter deck enters play connected to the drawer's location, its clues placed", () => {
    let cellar = "";
    let study = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        study = inv(g, ROLAND).location!;
        cellar = cardsOf(g.s).find((c) => c.code === CELLAR)!.id;
        moveCard(g, cellar, ZONE.EncounterDeck, { top: true });
      },
    });
    r = toTurn(inject(r, () => {}, { t: STEP.DrawEncounter, inv: ROLAND, card: cellar }));
    const c = card(gOf(r), cellar);
    expect([c.zone, c.revealed]).toEqual([ZONE.Location, true]);
    expect(c.clues).toBeGreaterThan(0);
    expect(connections(gOf(r), study)).toContain(cellar);
  });

  it("discarding the encounter deck until a location puts that location into play", () => {
    let cellar = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        cellar = cardsOf(g.s).find((c) => c.code === CELLAR)!.id;
        moveCard(g, cellar, ZONE.EncounterDeck);
      },
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "discardEncounterUntil", filter: { type: "location" }, then: "youDraw" },
        ctx: { you: ROLAND },
      }),
    );
    expect(card(gOf(r), cellar).zone).toBe(ZONE.Location);
  });

  it("a scenario's encounterLocations sets put their locations in the encounter deck", () => {
    const base = db.scenarios["the-gathering"];
    db.scenarios[ID] = { ...base, id: ID, encounterLocations: ["torch"] };
    const r = game({ scenario: ID, investigators: [ROLAND] });
    expect(cardsOf(r.state).find((c) => c.code === CELLAR)?.zone).toBe(ZONE.EncounterDeck);
  });
});
