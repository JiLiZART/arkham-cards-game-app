import { describe, expect, it } from "vitest";
import { card, inv, type GameContext } from "../context";
import { createCard, moveCard } from "../movement";
import { findByCode } from "../queries";
import {
  commitDone,
  gOf,
  giveCard,
  mutate,
  options,
  pick,
  skipMulligans,
  start,
} from "../kits/testkit";
import type { Result } from "../index";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";

const WENDY = "01005";
const AMULET = "01014";

/** The Gathering, Wendy solo, chaos bag fixed to the given tokens */
function gathering(bag: string[]) {
  return skipMulligans(start("the-gathering", [WENDY], 5, { chaosBag: bag as never }));
}

function amuletInPlay(game: GameContext) {
  const id =
    findByCode(game, AMULET, [ZONE.Hand, ZONE.Deck, ZONE.Discard])?.id ??
    createCard(game, AMULET, ZONE.Limbo, WENDY);
  moveCard(game, id, ZONE.Play);
  cardRecIn(game.s, id).controller = WENDY;
}

/** pass reaction windows until one offers an option matching `want` (or none is left) */
function passUntil(r: Result, want?: RegExp) {
  while (r.state.pending?.kind === "reaction" && !(want && options(r).some((o) => want.test(o))))
    r = pick(r, "Pass");
  return r;
}

/** a fresh copy of the card on top of Wendy's discard pile */
function toDiscard(game: GameContext, code: string) {
  const id = createCard(game, code, ZONE.Limbo, WENDY);
  moveCard(game, id, ZONE.Discard);
  return id;
}

describe("Wendy Adams", () => {
  it("elder sign: +0 without the Amulet", () => {
    let r = gathering(["elderSign"]);
    r = passUntil(commitDone(pick(r, "Investigate Study")));
    expect(r.state.log.some((e) => /auto-success/.test(e.text))).toBe(false);
  });

  it("elder sign: automatic success with Wendy's Amulet in play", () => {
    let r = gathering(["elderSign"]);
    r = mutate(r, amuletInPlay);
    r = passUntil(commitDone(pick(r, "Investigate Study")));
    expect(r.state.log.some((e) => /auto-success/.test(e.text))).toBe(true);
  });
});

describe("Wendy's Amulet", () => {
  it("plays the topmost event of the discard pile, then puts it on the bottom of the deck", () => {
    let r = gathering(["0"]);
    let cache = "";
    r = mutate(r, (game) => {
      amuletInPlay(game);
      cache = toDiscard(game, "01088"); // Emergency Cache
    });
    const res = invStateIn(r.state, WENDY).resources;
    r = pick(r, "Play Emergency Cache");
    expect(invStateIn(r.state, WENDY).resources).toBe(res + 3);
    expect(invStateIn(r.state, WENDY).deck.at(-1)).toBe(cache);
    expect(invStateIn(r.state, WENDY).discard).not.toContain(cache);
  });

  it("only the topmost event, and only while the Amulet is in play", () => {
    let r = gathering(["0"]);
    r = mutate(r, (game) => {
      toDiscard(game, "01088");
    });
    expect(options(r)).not.toContain("Play Emergency Cache");
    r = mutate(r, (game) => {
      amuletInPlay(game);
      toDiscard(game, "01093"); // Rabbit's Foot, an asset, now on top
    });
    expect(options(r).some((o) => /Emergency Cache|Rabbit/.test(o))).toBe(false);
  });

  it("an event played from hand also goes to the bottom of the deck", () => {
    let r = gathering(["0"]);
    let cache = "";
    r = mutate(r, (game) => {
      amuletInPlay(game);
      cache = giveCard(game, WENDY, "01088");
    });
    r = pick(r, "Play Emergency Cache");
    expect(invStateIn(r.state, WENDY).deck.at(-1)).toBe(cache);
  });

  it("Lucky! can be played from the discard pile when the test would fail", () => {
    let r = gathering(["-2"]);
    let lucky = "";
    r = mutate(r, (game) => {
      amuletInPlay(game);
      lucky = toDiscard(game, "01080");
      invStateIn(game.s, WENDY).resources = 5;
    });
    r = passUntil(commitDone(pick(r, "Investigate Study")), /Lucky/); // intellect 3 - 2 vs shroud 2
    r = passUntil(pick(r, /Lucky/));
    expect(invStateIn(r.state, WENDY).clues).toBe(1);
    expect(invStateIn(r.state, WENDY).deck.at(-1)).toBe(lucky);
  });

  it("Look what I found! can be played from the discard pile after failing an investigation", () => {
    let r = gathering(["-2"]);
    r = mutate(r, (game) => {
      amuletInPlay(game);
      toDiscard(game, "01079");
      invStateIn(game.s, WENDY).resources = 5;
    });
    r = passUntil(commitDone(pick(r, "Investigate Study")), /Look what/);
    expect(options(r).some((o) => /Look what/.test(o))).toBe(true);
  });
});

describe("Abandoned and Alone", () => {
  it("2 direct horror and the discard pile is removed from the game", () => {
    let r = gathering(["0"]);
    let junk = "";
    r = mutate(r, (game) => {
      junk = toDiscard(game, "01088");
      const aa = createCard(game, "01015", ZONE.Limbo, WENDY);
      moveCard(game, aa, ZONE.Deck, { inv: WENDY, top: true });
    });
    r = pick(r, "Draw 1 card");
    const game = gOf(r);
    expect(inv(game, WENDY).horror).toBe(2);
    expect(card(game, junk).zone).toBe("removed");
    expect(inv(game, WENDY).discard.map((id) => card(game, id).code)).toEqual(["01015"]);
  });
});
