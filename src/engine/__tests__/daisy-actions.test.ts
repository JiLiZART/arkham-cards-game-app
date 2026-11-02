import { describe, expect, it } from "vitest";
import { createCard, moveCard } from "../movement";
import type { Result } from "../index";
import { giveCard, mutate, options, pick, putEnemy, skipMulligans, start } from "../kits/testkit";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const DAISY = "01002";

describe("Daisy's Tome action", () => {
  // Daisy's first turn with Old Book of Lore in play and Medical Texts in hand
  const table = (bag = ["0"]) => {
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 1, { chaosBag: bag as never }));
    r = mutate(r, (game) => {
      const book = createCard(game, "01031", ZONE.Limbo, DAISY);
      moveCard(game, book, ZONE.Play);
      cardRecIn(game.s, book).controller = DAISY;
      giveCard(game, DAISY, "01035");
      invStateIn(game.s, DAISY).resources = 5;
    });
    while (r.state.pending?.inv !== DAISY || r.state.pending.kind !== "turn")
      r = pick(r, r.state.pending!.options.at(-1)!.label);
    return r;
  };
  const settle = (r: Result) => {
    while (r.state.pending && r.state.pending.kind !== "turn")
      r = pick(r, r.state.pending.options[0].label);
    return r;
  };

  it("playing a Tome spends a normal action, not the Tome action", () => {
    const r = settle(pick(table(), "Play Medical Texts"));
    expect(invStateIn(r.state, DAISY).actionsLeft).toBe(2);
    expect(invStateIn(r.state, DAISY).restrictedActions).toEqual([{ trait: "Tome", left: 1 }]);
  });

  it("with only the Tome action left, a Tome can be used but not played", () => {
    const r = mutate(table(), (game) => void (invStateIn(game.s, DAISY).actionsLeft = 0));
    expect(options(r).some((o) => /Old Book of Lore/.test(o))).toBe(true);
    expect(options(r)).not.toContain("Play Medical Texts");
  });

  it("the Tome action is gone once Stubborn Detective blanks Daisy mid-turn", () => {
    const r = mutate(table(), (game) => {
      invStateIn(game.s, DAISY).actionsLeft = 0;
      // Daisy's own weakness: it blanks its bearer's text while at her location
      const sd = createCard(game, "01103", ZONE.Limbo, DAISY);
      moveCard(game, sd, ZONE.Enemy, { location: invStateIn(game.s, DAISY).location! });
    });
    expect(invStateIn(r.state, DAISY).restrictedActions).toEqual([{ trait: "Tome", left: 1 }]);
    expect(options(r).some((o) => /Old Book of Lore/.test(o))).toBe(false);
  });

  it("Blinding Light's lost action never drops actions below 0", () => {
    let r = mutate(table(["skull"]), (game) => {
      invStateIn(game.s, DAISY).actionsLeft = 1;
      invStateIn(game.s, DAISY).restrictedActions = [];
      giveCard(game, DAISY, "01066");
      putEnemy(game, "01160", invStateIn(game.s, DAISY).location!, DAISY);
    });
    r = settle(pick(r, "Play Blinding Light"));
    expect(r.state.log.some((e) => e.type === "actions")).toBe(true);
    expect(invStateIn(r.state, DAISY).actionsLeft).toBe(0);
  });
});
