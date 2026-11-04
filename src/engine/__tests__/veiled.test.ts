import { afterEach, describe, expect, it } from "vitest";
import type { CardDef } from "../../content/schema";
import { card, inv, setCounter } from "../context";
import { game, toTurn } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";

const ROLAND = "01001";
const STUDY = "01111"; // a Veiled location for the test, its other side the Hallway's card
const OTHER = "01112";
const saved: Partial<CardDef> = { keywords: db.cards[STUDY].keywords, back: db.cards[STUDY].back };
afterEach(() => {
  Object.assign(db.cards[STUDY], saved);
  delete db.cards[OTHER].front;
  delete db.cards[OTHER].story;
});

function veiled(clues: number) {
  Object.assign(db.cards[STUDY], { keywords: ["veiled"], back: OTHER });
  Object.assign(db.cards[OTHER], { front: STUDY, story: { after: "stay" } });
  return game({
    investigators: [ROLAND],
    prep: (g) => setCounter(g, inv(g, ROLAND).location!, "clues", clues),
  });
}
const FLIP = /^Flip /;

describe("Veiled", () => {
  it("at a Veiled location with no clues the flip action is offered, and taking it flips and resolves the other side", () => {
    let r = veiled(0);
    const here = inv(gOf(r), ROLAND).location!;
    const actions = inv(gOf(r), ROLAND).actionsLeft;
    expect(options(r).some((o) => FLIP.test(o))).toBe(true);
    r = toTurn(pick(r, FLIP));
    expect(card(gOf(r), here).code).toBe(OTHER);
    expect(r.state.log.some((e) => e.type === "storyShown" && e.card === here)).toBe(true);
    expect(inv(gOf(r), ROLAND).actionsLeft).toBe(actions - 1);
  });

  it("with clues on it, it isn't", () => {
    expect(options(veiled(1)).some((o) => FLIP.test(o))).toBe(false);
  });
});
