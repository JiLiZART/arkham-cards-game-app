import type { ChaosToken } from "../../../content/schema";
import { toTurn } from "../../kits/driver";
import { describe, expect, it } from "vitest";
import { def } from "../../context";
import { skillValue } from "../../queries";
import { createCard, moveCard } from "../../movement";
import { overfullSlot, playBlock } from "../cards";
import {
  commitDone,
  db,
  gOf,
  giveCard,
  locId,
  mutate,
  options,
  pick,
  putEnemy,
  skipMulligans,
  start,
} from "../../kits/testkit";
import { allCardRecsIn, cardRecIn, invStateIn, pileRecIn } from "../../world/store";
import { ZONE, PILE } from "../../world/constants";

const ROLAND = "01001";
const AGNES = "01004";
const WENDY = "01005";
function gathering(invs = [ROLAND], bag: ChaosToken[] = ["0"], seed = 1) {
  const r = start("the-gathering", invs, seed, { chaosBag: bag });
  return skipMulligans(r);
}

describe("player cards", () => {
  it("slot limit: a third hand asset forces a discard", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).resources = 20;
      for (const code of ["01086", "01087", "01016"]) giveCard(game, ROLAND, code);
    });
    r = pick(r, /^Play Knife/);
    r = pick(r, /^Play Flashlight/);
    r = pick(r, /^Play .45 Automatic/);
    expect(r.state.pending?.prompt).toMatch(/hand slots/);
    r = pick(r, "Knife");
    const game = gOf(r);
    const inPlay = allCardRecsIn(game.s)
      .filter((c) => c.zone === "play" && c.controller === ROLAND)
      .map((c) => def(game, c.id).name);
    expect(inPlay.sort()).toEqual([".45 Automatic", "Flashlight"]);
  });

  it("slot limit: an asset in the threat area holds its slot too", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).resources = 20;
      const knife = giveCard(game, ROLAND, "01086");
      moveCard(game, knife, ZONE.Threat, { inv: ROLAND });
      cardRecIn(game.s, knife).controller = ROLAND;
      for (const code of ["01087", "01016"]) giveCard(game, ROLAND, code);
    });
    r = pick(r, /^Play Flashlight/);
    r = pick(r, /^Play .45 Automatic/);
    expect(r.state.pending?.prompt).toMatch(/hand slots/);
    // the new .45 Automatic is not offered: another asset makes room for it
    expect(options(r).sort()).toEqual(["Flashlight", "Knife"]);
  });

  it("slot limit: an asset already moved into play counts once (taking control of it)", () => {
    const r = gathering([ROLAND], ["0"]);
    const game = gOf(r);
    const ids = ["01087", "01016"].map((code) => {
      const id = giveCard(game, ROLAND, code);
      moveCard(game, id, ZONE.Play);
      cardRecIn(game.s, id).controller = ROLAND;
      return id;
    });
    expect(overfullSlot(game, ROLAND, ids[1])).toBeNull();
    const knife = giveCard(game, ROLAND, "01086");
    expect(overfullSlot(game, ROLAND, knife)).toBe("hand");
  });

  it("why a hand card can't be played: the card that forbids it, else its cost", () => {
    const r = gathering([ROLAND], ["0"]);
    const game = gOf(r);
    const glass = giveCard(game, ROLAND, "01030");
    invStateIn(game.s, ROLAND).resources = 0;
    expect(playBlock(game, ROLAND, glass)).toEqual({ reason: "resources", cost: 1 });
    invStateIn(game.s, ROLAND).resources = 5;
    expect(playBlock(game, ROLAND, glass)).toBeNull();
    const voices = createCard(game, "01165", ZONE.Limbo, null);
    moveCard(game, voices, ZONE.Threat, { inv: ROLAND });
    cardRecIn(game.s, voices).controller = ROLAND;
    expect(playBlock(game, ROLAND, glass)).toEqual({ reason: "forbidden", by: voices });
  });

  it("weakness drawn: revelation resolves immediately and it leaves the hand", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).resources = 4;
      const para = allCardRecsIn(game.s).find((c) => c.code === "01097")!;
      const me = invStateIn(game.s, ROLAND);
      for (const z of ["deck", "hand", "discard"] as const)
        me[z] = me[z].filter((x) => x !== para.id);
      me.deck.unshift(para.id);
      para.zone = ZONE.Deck;
    });
    const hand = invStateIn(r.state, ROLAND).hand.length;
    r = pick(r, "Draw 1 card");
    expect(invStateIn(r.state, ROLAND).resources).toBe(0);
    expect(invStateIn(r.state, ROLAND).hand.length).toBe(hand);
  });

  it("a drawn weakness is announced as a weakness, before its revelation; an ordinary draw stays a draw", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      const para = allCardRecsIn(game.s).find((c) => c.code === "01097")!;
      const me = invStateIn(game.s, ROLAND);
      for (const z of ["deck", "hand", "discard"] as const)
        me[z] = me[z].filter((x) => x !== para.id);
      me.deck.unshift(para.id);
      para.zone = ZONE.Deck;
    });
    const from = r.state.log.length;
    r = pick(r, "Draw 1 card");
    const types = r.state.log.slice(from).map((e) => e.type);
    expect(types).toContain("weakness");
    expect(types).not.toContain("draw");
    const w = r.state.log.slice(from).find((e) => e.type === "weakness")!;
    expect(cardRecIn(r.state, w.card!).code).toBe("01097");
    const n = r.state.log.length;
    r = pick(r, "Draw 1 card");
    expect(r.state.log.slice(n).map((e) => e.type)).toContain("draw");
  });

  it("data-declared effect: Emergency Cache gains 3 resources", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => giveCard(game, ROLAND, "01088"));
    const res = invStateIn(r.state, ROLAND).resources;
    r = pick(r, /^Play Emergency Cache/);
    expect(invStateIn(r.state, ROLAND).resources).toBe(res + 3);
  });

  it("scripted card: Dynamite Blast runs its script", () => {
    let r = gathering([ROLAND], ["0"]);
    let ghoul = "";
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).resources = 5;
      giveCard(game, ROLAND, "01024");
      ghoul = putEnemy(game, "01160", locId(game, "01111"), null);
      cardRecIn(game.s, ghoul).exhausted = true;
    });
    r = pick(r, /^Play Dynamite Blast/);
    while (r.state.pending?.kind === "assign") r = pick(r, /investigator/);
    expect(cardRecIn(r.state, ghoul).zone).toBe("encounterDiscard");
    expect(invStateIn(r.state, ROLAND).damage).toBe(3);
  });

  it("Roland's reaction discovers a clue after defeating an enemy", () => {
    let r = gathering([ROLAND], ["+1"]);
    r = mutate(r, (game) => {
      putEnemy(game, "01159", locId(game, "01111"), ROLAND); // Swarm of Rats: 1 health
    });
    r = pick(r, /^Fight Swarm of Rats/);
    r = commitDone(r);
    expect(r.state.pending?.kind).toBe("reaction");
    r = pick(r, /Roland: discover 1 clue/);
    expect(invStateIn(r.state, ROLAND).clues).toBe(1);
  });

  it("Wendy can cancel a token by discarding a card and reveal a new one", () => {
    let r = gathering([WENDY], ["+1", "0"], 5);
    const hand = invStateIn(r.state, WENDY).hand.length;
    r = pick(r, "Investigate Study");
    r = commitDone(r);
    expect(r.state.pending?.kind).toBe("reaction");
    r = pick(r, /Wendy/);
    r = pick(r, /./); // card to discard
    expect(r.state.log.some((e) => e.type === "tokenCancelled")).toBe(true);
    expect(r.state.log.filter((e) => e.type === "token").length).toBe(2);
    expect(invStateIn(r.state, WENDY).hand.length).toBe(hand - 1);
  });

  it("Investigator stats: Roland Banks", () => {
    const r = gathering();
    const game = gOf(r);
    expect([
      skillValue(game, ROLAND, "willpower"),
      skillValue(game, ROLAND, "intellect"),
      skillValue(game, ROLAND, "combat"),
      skillValue(game, ROLAND, "agility"),
    ]).toEqual([3, 3, 4, 2]);
    expect(db.cards[ROLAND].health).toBe(9);
    expect(db.cards[ROLAND].sanity).toBe(5);
  });
});

