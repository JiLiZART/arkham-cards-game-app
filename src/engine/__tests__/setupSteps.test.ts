import { afterEach, describe, expect, it } from "vitest";
import type { ScenarioDef, SetupStep } from "../../content/schema";
import { cardsOf } from "../context";
import { game, inject, investigate, lastTest } from "../kits/driver";
import { db } from "../kits/testkit";
import { STEP } from "../steps/step";

const ROLAND = "01001";
const MINION = "01160"; // Ghoul Minion: three copies in the Ghouls set
const ID = "zz-setup-steps";

/** The Gathering, under a test id, with `setup` after its own steps and the decks given */
function scenario(setup: SetupStep[], decks: Partial<Pick<ScenarioDef, "acts" | "agendas">> = {}) {
  const base = db.scenarios["the-gathering"];
  db.scenarios[ID] = { ...base, id: ID, setup: [...base.setup, ...setup], ...decks };
  return game({ scenario: ID, investigators: [ROLAND] });
}
afterEach(() => {
  delete db.scenarios[ID];
});
const where = (r: ReturnType<typeof game>, code: string) =>
  cardsOf(r.state)
    .filter((c) => c.code === code)
    .map((c) => c.zone);

describe("scenario setup steps", () => {
  it("setAside moves every copy of a code out of the encounter deck", () => {
    const r = scenario([{ do: "setAside", codes: [MINION] }]);
    expect(where(r, MINION)).toEqual(["setAside", "setAside", "setAside"]);
  });

  it("setAside with a count moves only that many copies", () => {
    const r = scenario([{ do: "setAside", codes: [MINION], count: 1 }]);
    expect(where(r, MINION).filter((z) => z === "setAside")).toHaveLength(1);
    expect(where(r, MINION).filter((z) => z !== "setAside")).toHaveLength(2);
  });

  it("remove takes every copy of a code out of the game", () => {
    const r = scenario([{ do: "remove", codes: [MINION] }]);
    expect(where(r, MINION)).toEqual(["removed", "removed", "removed"]);
  });

  it("a scenario with agendas and no acts sets up, and ends when its last agenda advances", () => {
    let r = scenario([], { acts: [], agendas: ["01107"] });
    expect(r.state.pending?.kind).toBe("turn");
    r = inject(r, () => {}, { t: STEP.AdvanceAgenda });
    expect(r.state.phase).toBe("ended");
  });
});

describe("the blood token (Children of Blood)", () => {
  it("drawn in a scenario whose table gives it no effect, it is a 0", () => {
    const r = investigate(game({ investigators: [ROLAND], bag: ["blood"] }));
    const t = lastTest(r)!;
    expect(t.tokens).toEqual(["blood"]);
    expect(t.total).toBe(t.base);
  });
});
