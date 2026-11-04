import { afterEach, describe, expect, it } from "vitest";
import type { Effect, SetupStep } from "../../content/schema";
import { cardsOf, inv } from "../context";
import { game, inject } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";
import { cellOf, connections, inColumn, inRow, locationAt } from "../queries";
import { STEP } from "../steps/step";

const ROLAND = "01001";
const ID = "zz-grid";
// the Gathering's set-aside rooms, used as tunnels on a grid
const A = "01112";
const B = "01113";
const C = "01114";
const D = "01115";

afterEach(() => {
  delete db.scenarios[ID];
});

/** The Gathering with orthogonal adjacency, no printed connections, and these setup steps after its own */
function grid(setup: SetupStep[]) {
  const base = db.scenarios["the-gathering"];
  db.scenarios[ID] = {
    ...base,
    id: ID,
    adjacency: "orthogonal",
    connections: [],
    layout: { "01111": [0, 0] },
    setup: [...base.setup, ...setup],
  };
  return game({ scenario: ID, investigators: [ROLAND] });
}
const idOf = (r: ReturnType<typeof game>, code: string) =>
  cardsOf(r.state).find((c) => c.code === code)!.id;
const eff = (r: ReturnType<typeof game>, effect: Effect) =>
  inject(r, () => {}, {
    t: STEP.Eff,
    effect,
    ctx: { you: ROLAND, source: inv(gOf(r), ROLAND).location },
  });

describe("the grid", () => {
  it("cells sharing a side are connected, diagonals are not", () => {
    const r = grid([
      { do: "placeLocation", code: A, at: [1, 1] },
      { do: "placeLocation", code: B, at: [2, 1] },
      { do: "placeLocation", code: C, at: [1, 2] },
    ]);
    const g = gOf(r);
    expect(connections(g, idOf(r, C))).toContain(idOf(r, A));
    expect(connections(g, idOf(r, C))).not.toContain(idOf(r, B));
    expect(inRow(g, 1)).toEqual([idOf(r, A), idOf(r, B)]);
    expect(inColumn(g, 1)).toEqual([idOf(r, A), idOf(r, C)]);
    expect(locationAt(g, [2, 1])).toBe(idOf(r, B));
  });

  it("a placement into an occupied cell fails and runs its else", () => {
    let r = grid([
      { do: "placeLocation", code: A, at: [0, 1] },
      { do: "placeLocation", code: B, at: [0, 2] },
    ]);
    const before = inv(gOf(r), ROLAND).resources;
    // the Study is at [0,0]: below it is [0,1], taken by A
    r = eff(r, {
      op: "placeLocation",
      code: C,
      at: { direction: "below", of: "yourLocation" },
      else: [{ op: "gainResources", amount: 2 }],
    });
    expect(inv(gOf(r), ROLAND).resources).toBe(before + 2);
    expect(cellOf(gOf(r), idOf(r, C))).toBeNull();
    r = eff(r, { op: "placeLocation", code: C, at: { direction: "right", of: "yourLocation" } });
    expect(cellOf(gOf(r), idOf(r, C))).toEqual([1, 0]);
  });

  it("a choice of cells asks the investigator; free takes the next free cell", () => {
    let r = grid([]);
    r = eff(r, {
      op: "placeLocation",
      code: A,
      at: {
        choose: [
          [2, 2],
          [3, 3],
        ],
      },
    });
    expect(r.state.pending?.promptKey).toBe("placeWhere");
    expect(options(r)).toHaveLength(2);
    r = pick(r, r.state.pending!.options[1].label);
    expect(cellOf(gOf(r), idOf(r, A))).toEqual([3, 3]);
    r = eff(r, { op: "placeLocation", code: B, at: "free" });
    expect(cellOf(gOf(r), idOf(r, B))).not.toBeNull();
  });

  it("a link and an unlink between named locations", () => {
    let r = grid([
      { do: "placeLocation", code: A, at: [5, 5] },
      { do: "link", a: A, b: "01111" },
    ]);
    const study = inv(gOf(r), ROLAND).location!;
    expect(connections(gOf(r), study)).toContain(idOf(r, A));
    r = eff(r, { op: "unlink", a: A, b: "yourLocation" });
    expect(connections(gOf(r), study)).not.toContain(idOf(r, A));
    r = eff(r, { op: "link", a: "yourLocation", b: D, oneWay: true });
    expect(connections(gOf(r), study)).not.toContain(idOf(r, D)); // D is not in play
  });
});
