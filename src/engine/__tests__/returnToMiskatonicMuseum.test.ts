/** Return to The Miskatonic Museum (campaign-return-to-the-dunwich-legacy, group 4): setup card 51020 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, pick } from "../kits/testkit";
import { game, inject, move, toTurn, until, use } from "../kits/driver";
import { connections, findByCode } from "../queries";
import {
  addCounter,
  card,
  currentAct,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setCounter,
  sideDeck,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: intellect 3, health 9, sanity 5
const HORROR = "02141";
const SHADOW = "02142";
const HALLS = "02127";
const RESTRICTED = "02137";
const ARCHIVES = "51022";
const OTHERS = ["02132", "02133", "02134", "02135", "02136", "51021", ARCHIVES];

interface Opts {
  bag?: ChaosToken[];
  seed?: number;
  prep?: (game: GameContext) => void;
}
const rtmm = ({ bag = ["0"], seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "return-to-the-miskatonic-museum",
    investigators: [R],
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-dunwich-legacy" },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const codeOf = (r: Result, id: string | null | undefined) => (id ? card(gOf(r), id).code : null);
/** an Exhibit Hall into play, revealed, wherever setup put it */
const place = (game: GameContext, code: string) => {
  const id = findByCode(game, code, [ZONE.Location, ZONE.SideDeck, ZONE.Removed])!.id;
  if (card(game, id).zone !== ZONE.Location) moveCard(game, id, ZONE.Location);
  reveal(game, id);
  return id;
};
const goTo = (game: GameContext, code: string) => {
  const id = place(game, code);
  placeInvestigator(game, R, id);
  return id;
};
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const shadow = (r: Result) => findByCode(gOf(r), SHADOW)!;
const horror = (r: Result) => findByCode(gOf(r), HORROR, [ZONE.Enemy]);
const toEnd = (r: Result) => until(r, () => false, 300);

describe("setup", () => {
  it("the Exhibit deck: 6 of the 8 halls, the Restricted Hall among the bottom three, 2 others removed", () => {
    const decked = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const r = rtmm({ seed });
      const g = gOf(r);
      const deck = sideDeck(g, "exhibit").map((id) => card(g, id).code);
      expect(deck).toHaveLength(6);
      expect(deck.indexOf(RESTRICTED)).toBeGreaterThanOrEqual(3);
      const removed = OTHERS.filter((c) => findByCode(g, c)?.zone === ZONE.Removed);
      expect(removed).toHaveLength(2);
      expect([...deck, ...removed].sort()).toEqual([...OTHERS, RESTRICTED].sort());
      for (const c of deck) decked.add(c);
    }
    expect(decked.has("51021")).toBe(true);
    expect(decked.has(ARCHIVES)).toBe(true);
  });

  it("the new halls connect to the Museum Halls", () => {
    const g = gOf(rtmm({ prep: (x) => void place(x, "51021") }));
    expect(connections(g, loc(g, "51021")!).map((id) => card(g, id).code)).toEqual([HALLS]);
  });
});

describe("51020: the next agenda's forced ability is active while agenda 1b and 2b resolve", () => {
  it("agenda 1's back: the Horror spawns in the Halls and agenda 2's forced ability attaches Shadow-spawned", () => {
    const after = run(rtmm(), { t: STEP.AdvanceAgenda });
    const h = horror(after)!;
    expect(codeOf(after, h.location)).toBe(HALLS);
    expect(shadow(after).attachedTo).toBe(h.id);
    expect(shadow(after).resources).toBe(0);
  });

  it("agenda 2's back: the Horror back from the void, Shadow-spawned on it gains a resource", () => {
    const one = run(rtmm(), { t: STEP.AdvanceAgenda });
    const h = horror(one)!.id;
    const gone = run(one, { t: STEP.DefeatEnemy, enemy: h, by: R });
    expect(card(gOf(gone), h).zone).toBe(ZONE.Void);
    const two = run(gone, { t: STEP.AdvanceAgenda });
    expect(horror(two)?.id).toBe(h);
    expect(shadow(two).attachedTo).toBe(h);
    expect(shadow(two).resources).toBe(1);
  });

  it("the base scenario keeps the rule off: no agenda sees the Horror its back spawns", () => {
    const base = game({
      scenario: "the-miskatonic-museum",
      investigators: [R],
      bag: ["0"],
      extra: { campaignId: "the-dunwich-legacy" },
    });
    expect(shadow(run(base, { t: STEP.AdvanceAgenda })).zone).toBe(ZONE.SetAside);
  });
});

