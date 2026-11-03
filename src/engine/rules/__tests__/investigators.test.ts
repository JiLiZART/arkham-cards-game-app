import type { ChaosToken } from "../../../content/schema";
import { toTurn } from "../../kits/driver";
import { describe, expect, it } from "vitest";
import { card } from "../../context";
import { invsAt } from "../../queries";
import { gOf, locId, mutate, pick, putEnemy, skipMulligans, start } from "../../kits/testkit";
import { allCardRecsIn, invStateIn } from "../../world/store";

const ROLAND = "01001";
const DAISY = "01002";
function gathering(invs = [ROLAND], bag: ChaosToken[] = ["0"], seed = 1) {
  const r = start("the-gathering", invs, seed, { chaosBag: bag });
  return skipMulligans(r);
}

describe("damage & defeat", () => {
  it("investigator defeated by horror", () => {
    let r = gathering([DAISY], ["0"]);
    r = mutate(r, (game) => {
      invStateIn(game.s, DAISY).horror = 8;
      invStateIn(game.s, DAISY).clues = 2;
      putEnemy(game, "01160", locId(game, "01111"), DAISY);
    });
    r = pick(r, "Draw 1 card"); // provokes: 1 damage 1 horror
    while (r.state.pending?.kind === "assign") r = pick(r, /investigator/);
    const game = gOf(r);
    expect(invStateIn(r.state, DAISY).status).toBe("defeated");
    expect(invStateIn(r.state, DAISY).mentalTrauma).toBe(1);
    expect(card(game, locId(game, "01111")).clues).toBeGreaterThanOrEqual(2);
    expect(r.state.phase === "ended" || !invsAt(game, locId(game, "01111")).includes(DAISY)).toBe(
      true,
    );
    expect(r.state.resolution).toBe("none");
  });
});

describe("chosen investigators", () => {
  // regression: with one investigator at the location the target was auto-picked, and the search that followed
  // then read its own answer (a card) back as the investigator, which crashed and soft-locked the game
  for (const invs of [["01002"], ["01002", "01001"]]) {
    it(`Old Book of Lore searches and adds the picked card to hand (${invs.length} investigator${invs.length > 1 ? "s" : ""})`, () => {
      let r = skipMulligans(start("the-gathering", invs, 3));
      r = mutate(r, (game) => {
        const book = allCardRecsIn(game.s).find((c) => c.code === "01031")!;
        for (const i of game.s.order)
          for (const p of ["deck", "hand"] as const)
            invStateIn(game.s, i)[p] = invStateIn(game.s, i)[p].filter((x) => x !== book.id);
        Object.assign(book, { zone: "play", controller: "01002", owner: "01002" });
      });
      r = toTurn(r, "01002");
      r = pick(r, /Old Book/);
      if (r.state.pending?.kind === "target") r = pick(r, "Daisy Walker");
      expect(r.state.pending?.prompt).toMatch(/Search your deck/);
      const wanted = r.state.pending!.options[0];
      r = pick(r, wanted.label);
      expect(invStateIn(r.state, "01002").hand).toContain(wanted.value);
      expect(r.state.pending?.kind).toBe("turn");
    });
  }
});
