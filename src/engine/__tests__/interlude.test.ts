import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { campaignNotes } from "../world/flags";
import { game, inject } from "../kits/driver";
import { db, options, pick } from "../kits/testkit";
import { STEP } from "../steps/step";

const ROLAND = "01001";
const ID = "zz-interlude";
const QUIET_HALLS = "02042"; // its back reads the interlude in this test
const BEAST = "02044";
const saved = () => db.cards[QUIET_HALLS].abilities;
let before: ReturnType<typeof saved>;

beforeAll(async () => {
  await loadPack("dwl");
  before = saved();
});
afterEach(() => {
  delete db.scenarios[ID];
  db.cards[QUIET_HALLS].abilities = before;
});

function scenario() {
  db.cards[QUIET_HALLS].abilities = [
    { kind: "revelation", effects: [{ op: "readInterlude", id: "theRiver" }] },
  ];
  db.scenarios[ID] = {
    ...db.scenarios["the-gathering"],
    id: ID,
    agendas: [QUIET_HALLS, BEAST],
    interludes: {
      theRiver: {
        text: "The river runs red. Do you cross?",
        choices: [
          { id: "cross", label: "Cross the river", record: { id: "crossedTheRiver" } },
          { id: "wait", label: "Wait for dawn", record: { id: "waitedForDawn" } },
        ],
      },
    },
  };
  return game({ scenario: ID, investigators: [ROLAND] });
}

describe("a mid-scenario interlude", () => {
  it("an agenda back pauses the game on the interlude's choices; the answer is recorded for the campaign log", () => {
    let r = inject(scenario(), () => {}, { t: STEP.AdvanceAgenda });
    expect(options(r)).toEqual(["Cross the river", "Wait for dawn"]);
    expect(r.state.pending?.prompt).toContain("The river runs red");
    r = pick(r, "Wait for dawn");
    expect(campaignNotes(r.state)).toContainEqual({
      kind: "log",
      section: "campaign_notes",
      id: "waitedForDawn",
      value: true,
    });
    expect(campaignNotes(r.state).some((n) => n.id === "crossedTheRiver")).toBe(false);
  });

  it("its options are recorded by the choices' ids, so the same answer replays the same", () => {
    const run = () =>
      pick(
        inject(scenario(), () => {}, { t: STEP.AdvanceAgenda }),
        "Cross the river",
      );
    const r = inject(scenario(), () => {}, { t: STEP.AdvanceAgenda });
    expect(r.state.pending?.options.map((o) => o.id)).toEqual(["cross", "wait"]);
    expect(campaignNotes(run().state)).toEqual(campaignNotes(run().state));
  });
});