describe("the box's cards", () => {
  it("51021 Medieval Exhibit: a failed investigation deals 1 damage", () => {
    const r = rtmm({ bag: ["autoFail"], prep: (g) => void goTo(g, "51021") });
    const after = toTurn(pick(r, /^Investigate/), R);
    expect(inv(gOf(after), R).damage).toBe(1);
  });

  it("51022 The Archives: 2 actions for 2 clues, and the Horror spawns in the Halls", () => {
    const r = rtmm({ prep: (g) => void goTo(g, ARCHIVES) });
    const after = toTurn(use(r, ARCHIVES), R);
    const g = gOf(after);
    expect(inv(g, R).clues).toBe(2);
    expect(inv(g, R).actionsLeft).toBe(1);
    expect(codeOf(after, horror(after)!.location)).toBe(HALLS);
    // agenda 1's forced ability sees it enter play
    expect(shadow(after).attachedTo).toBe(horror(after)!.id);
  });

  it("51022 with the Horror in play: Shadow-spawned gains a resource", () => {
    const r = rtmm({ prep: (g) => void goTo(g, ARCHIVES) });
    const first = toTurn(use(r, ARCHIVES), R);
    const again = toTurn(
      use(
        mutate(first, (g) => setCounter(g, R, "actionsLeft", 3)),
        ARCHIVES,
      ),
      R,
    );
    expect(shadow(again).resources).toBe(1);
  });

  it("51023 Dark Bidding: attached to the Horror in the encounter deck; when it attacks, +1 damage and +1 horror, it heals 2, Dark Bidding discarded", () => {
    const drawn = (r: Result) => {
      let id = "";
      const made = mutate(r, (g) => {
        id = createCard(g, "51023", ZONE.EncounterDeck);
      });
      return { bid: id, r: run(made, { t: STEP.DrawEncounter, inv: R, card: id }) };
    };
    const { bid, r } = drawn(rtmm());
    const h = findByCode(gOf(r), HORROR, [ZONE.EncounterDeck])!.id;
    expect(card(gOf(r), bid).attachedTo).toBe(h);
    // the Horror enters play at Roland's location, wounded, with Dark Bidding still on it
    const there = mutate(r, (g) => {
      moveCard(g, h, ZONE.Enemy, { location: inv(g, R).location });
      addCounter(g, h, "damage", 2);
    });
    expect(card(gOf(there), bid).attachedTo).toBe(h);
    const hit = run(there, { t: STEP.EnemyAttack, enemy: h, inv: R, aoo: false, key: "bid" });
    const g = gOf(hit);
    expect(inv(g, R).damage).toBe(2); // Hunting Horror: 1 damage, 1 horror, each +1
    expect(inv(g, R).horror).toBe(2);
    expect(card(g, h).damage).toBe(0);
    expect(card(g, bid).zone).toBe(ZONE.EncounterDiscard);
  });

  it("51023 stays on the Horror into the void", () => {
    const one = run(rtmm(), { t: STEP.AdvanceAgenda });
    const h = horror(one)!.id;
    let bid = "";
    const withBid = mutate(one, (g) => {
      bid = createCard(g, "51023", ZONE.EncounterDeck);
    });
    const attached = run(withBid, { t: STEP.DrawEncounter, inv: R, card: bid });
    expect(card(gOf(attached), bid).attachedTo).toBe(h);
    const gone = run(attached, { t: STEP.DefeatEnemy, enemy: h, by: R });
    expect(card(gOf(gone), h).zone).toBe(ZONE.Void);
    expect(card(gOf(gone), bid).attachedTo).toBe(h);
    expect(card(gOf(gone), bid).zone).toBe(ZONE.Attached);
  });

  it("51024 Night Beyond Void: 1 resource on Shadow-spawned even set aside, kept when it is attached", () => {
    const night = run(rtmm(), {
      t: STEP.Script,
      code: "51024",
      fn: "night",
      ctx: { you: R, source: null },
    });
    expect(shadow(night).zone).toBe(ZONE.SetAside);
    expect(shadow(night).resources).toBe(1);
    const spawned = run(night, { t: STEP.AdvanceAgenda });
    expect(shadow(spawned).attachedTo).toBe(horror(spawned)!.id);
    expect(shadow(spawned).resources).toBe(1);
  });
});

describe("the resolutions, played", () => {
  it("R1 and R2: the Restricted Hall's last clue, the investigators choose", () => {
    const r = rtmm({
      prep: (g) => {
        moveCard(g, currentAct(g)!, ZONE.Removed);
        const night = pile(g, "actDeck").find((id) => card(g, id).code === "02123")!;
        moveCard(g, night, ZONE.Act);
        goTo(g, HALLS);
        const hall = findByCode(g, RESTRICTED, [ZONE.SideDeck])!.id;
        moveCard(g, hall, ZONE.Location);
      },
    });
    const in3 = toTurn(move(r, RESTRICTED), R);
    const hall = loc(gOf(in3), RESTRICTED)!;
    const cleared = inject(in3, (x) => setCounter(x, hall, "clues", 0), {
      t: STEP.CheckObjectives,
    });
    expect(toEnd(pick(cleared, "R1")).state.resolution).toBe("R1");
    expect(toEnd(pick(cleared, "R2")).state.resolution).toBe("R2");
  });
});
