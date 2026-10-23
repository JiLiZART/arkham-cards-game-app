import { describe, expect, it } from "vitest";
import { createCard, moveCard } from "./core";
import type { Result } from "./engine";
import { giveCard, mutate, options, pick, putEnemy, skipMulligans, start } from "./testkit";

const ROLAND = "01001";
const DAISY = "01002";

describe("Daisy's Tome action", () => {
  // Daisy's first turn with Old Book of Lore in play and Medical Texts in hand
  const table = (bag = ["0"]) => {
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 1, { chaosBag: bag as never }));
    r = mutate(r, (g) => {
      const book = createCard(g, "01031", "limbo", DAISY);
      moveCard(g, book, "play");
      g.s.cards[book].controller = DAISY;
      giveCard(g, DAISY, "01035");
      g.s.invs[DAISY].resources = 5;
    });
    while (r.state.pending?.inv !== DAISY || r.state.pending.kind !== "turn") r = pick(r, r.state.pending!.options.at(-1)!.label);
    return r;
  };
  const settle = (r: Result) => {
    while (r.state.pending && r.state.pending.kind !== "turn") r = pick(r, r.state.pending.options[0].label);
    return r;
  };

  it("playing a Tome spends a normal action, not the Tome action", () => {
    const r = settle(pick(table(), "Play Medical Texts"));
    expect(r.state.invs[DAISY].actionsLeft).toBe(2);
    expect(r.state.invs[DAISY].restrictedActions).toEqual([{ trait: "Tome", left: 1 }]);
  });

  it("with only the Tome action left, a Tome can be used but not played", () => {
    const r = mutate(table(), (g) => void (g.s.invs[DAISY].actionsLeft = 0));
    expect(options(r).some((o) => /Old Book of Lore/.test(o))).toBe(true);
    expect(options(r)).not.toContain("Play Medical Texts");
  });

  it("the Tome action is gone once Stubborn Detective blanks Daisy mid-turn", () => {
    const r = mutate(table(), (g) => {
      g.s.invs[DAISY].actionsLeft = 0;
      // Daisy's own weakness: it blanks its bearer's text while at her location
      const sd = createCard(g, "01103", "limbo", DAISY);
      moveCard(g, sd, "enemy", { location: g.s.invs[DAISY].location! });
    });
    expect(r.state.invs[DAISY].restrictedActions).toEqual([{ trait: "Tome", left: 1 }]);
    expect(options(r).some((o) => /Old Book of Lore/.test(o))).toBe(false);
  });

  it("Blinding Light's lost action never drops actions below 0", () => {
    let r = mutate(table(["skull"]), (g) => {
      g.s.invs[DAISY].actionsLeft = 1;
      g.s.invs[DAISY].restrictedActions = [];
      giveCard(g, DAISY, "01066");
      putEnemy(g, "01160", g.s.invs[DAISY].location!, DAISY);
    });
    r = settle(pick(r, "Play Blinding Light"));
    expect(r.state.log.some((e) => e.type === "actions")).toBe(true);
    expect(r.state.invs[DAISY].actionsLeft).toBe(0);
  });
});
