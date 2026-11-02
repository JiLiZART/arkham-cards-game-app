/** the rules the review found the engine getting wrong: lead after elimination, committed events, player-type weaknesses, Hospital Debts, Dark Memory */
import { describe, expect, it } from "vitest";
import { inv, push, type GameContext } from "../context";
import { type Result } from "../index";
import { run } from "../steps/dispatch";
import { DAISY, ROLAND, natGame, hand, inPlay } from "../kits/natkit";
import { db, options, pick } from "../kits/testkit";
import { allCardRecsIn, cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";

const AGNES = "01004";
const gameOf = (r: Result): GameContext => ({ s: structuredClone(r.state), db, events: [] });

describe("elimination", () => {
  it("the remaining investigators choose a new lead when the lead is eliminated", () => {
    const x = gameOf(natGame([ROLAND, DAISY]));
    x.s.pending = null;
    invStateIn(x.s, ROLAND).damage = 9;
    push(x, { t: STEP.CheckDefeat, inv: ROLAND });
    run(x);
    expect(inv(x, ROLAND).status).toBe("defeated");
    expect(x.s.lead).toBe(DAISY);
  });
});

describe("skill tests", () => {
  it("a committed event adds its icons but its text does not resolve", () => {
    let r = natGame([ROLAND], (x) => hand(x, ROLAND, "01037")); // Working a Hunch: 2 intellect icons, "discover 1 clue"
    r = pick(r, /^Investigate/);
    r = pick(r, /Commit Working a Hunch/);
    r = pick(r, /^Done/);
    expect(r.state.log.filter((e) => e.type === "clues").length).toBe(1);
    expect(inv(gameOf(r), ROLAND).clues).toBe(1);
  });
});

describe("weaknesses", () => {
  it("a player-type weakness drawn in play resolves its revelation", () => {
    let r = natGame([DAISY], (x) => {
      const id = hand(x, DAISY, "01009"); // The Necronomicon
      const me = invStateIn(x.s, DAISY);
      me.hand = me.hand.filter((h) => h !== id);
      cardRecIn(x.s, id).zone = ZONE.Deck;
      me.deck.unshift(id);
    });
    r = pick(r, "Draw 1 card");
    const necro = allCardRecsIn(r.state).find((c) => c.code === "01009" && c.zone !== "deck")!; // her deck's own copy stays below
    expect(necro.zone).toBe("threat");
    expect(necro.horror).toBe(3);
  });

  it("Hospital Debts moves exactly one resource per use, and needs one", () => {
    let r = natGame([ROLAND], (x) => {
      inPlay(x, ROLAND, "01011");
      invStateIn(x.s, ROLAND).resources = 5;
    });
    r = pick(r, /Hospital Debts/);
    expect(inv(gameOf(r), ROLAND).resources).toBe(4);
    expect(allCardRecsIn(r.state).find((c) => c.code === "01011")!.resources).toBe(1);
    const broke = natGame([ROLAND], (x) => {
      inPlay(x, ROLAND, "01011");
      invStateIn(x.s, ROLAND).resources = 0;
    });
    expect(options(broke).some((o) => /Hospital Debts/.test(o))).toBe(false);
  });

  it("Dark Memory's Forced resolves at the end of the turn whatever the resources", () => {
    let r = natGame([AGNES], (x) => {
      hand(x, AGNES, "01013");
      invStateIn(x.s, AGNES).resources = 0;
    });
    r = pick(r, "End turn");
    expect(r.events.some((e) => /Dark Memory/.test(e.text))).toBe(true);
    expect(inv(gameOf(r), AGNES).horror).toBe(2);
  });
});
