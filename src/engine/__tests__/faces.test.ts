import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { addCounter, attachTo, card, cardsOf, inv } from "../context";
import { game, inject, inPlay, toTurn } from "../kits/driver";
import { db, gOf } from "../kits/testkit";
import { createCard, flip, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const HARUKO = "03078"; // an asset whose other face (03078b) is a story card
const SICKENING = "03065"; // a story card whose other face (03065b) is an enemy
const CONSTANCE = "03076a"; // an asset whose other face is 03076b, a story card
const ID = "zz-faces";

beforeAll(() => loadPack("ptc"));
afterEach(() => {
  delete db.scenarios[ID];
  delete db.cards["03076b"].story;
});

describe("card faces", () => {
  it("the loader pairs a b face with its front", () => {
    expect(db.cards[HARUKO].back).toBe("03078b");
    expect(db.cards["03078b"].front).toBe(HARUKO);
    expect(db.cards[CONSTANCE].back).toBe("03076b");
  });

  it("flipping an asset to its story side keeps its tokens and attachments and takes it out of the asset area", () => {
    let id = "";
    let att = "";
    const r = game({
      investigators: [ROLAND],
      prep: (g) => {
        id = inPlay(g, ROLAND, HARUKO);
        addCounter(g, id, "clues", 2);
        att = inPlay(g, ROLAND, "01030"); // Magnifying Glass, attached to the asset for the test
        attachTo(g, att, id);
        flip(g, id);
      },
    });
    const c = card(gOf(r), id);
    expect(c.code).toBe("03078b");
    expect(c.clues).toBe(2);
    expect(c.zone).not.toBe(ZONE.Play);
    expect(c.controller).toBe(ROLAND);
    expect(card(gOf(r), att).attachedTo).toBe(id);
    expect(card(gOf(r), att).zone).toBe(ZONE.Play);
  });

  it("flipping a story card into an enemy makes the same instance an enemy at its location, its clues kept", () => {
    let id = "";
    let at: string | null = null;
    const r = game({
      investigators: [ROLAND],
      prep: (g) => {
        at = inv(g, ROLAND).location;
        id = createCard(g, SICKENING, ZONE.SetAside);
        moveCard(g, id, ZONE.SetAside, { location: at });
        addCounter(g, id, "clues", 1);
        flip(g, id);
      },
    });
    const c = card(gOf(r), id);
    expect([c.code, c.zone, c.location, c.clues]).toEqual(["03065b", ZONE.Enemy, at, 1]);
  });

  it("a scenario whose set lists both faces creates one card, showing its front", () => {
    db.scenarios[ID] = {
      ...db.scenarios["the-gathering"],
      id: ID,
      encounterSets: [...db.scenarios["the-gathering"].encounterSets, "the_last_king"],
    };
    const r = game({ scenario: ID, investigators: [ROLAND] });
    expect(cardsOf(r.state).filter((c) => c.code === "03076b")).toEqual([]);
    expect(cardsOf(r.state).filter((c) => c.code.startsWith("03076"))).toHaveLength(1);
  });

  it("resolving a story face shows it, then does what the card says (flip back)", () => {
    db.cards["03076b"].story = { after: "flipBack" };
    let id = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        id = inPlay(g, ROLAND, CONSTANCE);
        flip(g, id);
      },
    });
    expect(card(gOf(r), id).code).toBe("03076b");
    r = toTurn(inject(r, () => {}, { t: STEP.ResolveStory, card: id, you: ROLAND }));
    expect(r.events.some((e) => e.type === "storyShown" && e.card === id)).toBe(true);
    expect(card(gOf(r), id).code).toBe(CONSTANCE);
    expect(card(gOf(r), id).zone).toBe(ZONE.Play);
  });

  it("the flip and resolveStory effects turn the card and resolve its story, as its data says", () => {
    db.cards["03076b"].story = { after: "remove" };
    let id = "";
    let r = game({ investigators: [ROLAND], prep: (g) => (id = inPlay(g, ROLAND, CONSTANCE)) });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "resolveStory", flip: true },
        ctx: { source: id, you: ROLAND },
      }),
    );
    expect(card(gOf(r), id).code).toBe("03076b");
    expect(card(gOf(r), id).zone).toBe(ZONE.Removed);
  });

  it("swap makes the card a set-aside copy of another, that copy leaving the game", () => {
    let id = "";
    let copy = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        id = inPlay(g, ROLAND, HARUKO);
        addCounter(g, id, "clues", 1);
        copy = createCard(g, CONSTANCE, ZONE.SetAside);
      },
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "swap", with: CONSTANCE },
        ctx: { source: id, you: ROLAND },
      }),
    );
    expect([card(gOf(r), id).code, card(gOf(r), id).clues]).toEqual([CONSTANCE, 1]);
    expect(card(gOf(r), copy).zone).toBe(ZONE.Removed);
  });
});
