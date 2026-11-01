/**
 * "If a weakness card enters an investigator's hand in a manner that did not involve drawing the card, that
 * investigator must resolve that card (including any revelation abilities) as if they had just drawn it."
 * (Grimoire, Weakness). The Ritual Begins puts a random Madness weakness into the hand of each investigator who fails.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { run } from "./engine";
import { handLimit } from "./rules/investigators";
import { legalTurnActions } from "./rules/flow";
import { giveCard } from "./testkit";
import { randInt } from "./rng";
import { gOf, skipMulligans, start } from "./testkit";
import type { InstId } from "./types";
import { moveCard, type G } from "./core";
import { cardRecIn, invStateIn } from "./records";

const R = "01001";
const ritual = () => gOf(skipMulligans(start("the-devourer-below", [R], 1)));
const madnessPool = (g: G) =>
  Object.values(g.db.cards).filter(
    (c) => c.subtype === "basicweakness" && c.traits.includes("Madness"),
  );

/** fail The Ritual Begins' test: its script adds the weakness, then the engine runs what that queued */
function failRitual(g: G): InstId {
  const before = new Set(g.s.world.entities);
  g.s.pending = null;
  g.db.scripts["01144"].fns!.madness(g, { you: R });
  run(g);
  return g.s.world.entities.find((id) => !before.has(id))!;
}

describe("a Madness weakness The Ritual Begins puts into your hand", () => {
  it("resolves as if drawn: it doesn't stay in the hand", () => {
    const g = ritual();
    const id = failRitual(g);
    expect(g.db.cards[cardRecIn(g.s, id).code].traits).toContain("Madness");
    expect(cardRecIn(g.s, id).zone).not.toBe("hand");
    expect(g.events.some((e) => e.type === "weakness" && e.card === id)).toBe(true);
  });

  describe("with The Path to Carcosa's weaknesses in the collection", () => {
    beforeAll(async () => {
      await loadPack("ptc");
    });

    it("Drawing the Sign goes into your threat area (its revelation)", () => {
      const g = ritual();
      const pool = madnessPool(g);
      // the seed state that makes the script pick Drawing the Sign
      let rng = 1;
      while (pool[randInt({ rng }, pool.length)].code !== "03041") rng++;
      g.s.rng = rng;
      const id = failRitual(g);
      expect(cardRecIn(g.s, id).code).toBe("03041");
      expect(cardRecIn(g.s, id).zone).toBe("threat");
      expect(invStateIn(g.s, R).hand).not.toContain(id);
    });

    it("in the threat area: maximum hand size 5 less, and two actions discard it", () => {
      const g = ritual();
      const before = handLimit(g, R);
      const sign = giveCard(g, R, "03041");
      moveCard(g, sign, "threat");
      expect(handLimit(g, R)).toBe(before - 5);
      g.s.phase = "investigation";
      g.s.active = R;
      invStateIn(g.s, R).actionsLeft = 3;
      expect(legalTurnActions(g, R).map((o) => o.label)).toContain(
        "Discard Drawing the Sign [2 actions]",
      );
    });
  });
});
