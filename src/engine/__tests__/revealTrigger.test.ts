import { afterEach, describe, expect, it } from "vitest";
import type { Ability } from "../../content/schema";
import { card, cardsOf, inv } from "../context";
import { game, move, toTurn, linkCodes } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";
import { moveCard } from "../movement";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const HALLWAY = "01112";
const saved = db.cards[HALLWAY].abilities;
afterEach(() => {
  db.cards[HALLWAY].abilities = saved;
});

/** Roland in the Study, the Hallway in play unrevealed beside it, with `ability` on the Hallway */
function withHallway(ability: Ability) {
  db.cards[HALLWAY].abilities = [ability];
  return game({
    investigators: [ROLAND],
    prep: (g) => {
      const hall = cardsOf(g.s).find((c) => c.code === HALLWAY)!;
      if (hall.zone !== ZONE.Location) moveCard(g, hall.id, ZONE.Location);
      linkCodes(g, "01111", HALLWAY);
    },
  });
}
const resources = (r: ReturnType<typeof game>) => inv(gOf(r), ROLAND).resources;

describe("after you reveal this location", () => {
  it("a forced reveal ability runs for the investigator who revealed it, after its clues are placed", () => {
    let r = withHallway({
      kind: "forced",
      trigger: "revealed",
      effects: [{ op: "gainResources", amount: 2 }],
    });
    const before = resources(r);
    r = toTurn(move(r, HALLWAY));
    const hall = cardsOf(r.state).find((c) => c.code === HALLWAY)!;
    expect(card(gOf(r), hall.id).revealed).toBe(true);
    expect(resources(r)).toBe(before + 2);
  });

  it("a reveal reaction is offered to the revealer", () => {
    let r = withHallway({
      kind: "reaction",
      trigger: "revealed",
      label: "Search the hallway",
      effects: [{ op: "gainResources", amount: 1 }],
    });
    const before = resources(r);
    r = move(r, HALLWAY);
    expect(options(r)).toContain("Search the hallway");
    r = toTurn(pick(r, "Search the hallway"));
    expect(resources(r)).toBe(before + 1);
  });
});
