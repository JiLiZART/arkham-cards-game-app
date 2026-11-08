/**
 * The Path to Carcosa's flow walked end to end (campaign-the-path-to-carcosa task 10.1): the prologue, Curtain Call to
 * Dim Carcosa, both interludes and the epilogue, on a fixed log. Scenarios end at once with the resolution given; what a
 * scenario script records at its end (`log:hidden:*`, `count:*`, `cards:*`) is written into the log first, as the
 * script would. Prompts take the answer given for them, else their first open one.
 *
 * Return to The Path to Carcosa walks the same way (campaign-return-to-the-path-to-carcosa task 11.1): its flow is the
 * base's under the Return scenarios' ids, so every case below runs for both campaigns, a Return scenario named by its
 * base's id.
 */
import { describe, expect, it } from "vitest";
import { advance, openChoices, startResolution } from "../flow";
import { startCampaign } from "../campaign";
import type { CampaignState, FlowValue } from "../types";
import { db } from "../../kits/testkit";
import { addCards, hasEntry, logCount, record, setCount } from "../log";

const CAMPAIGNS = ["the-path-to-carcosa", "return-to-the-path-to-carcosa"];
const baseId = (id: string) => id.replace(/^return-to-/, "");
const ROLAND = "01001";
const DAISY = "01002";
const SCENARIOS = [
  "curtain-call",
  "the-last-king",
  "echoes-of-the-past",
  "the-unspeakable-oath",
  "a-phantom-of-truth",
  "the-pallid-mask",
  "black-stars-rise",
  "dim-carcosa",
];

interface End {
  resolution: string;
  resigned?: boolean;
  defeated?: boolean;
  /** what the scenario's script records at its end */
  log?: (c: CampaignState) => void;
}

/** the way through to a win: Daniel saved, no one possessed */
const WIN: Record<string, End> = {
  "curtain-call": { resolution: "R1" },
  "the-last-king": { resolution: "R1" },
  "echoes-of-the-past": { resolution: "R1" },
  "the-unspeakable-oath": {
    resolution: "R3",
    log: (c) => (c.log = record(c.log, "danielSurvived", "hidden")),
  },
  "a-phantom-of-truth": { resolution: "R1" },
  "the-pallid-mask": { resolution: "R1" },
  "black-stars-rise": { resolution: "R1" },
  "dim-carcosa": { resolution: "R1" },
};

/** called after each scenario's resolution has run, and as each scenario is offered */
type Seen = (c: CampaignState, at: { resolved?: string; offered?: string }) => void;

function walkIn(
  campaignId: string,
  ends: Record<string, Partial<End>> = {},
  answers: Record<string, FlowValue> = {},
  seen: Seen = () => {},
) {
  let c = startCampaign(db, {
    campaignId,
    difficulty: "standard",
    seed: 3,
    investigators: [
      { code: ROLAND, deckId: "roland-starter" },
      { code: DAISY, deckId: "daisy-starter" },
    ],
  });
  const played: string[] = [];
  const items: string[] = [];
  const stories = new Set<string>();
  const note = () => {
    if (c.flow.item && items.at(-1) !== c.flow.item) items.push(c.flow.item);
    for (const s of c.flow.shown) if ("story" in s) stories.add(baseId(s.story));
  };
  for (let n = 0; n < 2000; n++) {
    note();
    if (c.flow.waiting) {
      const { id, step } = c.flow.waiting;
      if (step.kind === "play") seen(c, { offered: baseId(step.scenario) });
      const active = c.investigators.filter((i) => i.status === "active").map((i) => i.code);
      const value: FlowValue =
        baseId(id) in answers
          ? answers[baseId(id)]
          : step.kind === "chooseOne"
            ? openChoices(db, c, step.choices)[0].id
            : step.kind === "investigatorChoice" || step.kind === "investigator"
              ? active[0]
              : "continue";
      c = advance(db, c, value);
    } else if (c.flow.playing && c.flow.play) {
      const id = c.flow.play;
      const base = baseId(id);
      const end: End = { ...WIN[base], ...ends[base] };
      played.push(base);
      end.log?.(c);
      const codes = c.investigators.filter((i) => i.status === "active").map((i) => i.code);
      c.history.push({ scenarioId: id, resolution: end.resolution, xp: 0, victory: 0 });
      c = startResolution(db, c, {
        id,
        resolution: end.resolution,
        victory: 0,
        victoryCodes: [],
        cultistsVictory: [],
        cultistsRemaining: [],
        notResigned: end.resigned ? [] : codes,
        resigned: end.resigned ? codes : [],
        defeated: end.defeated ? codes : [],
      });
      seen(c, { resolved: base });
    } else break;
  }
  note();
  return { c, played, items, stories };
}

