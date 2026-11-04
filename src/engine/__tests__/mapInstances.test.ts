import { describe, expect, it } from "vitest";
import { inv, type GameContext } from "../context";
import { game, inject, move, toTurn } from "../kits/driver";
import { db, gOf, options } from "../kits/testkit";
import { createCard, link, linkOneWay, moveCard } from "../movement";
import { cellOf, connections, connectionsOf } from "../queries";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const STUDY = "01111";
const HALLWAY = "01112"; // printed: connected to the Attic, the Cellar and the Parlor
const ATTIC = "01113";
const CELLAR = "01114";

/** two Hallways in play, the Attic and the Cellar; the first Hallway linked to the Study */
function twoHallways(game: GameContext) {
  const put = (code: string) => {
    const id = createCard(game, code, ZONE.Limbo);
    moveCard(game, id, ZONE.Location);
    return id;
  };
  return {
    h1: put(HALLWAY),
    h2: put(HALLWAY),
    attic: put(ATTIC),
    cellar: put(CELLAR),
    study: inv(game, ROLAND).location!,
  };
}

describe("connections per location instance", () => {
  it("two copies share their printed connections; a link belongs to one of them", () => {
    let ids!: ReturnType<typeof twoHallways>;
    const r = game({
      investigators: [ROLAND],
      prep: (g) => {
        ids = twoHallways(g);
        link(g, ids.h1, ids.study);
      },
    });
    const g = gOf(r);
    expect(connections(g, ids.h1).sort()).toEqual([ids.attic, ids.cellar, ids.study].sort());
    expect(connections(g, ids.h2).sort()).toEqual([ids.attic, ids.cellar].sort());
    expect(connectionsOf(db, r.state, ids.h1).sort()).toEqual(connections(g, ids.h1).sort());
    // each copy has a cell of its own
    expect(cellOf(g, ids.h1)).not.toEqual(cellOf(g, ids.h2));
  });

  it("a one-way link offers the move one way only", () => {
    let ids!: ReturnType<typeof twoHallways>;
    const r = game({
      investigators: [ROLAND],
      prep: (g) => {
        ids = twoHallways(g);
        linkOneWay(g, ids.study, ids.h1);
      },
    });
    expect(options(r).filter((o) => o === "Move to Hallway")).toHaveLength(1);
    const there = toTurn(move(r, HALLWAY));
    expect(connections(gOf(there), ids.h1)).not.toContain(ids.study);
  });

  it("a location leaving play drops its links and frees its cell", () => {
    let ids!: ReturnType<typeof twoHallways>;
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        ids = twoHallways(g);
        link(g, ids.h1, ids.study);
      },
    });
    const cell = cellOf(gOf(r), ids.h1);
    r = inject(r, () => {}, { t: STEP.RemoveLocation, location: ids.h1 });
    const g = gOf(r);
    expect(connections(g, ids.study)).not.toContain(ids.h1);
    expect(cellOf(g, ids.h1)).toBeNull();
    // the freed cell is taken by the next location to enter play there
    const again = inject(r, (g2) => moveCard(g2, ids.h1, ZONE.Location));
    expect(cellOf(gOf(again), ids.h1)).toEqual(cell);
    expect(connections(gOf(again), ids.h1)).not.toContain(ids.study);
  });

  it("a location pushed aside because its layout cell was held takes that cell once it is free (The Gathering's act 1)", () => {
    let hall = "";
    let study = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        study = inv(g, ROLAND).location!;
        // the act puts the Hallway into play while the Study still holds [0,0], then removes the Study
        hall = createCard(g, HALLWAY, ZONE.Limbo);
        moveCard(g, hall, ZONE.Location);
      },
    });
    expect(cellOf(gOf(r), hall)).not.toEqual([0, 0]);
    r = inject(r, (g) => moveCard(g, study, ZONE.Removed));
    expect(cellOf(gOf(r), hall)).toEqual(db.scenarios["the-gathering"].layout[HALLWAY]);
  });

  it("the starting locations keep their layout cells (The Gathering's Study at [0,0])", () => {
    const r = game({ investigators: [ROLAND] });
    expect(cellOf(gOf(r), inv(gOf(r), ROLAND).location!)).toEqual(
      db.scenarios["the-gathering"].layout[STUDY],
    );
  });
});
