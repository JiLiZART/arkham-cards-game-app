/** The vocabulary Return to The Dunwich Legacy's replacement sets added (campaign-return-to-the-dunwich-legacy, task 1.4). */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Result } from "../../index";
import { inv, placeInvestigator, type GameContext } from "../../context";
import { createCard, moveCard } from "../../movement";
import { addTempMod, connections, findByCode } from "../../queries";
import { enemyHere, game, inject, toTurn } from "../../kits/driver";
import { gOf, mutate } from "../../kits/testkit";
import { ZONE } from "../../world/constants";
import { STEP } from "../../steps/step";
import type { TurnAction } from "../../world/types";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001";
const D = "01002";
const A = "01004";
const quad = (game: GameContext) => findByCode(game, "02048", [ZONE.Location])!.id;
const ea = (invs: string[], prep?: (game: GameContext) => void) =>
  game({
    scenario: "extracurricular-activity",
    investigators: invs,
    bag: ["0"],
    prep,
    extra: { campaignId: "the-dunwich-legacy" },
  });
const kinds = (r: Result) =>
  (r.state.pending?.options ?? []).map((o) => (o.value as TurnAction).kind);

describe('attachToLocation where "mostInvestigators"', () => {
  it("attaches to a location with the most investigators, not the drawer's", () => {
    let src = "";
    const r = ea([R, D, A], (g) => {
      placeInvestigator(g, R, connections(g, quad(g))[0]);
      src = createCard(g, "51065", ZONE.Limbo);
    });
    const after = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "attachToLocation", where: "mostInvestigators" },
        ctx: { you: R, source: src },
      }),
      R,
    );
    expect(findByCode(gOf(after), "51065", [ZONE.Attached])?.location).toBe(quad(gOf(after)));
  });
});

describe("forbidden actions: cannotFight, cannotEvade, cannotMoveAction, cannotPlayAction", () => {
  it("take the kind of action off the turn's choices, and only it", () => {
    const r = ea([R], (g) => void enemyHere(g, R));
    expect(kinds(r)).toEqual(expect.arrayContaining(["fight", "evade", "move", "investigate"]));
    const barred = toTurn(
      mutate(r, (g) => {
        for (const flag of ["cannotFight", "cannotEvade", "cannotMoveAction"] as const)
          addTempMod(g, { flag }, R, "round");
      }),
      R,
    );
    expect(kinds(barred).filter((k) => ["fight", "evade", "move"].includes(k))).toEqual([]);
    expect(kinds(barred)).toContain("investigate");
  });
});

describe("the cardsDrawn window", () => {
  it("opens once after a draw of several cards, its amount the cards drawn (Oppressive Mists discards as many)", () => {
    const r = game({
      scenario: "extracurricular-activity",
      investigators: [R],
      bag: ["-1"],
      prep: (g) => {
        const mists = createCard(g, "51067", ZONE.Limbo);
        moveCard(g, mists, ZONE.Attached, { location: inv(g, R).location });
      },
      extra: { campaignId: "the-dunwich-legacy" },
    });
    const hand = inv(gOf(r), R).hand.length;
    const after = toTurn(
      inject(r, () => {}, { t: STEP.Draw, inv: R, n: 3 }),
      R,
    );
    expect(after.state.log.filter((e) => e.type === "testResult")).toHaveLength(1);
    expect(inv(gOf(after), R).hand.length).toBe(hand);
  });
});