/** the campaign as it stands at the first moment `pick` names */
function atIn(
  campaignId: string,
  pick: (x: { resolved?: string; offered?: string }) => boolean,
  ends: Record<string, Partial<End>> = {},
  answers: Record<string, FlowValue> = {},
): CampaignState {
  let out: CampaignState | undefined;
  walkIn(campaignId, ends, answers, (c, x) => {
    if (!out && pick(x)) out = structuredClone(c);
  });
  if (!out) throw new Error("never reached");
  return out;
}

const symbols = (bag: string[]) => ({
  cultist: bag.filter((t) => t === "cultist").length,
  tablet: bag.filter((t) => t === "tablet").length,
  elderThing: bag.filter((t) => t === "elderThing").length,
});
const ONE_EACH = { cultist: 1, tablet: 1, elderThing: 1 };
it("Return to The Path to Carcosa's flow is the base's under the Return scenarios' ids", () => {
  let base = JSON.stringify(db.flows["the-path-to-carcosa"]);
  for (const id of SCENARIOS)
    base = base.replace(new RegExp(`"${id}(?=[":])`, "g"), `"return-to-${id}`);
  expect(db.flows["return-to-the-path-to-carcosa"]).toEqual(JSON.parse(base));
});

describe.each(CAMPAIGNS)("%s's flow", (campaignId) => {
  type Ends = Record<string, Partial<End>>;
  const walk = (ends?: Ends, answers?: Record<string, FlowValue>) =>
    walkIn(campaignId, ends, answers);
  const at = (
    pick: (x: { resolved?: string; offered?: string }) => boolean,
    ends?: Ends,
    answers?: Record<string, FlowValue>,
  ) => atIn(campaignId, pick, ends, answers);
  const bagAfter = (scenario: string, ends: Record<string, Partial<End>>) =>
    symbols(at((x) => x.resolved === scenario, ends).chaosBag);

  it("runs from the prologue through 8 scenarios and both interludes to the epilogue", () => {
    const { c, played, items, stories } = walk();
    expect(played).toEqual(SCENARIOS);
    // the epilogue item passes unseen: it shows nothing to no one possessed
    expect(items).toEqual(["ptc-prologue", "ptc-interlude1", "ptc-interlude2"]);
    expect(stories.has("ptc-prologue:intro")).toBe(true);
    // Interlude II reads Daniel's fate from the scenario's record
    expect(stories.has("ptc-interlude2:daniel_survived")).toBe(true);
    expect(c.result).toBe("win");
    expect(c.flow.waiting).toBeNull();
    // no one possessed: the epilogue is for no one
    expect(stories.has("ptc-epilogue:possessed")).toBe(false);
  });

  it("the investigators Dim Carcosa lists as possessed read the epilogue", () => {
    const { c, stories, items } = walk({
      "dim-carcosa": { log: (c) => (c.log = addCards(c.log, "possessed", [ROLAND], false)) },
    });
    expect(items.at(-1)).toBe("ptc-epilogue");
    expect(c.result).toBe("win");
    expect(c.log.campaign_notes.cards.possessed).toEqual([ROLAND]);
    expect(stories.has("ptc-epilogue:possessed")).toBe(true);
  });

  it("Curtain Call R1 after robbing the box office: the police are suspicious", () => {
    const robbed = walk({
      "curtain-call": { log: (c) => (c.log = record(c.log, "stoleFromBoxOffice", "hidden")) },
    });
    expect(hasEntry(robbed.c.log, "policeAreSuspicious")).toBe(true);
    expect(hasEntry(walk().c.log, "policeAreSuspicious")).toBe(false);
  });

  describe("The Last King and Interlude I", () => {
    it("R2 and R3 skip Interlude I; the symbol tokens become one of each", () => {
      for (const resolution of ["R2", "R3"]) {
        const { items, played } = walk({ "the-last-king": { resolution } });
        expect(items, resolution).not.toContain("ptc-interlude1");
        expect(items).toContain("ptc-interlude2");
        expect(played).toEqual(SCENARIOS);
        expect(bagAfter("the-last-king", { "the-last-king": { resolution } })).toEqual(ONE_EACH);
      }
    });

    it("no resolution: Resolution 1 if anyone resigned, else Resolution 2", () => {
      const resigned = { "the-last-king": { resolution: "none", resigned: true } };
      const defeated = { "the-last-king": { resolution: "none", defeated: true } };
      expect(walk(resigned).items).toContain("ptc-interlude1");
      expect(walk(defeated).items).not.toContain("ptc-interlude1");
      expect(bagAfter("the-last-king", defeated)).toEqual(ONE_EACH);
    });

    it("1 experience per 2 clues on the act, split as evenly as possible", () => {
      const xp = (clues: number) =>
        at((x) => x.resolved === "the-last-king", {
          "the-last-king": {
            log: (c) => (c.log = setCount(c.log, "tlkCluesOnAct", "set", clues, "hidden")),
          },
        }).investigators.map((i) => i.xp);
      expect(xp(0)).toEqual([0, 0]);
      expect(xp(5)).toEqual([1, 1]);
      expect(xp(7)).toEqual([2, 1]);
    });

    for (const [choice, kept] of [
      ["go_back_in", "elderThing"],
      ["block_door", "tablet"],
      ["burn_house", "cultist"],
    ] as const)
      it(`${choice}: every symbol token removed, then 2 ${kept}`, () => {
        // two of each in the bag before the interlude
        const ends = {
          "the-last-king": {
            log: (c: CampaignState) => {
              for (const t of ["cultist", "tablet", "elderThing"] as const) c.chaosBag.push(t, t);
            },
          },
        };
        const answers = { "ptc-interlude1:house_choice": choice };
        const c = at((x) => x.offered === "echoes-of-the-past", ends, answers);
        expect(symbols(c.chaosBag)).toEqual({
          cultist: kept === "cultist" ? 2 : 0,
          tablet: kept === "tablet" ? 2 : 0,
          elderThing: kept === "elderThing" ? 2 : 0,
        });
        if (choice === "burn_house") {
          for (const vip of ["03065b", "03066b", "03067b", "03068b", "03069b"])
            expect(hasEntry(c.log, vip, "vipsSlain"), vip).toBe(true);
          expect(hasEntry(c.log, "slayedTheMonsters")).toBe(true);
          expect(logCount(c.log, "conviction", "conviction")).toBe(2);
        }
        if (choice === "go_back_in") expect(hasEntry(c.log, "intrudedOnSecretMeeting")).toBe(true);
        if (choice === "block_door") expect(hasEntry(c.log, "fledDinnerParty")).toBe(true);
      });
  });

  it("Echoes of the Past: no resolution runs Resolution 4", () => {
    const ends = { "echoes-of-the-past": { resolution: "none" } };
    expect(hasEntry(walk(ends).c.log, "followersOfSignFoundWay")).toBe(true);
    expect(bagAfter("echoes-of-the-past", ends)).toEqual(ONE_EACH);
  });

  describe("The Unspeakable Oath and Interlude II", () => {
    it("no resolution with survivors runs Resolution 1: the King claimed its victims, Interlude II skipped", () => {
      const { c, items, played } = walk({ "the-unspeakable-oath": { resolution: "none" } });
      expect(hasEntry(c.log, "kingClaimedVictims")).toBe(true);
      expect(items).not.toContain("ptc-interlude2");
      expect(played).toEqual(SCENARIOS);
    });

    it("Daniel's fate is read from the scenario's record", () => {
      const possessed = walk({
        "the-unspeakable-oath": {
          log: (c) => (c.log = record(c.log, "danielPossessed", "hidden")),
        },
      });
      expect(possessed.stories.has("ptc-interlude2:daniel_possessed")).toBe(true);
      const gone = walk({ "the-unspeakable-oath": { log: () => {} } });
      expect(gone.stories.has("ptc-interlude2:daniel_did_not_survive")).toBe(true);
    });

    it("heeding the warning marks two Conviction, ignoring it two Doubt", () => {
      const heed = walk({}, { "ptc-interlude2:warning_choice": "heed" }).c.log;
      const ignore = walk({}, { "ptc-interlude2:warning_choice": "ignore" }).c.log;
      expect(hasEntry(heed, "heededDanielsWarning")).toBe(true);
      expect(hasEntry(ignore, "ignoredDanielsWarning")).toBe(true);
      expect(
        logCount(heed, "conviction", "conviction") - logCount(ignore, "conviction", "conviction"),
      ).toBe(2);
      expect(logCount(ignore, "doubt", "doubt") - logCount(heed, "doubt", "doubt")).toBe(2);
    });
  });

  it("A Phantom of Truth's Dream 8 reads the Chasing the Stranger tally: 4 or more goes to Dream 10", () => {
    // Curtain Call's R1 adds 2 to what its script counted
    const stories = (tally: number) =>
      walk({
        "curtain-call": {
          log: (c) =>
            (c.log = setCount(c.log, "chasingTheStranger", "set", tally - 2, "chasingTheStranger")),
        },
      }).stories;
    const three = stories(3);
    expect(three.has("a-phantom-of-truth:dream_9")).toBe(true);
    expect(three.has("a-phantom-of-truth:dream_10")).toBe(false);
    const four = stories(4);
    expect(four.has("a-phantom-of-truth:dream_10")).toBe(true);
    expect(four.has("a-phantom-of-truth:dream_9")).toBe(false);
  });

  it("The Pallid Mask's Conviction or Doubt is the scenario's record, not marked again", () => {
    const recorded = walk({
      "the-pallid-mask": { log: (c) => (c.log = record(c.log, "tpmConvictionOrDoubt", "hidden")) },
    }).c.log;
    const unrecorded = walk().c.log;
    expect(
      logCount(unrecorded, "conviction", "conviction") -
        logCount(recorded, "conviction", "conviction"),
    ).toBe(2);
  });

  for (const resolution of ["none", "R3"])
    it(`Black Stars Rise ${resolution}: Carcosa merged, each investigator insane with mental trauma equal to their sanity, the campaign lost`, () => {
      const { c, played, stories, items } = walk({
        "black-stars-rise": { resolution, defeated: resolution === "none" },
      });
      expect(played.at(-1)).toBe("black-stars-rise");
      expect(hasEntry(c.log, "carcosaMerged")).toBe(true);
      for (const i of c.investigators) {
        expect(i.status).toBe("insane");
        expect(i.mentalTrauma).toBe(db.cards[i.code].sanity);
      }
      expect(c.result).toBe("lose");
      expect(items).not.toContain("ptc-epilogue");
      expect(stories.has("ptc-epilogue:possessed")).toBe(false);
    });

  describe("Dim Carcosa: no resolution by Conviction against Doubt", () => {
    for (const [conviction, doubt, r] of [
      [3, 3, "R4"],
      [4, 2, "R4"],
      [2, 4, "R5"],
    ] as const)
      it(`${conviction} Conviction, ${doubt} Doubt: ${r}, and the possessed read no epilogue`, () => {
        const { c, items, stories } = walk({
          "dim-carcosa": {
            resolution: "none",
            defeated: true,
            log: (c) => {
              c.log = setCount(c.log, "conviction", "set", conviction, "conviction");
              c.log = setCount(c.log, "doubt", "set", doubt, "doubt");
              c.log = addCards(c.log, "possessed", [ROLAND, DAISY], false);
            },
          },
        });
        expect(hasEntry(c.log, "carcosaMerged")).toBe(r === "R4");
        expect(hasEntry(c.log, "hasturHasYou")).toBe(r === "R5");
        for (const i of c.investigators) {
          expect(i.status).toBe("insane");
          expect(i.mentalTrauma).toBe(db.cards[i.code].sanity);
        }
        expect(c.result).toBe("lose");
        expect(items).not.toContain("ptc-epilogue");
        expect(stories.has("ptc-epilogue:possessed")).toBe(false);
      });
  });
});
