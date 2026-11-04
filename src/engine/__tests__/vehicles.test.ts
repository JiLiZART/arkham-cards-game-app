import { afterEach, describe, expect, it } from "vitest";
import { inv, type GameContext } from "../context";
import { addLocation, game, inject, toTurn } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import { noVehicles } from "../world/flags";

const ROLAND = "01001";
const DAISY = "01002";
const BOAT = "01030"; // Magnifying Glass, a vehicle for the test
const STUDY = "01111";
const HALLWAY = "01112";
const savedKeywords = db.cards[BOAT].keywords;
afterEach(() => {
  db.cards[BOAT].keywords = savedKeywords;
});

let boat = "";
let hall = "";
/** the boat at the Study, the Hallway beside it */
function dock(game: GameContext) {
  db.cards[BOAT].keywords = ["vehicle"];
  boat = createCard(game, BOAT, ZONE.Limbo);
  moveCard(game, boat, ZONE.Play, { location: inv(game, ROLAND).location });
  hall = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
}
const enter = /^Enter /;
const leave = /^Leave /;
const offers = (r: ReturnType<typeof game>, re: RegExp) => options(r).some((o) => re.test(o));

describe("vehicles", () => {
  it("entering and leaving are fast actions, each once per round", () => {
    let r = game({ investigators: [ROLAND], prep: dock });
    const actions = inv(gOf(r), ROLAND).actionsLeft;
    expect(offers(r, enter)).toBe(true);
    r = pick(r, enter);
    expect(inv(gOf(r), ROLAND).vehicle).toBe(boat);
    expect(inv(gOf(r), ROLAND).actionsLeft).toBe(actions);
    expect(offers(r, enter)).toBe(false);
    r = pick(r, leave);
    expect(inv(gOf(r), ROLAND).vehicle ?? null).toBeNull();
    expect(offers(r, leave)).toBe(false);
    expect(offers(r, enter)).toBe(false);
  });

  it("a moving vehicle carries the investigators in it, who arrive without a move action", () => {
    let r = game({ investigators: [ROLAND, DAISY], prep: dock });
    r = inject(r, (g) => {
      g.s.world.tables.investigator[ROLAND].vehicle = boat;
      g.s.world.tables.investigator[DAISY].vehicle = boat;
    });
    r = toTurn(inject(r, () => {}, { t: STEP.MoveVehicle, vehicle: boat, to: hall }));
    expect([inv(gOf(r), ROLAND).location, inv(gOf(r), DAISY).location]).toEqual([hall, hall]);
    expect(r.state.log.filter((e) => e.type === "move").map((e) => e.inv)).toEqual(
      expect.arrayContaining([ROLAND, DAISY]),
    );
  });

  it("no vehicles may be entered where the scenario forbids it", () => {
    const r = game({ investigators: [ROLAND], prep: (g) => (dock(g), noVehicles.set(g, true)) });
    expect(offers(r, enter)).toBe(false);
  });
});
