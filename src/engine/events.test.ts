import { describe, expect, it } from "vitest";
import { autoPlay, botChoice } from "./bot";
import { dispatch } from "./engine";
import { db, giveCard, mutate, pick, putEnemy, skipMulligans, start } from "./testkit";
import type { GameEvent } from "./types";

const last = (log: GameEvent[], type: string) => [...log].reverse().find((e) => e.type === type);

describe("event data (for the action feed)", () => {
  it("a resource gain carries its amount", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    r = mutate(r, (g) => {
      giveCard(g, "01001", "01088"); // Emergency Cache: gain 3 resources
    });
    r = pick(r, /^Play Emergency Cache/);
    const e = last(r.state.log, "resource")!;
    expect(e.inv).toBe("01001");
    expect(e.data).toMatchObject({ n: 3 });
    r = pick(r, /^Gain 1 resource/);
    expect(last(r.state.log, "resource")!.data).toMatchObject({ n: 1 });
  });

  it("an attack carries damage and horror", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    let enemy = "";
    r = mutate(r, (g) => {
      enemy = putEnemy(g, "01160", g.s.invs["01001"].location!, "01001"); // Ghoul Minion: 1 damage, 1 horror
    });
    // end the turn: the engaged Ghoul attacks in the enemy phase
    r = pick(r, /^End turn/);
    const e = r.state.log.find((x) => x.type === "attack" && x.card === enemy)!;
    expect(e).toBeDefined();
    expect(e.inv).toBe("01001");
    expect(e.data).toMatchObject({ damage: 1, horror: 1 });
  });

  it("discovering clues carries the count and the location", () => {
    const r = autoPlay(db, skipMulligans(start("the-gathering", ["01001"], 1)), 30);
    const e = r.state.log.find((x) => x.type === "clues")!;
    expect(e.data).toMatchObject({ n: expect.any(Number) });
    expect(db.cards[r.state.cards[e.card!].code].type).toBe("location");
  });
});

describe("prompt keys (for the translated prompt banner)", () => {
  it("a turn prompt carries its key and the actions left", () => {
    const r = skipMulligans(start("the-gathering", ["01001"], 1));
    expect(r.state.pending).toMatchObject({ promptKey: "turn", promptVars: { actions: 3 }, prompt: "Roland Banks: choose an action (3 left)" });
  });

  it("every prompt in bot playthroughs of the three scenarios has a key", () => {
    const missing = new Set<string>();
    for (const sc of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) {
      let r = start(sc, ["01001", "01002", "01004"], 3);
      for (let k = 0; k < 1500 && r.state.pending; k++) {
        if (!r.state.pending.promptKey) missing.add(r.state.pending.prompt);
        r = dispatch(db, r.state, { type: "choose", inv: r.state.pending.inv, option: botChoice(db, r) });
      }
    }
    expect([...missing]).toEqual([]);
  });
});
