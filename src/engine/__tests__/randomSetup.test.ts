import { afterEach, describe, expect, it } from "vitest";
import type { SetupStep } from "../../content/schema";
import { card, cardsOf, currentAgenda, sideDeck } from "../context";
import { game } from "../kits/driver";
import { db, gOf } from "../kits/testkit";

const ROLAND = "01001";
const ID = "zz-random-setup";
const PARLOR = "01115";
const ATTIC = "01113";
const CELLAR = "01114";

function scenario(
  setup: SetupStep[],
  seed = 1,
  extra: Partial<(typeof db.scenarios)[string]> = {},
) {
  const base = db.scenarios["the-gathering"];
  db.scenarios[ID] = { ...base, id: ID, ...extra, setup: [...base.setup, ...setup] };
  return game({ scenario: ID, investigators: [ROLAND], seed });
}
afterEach(() => {
  delete db.scenarios[ID];
});
const zoneOf = (r: ReturnType<typeof game>, code: string) =>
  cardsOf(r.state).find((c) => c.code === code)?.zone;

describe("random setup steps", () => {
  it("chooseRandom: one of two set aside, the other removed; the seed decides, the same seed the same", () => {
    const step: SetupStep = {
      do: "chooseRandom",
      from: [ATTIC, CELLAR],
      then: "setAside",
      rest: "remove",
    };
    const picks = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
      const r = scenario([step], seed);
      const zones = [zoneOf(r, ATTIC), zoneOf(r, CELLAR)].sort();
      expect(zones).toEqual(["removed", "setAside"]);
      return zoneOf(r, ATTIC);
    });
    expect(new Set(picks).size).toBe(2);
    expect(zoneOf(scenario([step], 3), ATTIC)).toBe(zoneOf(scenario([step], 3), ATTIC));
  });

  it("chooseRandom an agenda: the chosen card is the agenda, its separate back set aside", () => {
    const step: SetupStep = {
      do: "chooseRandom",
      from: ["01121a", "01105"],
      then: "agenda",
      rest: "remove",
      backs: "setAside",
    };
    const outcomes = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const r = scenario([step], seed);
      const agenda = card(gOf(r), currentAgenda(gOf(r))!).code;
      outcomes.add(agenda);
      if (agenda === "01121a") expect(zoneOf(r, "01121b")).toBe("setAside");
      else expect(zoneOf(r, "01121a")).toBeUndefined();
    }
    expect(outcomes).toEqual(new Set(["01121a", "01105"]));
  });

  it("removeRandom: three of a side deck of eight leave the game", () => {
    const r = scenario([{ do: "removeRandom", from: "sideDeck:cultists", n: 3 }], 1, {
      sideDecks: { cultists: ["cultists", "rats"] },
    });
    expect(sideDeck(gOf(r), "cultists")).toHaveLength(5);
    expect(
      cardsOf(r.state).filter(
        (c) =>
          c.zone === "removed" && ["cultists", "rats"].includes(db.cards[c.code].encounterSet!),
      ),
    ).toHaveLength(3);
  });

  it("shuffleSetAside: the set-aside cards matching the filter are shuffled into the encounter deck", () => {
    const r = scenario([{ do: "shuffleSetAside", filter: { code: "01116" } }]);
    expect(zoneOf(r, "01116")).toBe("encounterDeck");
    expect(zoneOf(r, "01117")).toBe("setAside");
  });

  it("putRandomIntoPlay with a filter picks among the set-aside cards matching it", () => {
    const r = scenario([
      { do: "setAside", codes: [ATTIC, CELLAR, PARLOR] },
      {
        do: "putRandomIntoPlay",
        from: [],
        filter: { code: [ATTIC, CELLAR] },
        count: 1,
        removeRest: false,
      },
    ]);
    expect([zoneOf(r, ATTIC), zoneOf(r, CELLAR)].sort()).toEqual(["location", "setAside"]);
    expect(zoneOf(r, PARLOR)).toBe("setAside");
  });
});
