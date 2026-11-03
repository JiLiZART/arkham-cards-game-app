/**
 * "If a weakness card enters an investigator's hand in a manner that did not involve drawing the card, that
 * investigator must resolve that card (including any revelation abilities) as if they had just drawn it."
 * (Grimoire, Weakness). The Ritual Begins puts a random Madness weakness into the hand of each investigator who fails.
 */
import { runScript } from "../rules/scripts";
import { STEP } from "../steps/step";
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { run } from "../steps/dispatch";
import { handLimit } from "../rules/investigators";
import { legalTurnActions } from "../rules/round";
import { giveCard } from "../kits/testkit";
import { randInt } from "../world/rng";
import { gOf, skipMulligans, start } from "../kits/testkit";
import type { InstId } from "../world/types";
import { moveCard } from "../movement";
import { type GameContext } from "../context";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE, PHASE } from "../world/constants";

const R = "01001";
const ritual = () => gOf(skipMulligans(start("the-devourer-below", [R], 1)));
const madnessPool = (game: GameContext) =>
  Object.values(game.db.cards).filter(
    (c) => c.subtype === "basicweakness" && c.traits.includes("Madness"),
  );

/** fail The Ritual Begins' test: its script adds the weakness, then the engine runs what that queued */
function failRitual(game: GameContext): InstId {
  const before = new Set(game.s.world.entities);
  game.s.pending = null;
  runScript(game, { t: STEP.Script, code: "01144", fn: "madness", ctx: { you: R } });
  run(game);
  return game.s.world.entities.find((id) => !before.has(id))!;
}

describe("a Madness weakness The Ritual Begins puts into your hand", () => {
  it("resolves as if drawn: it doesn't stay in the hand", () => {
    const game = ritual();
    const id = failRitual(game);
    expect(game.db.cards[cardRecIn(game.s, id).code].traits).toContain("Madness");
    expect(cardRecIn(game.s, id).zone).not.toBe("hand");
    expect(game.events.some((e) => e.type === "weakness" && e.card === id)).toBe(true);
  });

  describe("with The Path to Carcosa's weaknesses in the collection", () => {
    beforeAll(async () => {
      await loadPack("ptc");
    });

    it("Drawing the Sign goes into your threat area (its revelation)", () => {
      const game = ritual();
      const pool = madnessPool(game);
      // the seed state that makes the script pick Drawing the Sign
      let rng = 1;
      while (pool[randInt({ rng }, pool.length)].code !== "03041") rng++;
      game.s.rng = rng;
      const id = failRitual(game);
      expect(cardRecIn(game.s, id).code).toBe("03041");
      expect(cardRecIn(game.s, id).zone).toBe("threat");
      expect(invStateIn(game.s, R).hand).not.toContain(id);
    });

    it("in the threat area: maximum hand size 5 less, and two actions discard it", () => {
      const game = ritual();
      const before = handLimit(game, R);
      const sign = giveCard(game, R, "03041");
      moveCard(game, sign, ZONE.Threat);
      expect(handLimit(game, R)).toBe(before - 5);
      game.s.phase = PHASE.Investigation;
      game.s.active = R;
      invStateIn(game.s, R).actionsLeft = 3;
      expect(legalTurnActions(game, R).map((o) => o.label)).toContain(
        "Discard Drawing the Sign [2 actions]",
      );
    });
  });
});