describe("looking at the top of a deck", () => {
  // Agnes with Arcane Initiate and Scrying in play, Shrivelling (a Spell) under two cards that aren't Spells
  const table = (spellAt: number) => {
    let r = skipMulligans(start("the-gathering", [AGNES, ROLAND], 3));
    r = mutate(r, (game) => {
      for (const code of ["01063", "01061"]) {
        const a = createCard(game, code, ZONE.Limbo, AGNES);
        moveCard(game, a, ZONE.Play);
        cardRecIn(game.s, a).controller = AGNES;
        cardRecIn(game.s, a).uses = 3;
      }
      const d = invStateIn(game.s, AGNES).deck;
      const plain = d.filter((id) => !def(game, id).traits.includes("Spell")).slice(0, 3);
      const spell = createCard(game, "01060", ZONE.Limbo, AGNES);
      moveCard(game, spell, ZONE.Deck);
      const top =
        spellAt < 0 ? plain : [...plain.slice(0, spellAt), spell, ...plain.slice(spellAt, 2)];
      invStateIn(game.s, AGNES).deck = [...top, ...d.filter((id) => !top.includes(id))];
    });
    r = toTurn(r, AGNES);
    return r;
  };

  it("Arcane Initiate offers the Spell and shows the other top cards", () => {
    let r = pick(table(1), /Arcane Initiate/);
    const top = invStateIn(r.state, AGNES).deck.slice(0, 3);
    expect(r.state.pending?.options.map((o) => o.label)).toEqual(["Shrivelling", "Take nothing"]);
    expect(r.state.pending?.shown).toEqual([top[0], top[2]]);
    r = pick(r, "Shrivelling");
    expect(invStateIn(r.state, AGNES).hand).toContain(top[1]);
  });

  it("Arcane Initiate with no Spell on top still shows the three cards", () => {
    const r = pick(table(-1), /Arcane Initiate/);
    expect(r.state.pending?.options.map((o) => o.id)).toEqual(["none"]);
    expect(r.state.pending?.shown).toEqual(invStateIn(r.state, AGNES).deck.slice(0, 3));
  });

  it("Old Book of Lore draws the card it finds: a weakness found resolves", () => {
    let r = table(-1);
    r = mutate(r, (game) => {
      const book = createCard(game, "01031", ZONE.Limbo, AGNES);
      moveCard(game, book, ZONE.Play);
      cardRecIn(game.s, book).controller = AGNES;
      const weak = createCard(game, "01097", ZONE.Limbo, AGNES);
      moveCard(game, weak, ZONE.Deck);
      invStateIn(game.s, AGNES).deck = [
        weak,
        ...invStateIn(game.s, AGNES).deck.filter((x) => x !== weak),
      ];
    });
    const resources = invStateIn(r.state, AGNES).resources;
    r = pick(r, /Old Book/);
    if (r.state.pending?.kind === "target") r = pick(r, "Agnes Baker");
    r = pick(r, "Paranoia");
    // Paranoia's revelation: lose all resources
    expect(invStateIn(r.state, AGNES).resources).toBe(0);
    expect(resources).toBeGreaterThan(0);
  });

  it("Scrying puts the top 3 of the chosen deck back in the order picked", () => {
    let r = pick(table(0), /Scrying/);
    expect(r.state.pending?.options.map((o) => o.id)).toEqual([AGNES, ROLAND, "encounter"]);
    r = pick(r, "encounter");
    const [a, b, c] = pileRecIn(r.state, PILE.EncounterDeck).slice(0, 3);
    const rest = pileRecIn(r.state, PILE.EncounterDeck).slice(3);
    expect(r.state.pending?.options.map((o) => o.card)).toEqual([a, b, c]);
    r = pick(r, c);
    r = pick(r, a);
    expect(pileRecIn(r.state, PILE.EncounterDeck)).toEqual([c, a, b, ...rest]);
    expect(r.state.pending?.kind).toBe("turn");
  });
});
