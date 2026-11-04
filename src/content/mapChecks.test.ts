import { afterEach, describe, expect, it } from "vitest";
import type { SetupStep } from "./schema";
import { db } from "../engine/kits/testkit";
import { validateRefs } from "./loader";

const ID = "zz-map-check";
afterEach(() => {
  delete db.scenarios[ID];
});
const errors = (setup: SetupStep[]) => {
  db.scenarios[ID] = { ...db.scenarios["the-gathering"], id: ID, setup };
  return validateRefs(db)
    .filter((e) => e.file === `scenarios/${ID}.json`)
    .map((e) => e.message);
};

describe("the map at setup", () => {
  it("two locations put into play on one cell are an error; versions behind a log condition are not", () => {
    // The Gathering's layout puts the Study and the Hallway on [0,0]
    expect(errors([{ do: "putIntoPlay", codes: ["01111", "01112"] }])).toEqual([
      "01112 and 01111 are put into play on one cell (0,0)",
    ]);
    expect(
      errors([
        { do: "putIntoPlay", codes: ["01111"], when: { logHas: "a" } },
        { do: "putIntoPlay", codes: ["01112"], when: { not: { logHas: "a" } } },
      ]),
    ).toEqual([]);
  });

  it("a link to a location not put into play before it is an error", () => {
    expect(
      errors([
        { do: "putIntoPlay", codes: ["01111"] },
        { do: "link", a: "01111", b: "01113" },
      ]),
    ).toEqual(["link to 01113, which is not put into play before it"]);
  });
});
