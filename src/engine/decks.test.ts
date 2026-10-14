import { describe, expect, it } from "vitest";
import { fromArkhamDb, validateDeck } from "./decks";
import { db } from "./testkit";

describe("decks", () => {
  it("all starter decks are valid", () => {
    for (const d of Object.values(db.decks)) expect(validateDeck(db, d), d.id).toEqual([]);
  });

  it("rejects too many copies", () => {
    const d = structuredClone(db.decks["roland-starter"]);
    d.cards["01086"] = 3;
    expect(validateDeck(db, d).map((p) => p.message)).toContainEqual(expect.stringMatching(/too many copies of Knife/));
  });

  it("rejects off-class and missing signature cards", () => {
    const d = structuredClone(db.decks["roland-starter"]);
    delete d.cards["01006"];
    d.cards["01060"] = 1; // Shrivelling (mystic)
    const msgs = validateDeck(db, d).map((p) => p.message);
    expect(msgs).toContainEqual(expect.stringMatching(/missing required card Roland's .38 Special/));
    expect(msgs).toContainEqual(expect.stringMatching(/Shrivelling .* not allowed/));
  });

  it("imports an ArkhamDB deck export", () => {
    const slots: Record<string, number> = { "01006": 1, "01007": 1, "01000": 1 };
    for (const c of ["01016", "01017", "01018", "01019", "01020", "01021", "01022", "01023", "01024", "01025", "01030", "01031", "01032", "01033", "01034", "01035", "01036", "01037", "01038", "01039"]) slots[c] = 1;
    Object.assign(slots, { "01086": 2, "01087": 2, "01088": 2, "01089": 2, "01092": 2 });
    const d = fromArkhamDb({ id: 101, name: "Fed", investigator_code: "01001", slots });
    expect(d.randomBasicWeakness).toBe(true);
    expect(d.cards["01000"]).toBeUndefined();
    expect(validateDeck(db, d)).toEqual([]);
  });
});
