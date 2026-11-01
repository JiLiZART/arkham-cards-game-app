/**
 * Cards and investigators are read through read-only views (ADR-0022): a write through one is a type error, checked by
 * `pnpm typecheck` (each `@ts-expect-error` below fails the build when the write starts to compile). The runtime
 * assertions pin that a view still reads the live state.
 */
import { describe, expect, it } from "vitest";
import {
  addCounter,
  allCards,
  card,
  cardIf,
  cardsIn,
  controlled,
  enemies,
  findByCode,
  inv,
  invIf,
  type G,
} from "./core";
import { gOf, skipMulligans, start } from "./testkit";

const R = "01001";
const g = () => gOf(skipMulligans(start("the-gathering", [R], 1)));

/** never called: these writes exist to be type-checked (each @ts-expect-error fails the build if its write compiles) */
function writesThatMustNotCompile(x: G) {
  const study = findByCode(x, "01111", ["location"])!;
  // @ts-expect-error a card view can't be written
  study.clues = 0;
  // @ts-expect-error nor through card()
  card(x, study.id).exhausted = true;
  // @ts-expect-error nor through cardIf()
  cardIf(x, study.id)!.zone = "discard";
  // @ts-expect-error nor an element of a query
  allCards(x)[0].doom = 1;
  // @ts-expect-error nor of cardsIn / enemies / controlled
  cardsIn(x, "location")[0].revealed = false;
  // @ts-expect-error
  enemies(x)[0].damage++;
  // @ts-expect-error
  controlled(x, R)[0].uses--;
  // @ts-expect-error an investigator view can't be written
  inv(x, R).resources = 0;
  // @ts-expect-error
  invIf(x, R)!.location = null;
  // @ts-expect-error the pile arrays are read-only
  inv(x, R).deck.push("c1");
  // @ts-expect-error
  inv(x, R).hand.splice(0, 1);
  // @ts-expect-error
  inv(x, R).discard.length = 0;
}

describe("read-only views", () => {
  it("the compile-time checks above are in the build", () => {
    expect(typeof writesThatMustNotCompile).toBe("function");
  });

  it("a view reads the live state: a change through the core shows in it at once", () => {
    const x = g();
    const study = findByCode(x, "01111", ["location"])!;
    const clues = card(x, study.id).clues;
    addCounter(x, study.id, "clues", -1);
    expect(card(x, study.id).clues).toBe(clues - 1);
    expect(inv(x, R).deck.length).toBeGreaterThan(0);
    expect(allCards(x).length).toBe(x.s.world.entities.length);
  });
});
