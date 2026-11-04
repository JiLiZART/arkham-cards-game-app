import { afterEach, describe, expect, it } from "vitest";
import { db } from "../engine/kits/testkit";
import { validateRefs } from "./loader";

const NOTZ = "night-of-the-zealot";
const saved = db.campaigns[NOTZ].options;
afterEach(() => {
  db.campaigns[NOTZ].options = saved;
});

describe("a campaign option's encounter sets", () => {
  it("must exist: a set an option swaps in, out or adds that no card belongs to is an error", () => {
    db.campaigns[NOTZ].options = [
      {
        id: "zz",
        labelKey: "x",
        replaceSets: { no_such_set: "ancient_evils" },
        addSets: ["nor_this"],
      },
    ];
    const mine = validateRefs(db).filter((e) => e.path.startsWith("options."));
    expect(mine.map((e) => e.message)).toEqual([
      "missing encounter set no_such_set",
      "missing encounter set nor_this",
    ]);
  });

  it("known sets pass", () => {
    db.campaigns[NOTZ].options = [
      {
        id: "zz",
        labelKey: "x",
        replaceSets: { agents_of_hastur: "ancient_evils" },
        addSets: ["agents_of_yog"],
      },
    ];
    expect(validateRefs(db).filter((e) => e.path.startsWith("options."))).toEqual([]);
  });
});
