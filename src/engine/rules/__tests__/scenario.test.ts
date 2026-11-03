import type { ChaosToken } from "../../../content/schema";
import { describe, expect, it } from "vitest";
import { card, def, inv } from "../../context";
import { connections } from "../../queries";
import { db, gOf, locId, mutate, pick, skipMulligans, start } from "../../kits/testkit";
import { allCardRecsIn, cardRecIn, invStateIn, pileRecIn } from "../../world/store";
import { ZONE, PILE } from "../../world/constants";

const ROLAND = "01001";
const DAISY = "01002";
const SKIDS = "01003";
const AGNES = "01004";
function gathering(invs = [ROLAND], bag: ChaosToken[] = ["0"], seed = 1) {
  const r = start("the-gathering", invs, seed, { chaosBag: bag });
  return skipMulligans(r);
}

describe("locations", () => {
  it("per-investigator clues", () => {
    const r = skipMulligans(start("the-gathering", [ROLAND, DAISY, SKIDS], 1));
    const game = gOf(r);
    expect(card(game, locId(game, "01111")).clues).toBe(6);
  });
});

describe("act & agenda", () => {
  it("agenda advances when doom reaches its threshold in the mythos phase", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      cardRecIn(game.s, game.s.agenda!).doom = 2;
    });
    const first = r.state.agenda;
    r = pick(r, "End turn");
    // round 2 mythos: doom 3 → agenda 1 advances, lead chooses
    expect(r.state.pending?.prompt).toMatch(/Choose one/);
    r = pick(r, /lead investigator takes 2 horror/);
    expect(r.state.agenda).not.toBe(first);
    expect(def(gOf(r), r.state.agenda!).name).toBe("Rise of the Ghouls");
    expect(allCardRecsIn(r.state).reduce((n, c) => n + (c.zone === "agenda" ? c.doom : 0), 0)).toBe(
      0,
    );
  });

  it("group clue spend advances the act", () => {
    let r = skipMulligans(start("the-gathering", [ROLAND, AGNES], 1, { chaosBag: ["0"] }));
    r = pick(r, "Roland Banks");
    r = mutate(r, (game) => {
      invStateIn(game.s, ROLAND).clues = 3;
      invStateIn(game.s, AGNES).clues = 1;
    });
    r = pick(r, /Advance act \(spend 4 clues/);
    const game = gOf(r);
    expect(inv(game, ROLAND).clues + inv(game, AGNES).clues).toBe(0);
    expect(def(game, game.s.act!).name).toBe("The Barrier");
    expect(def(game, inv(game, ROLAND).location!).name).toBe("Hallway");
  });
});

describe("encounter deck", () => {
  it("reshuffles the discard pile when empty", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      for (const id of pileRecIn(game.s, PILE.EncounterDeck).slice()) {
        cardRecIn(game.s, id).zone = ZONE.EncounterDiscard;
        pileRecIn(game.s, PILE.EncounterDiscard).push(id);
      }
      pileRecIn(game.s, PILE.EncounterDeck).length = 0;
    });
    r = pick(r, "End turn");
    expect(r.state.log.some((e) => e.type === "reshuffle" && /encounter/.test(e.text))).toBe(true);
  });
});

describe("one-way connections", () => {
  it("allow moving from → to but not back", () => {
    const r = skipMulligans(start("the-midnight-masks", [ROLAND], 3));
    const scen = db.scenarios["the-midnight-masks"];
    // Your House (01124) → Rivertown (01125) one way; the scenario's own connections are dropped for the check
    const g = {
      ...gOf(r),
      db: {
        ...db,
        scenarios: {
          ...db.scenarios,
          [scen.id]: {
            ...scen,
            connections: [],
            oneWay: [["01124", "01125"]] as [string, string][],
          },
        },
      },
    };
    const a = locId(g, "01124");
    const b = locId(g, "01125");
    expect(connections(g, a)).toEqual([b]);
    expect(connections(g, b)).toEqual([]);
  });
});
