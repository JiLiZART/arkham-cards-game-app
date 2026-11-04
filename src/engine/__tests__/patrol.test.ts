import { afterEach, describe, expect, it } from "vitest";
import type { CardDef } from "../../content/schema";
import { card, currentAgenda, inv, type GameContext } from "../context";
import { addLocation, game, inject } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const STUDY = "01111";
// Arkham locations: none connected to another in The Gathering's data, so the test lays out its own map
const HALLWAY = "01126"; // Southside
const ATTIC = "01128"; // St. Mary's Hospital
const CELLAR = "01129"; // Miskatonic University
const PARLOR = "01130"; // Downtown
const MINION = "01160"; // Ghoul Minion, given Patrol per test
const ID = "zz-patrol";

const saved = new Map<string, Partial<CardDef>>();
function patch(code: string, p: Partial<CardDef>) {
  if (!saved.has(code))
    saved.set(code, {
      traits: db.cards[code].traits,
      keywords: db.cards[code].keywords,
      abilities: db.cards[code].abilities,
    });
  Object.assign(db.cards[code], p);
}
afterEach(() => {
  for (const [code, p] of saved) Object.assign(db.cards[code], p);
  saved.clear();
  delete db.scenarios[ID];
  delete db.scripts[ID];
});

/** Study – "Hallway" – "Attic" – "Cellar" in a row; the "Parlor" off the "Hallway"; Roland in the Study */
const ids: Record<string, string> = {};
function row(game: GameContext) {
  ids[STUDY] = inv(game, ROLAND).location!;
  ids[HALLWAY] = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
  ids[ATTIC] = addLocation(game, ATTIC, [[HALLWAY, ATTIC]]);
  ids[CELLAR] = addLocation(game, CELLAR, [[ATTIC, CELLAR]]);
  ids[PARLOR] = addLocation(game, PARLOR, [[HALLWAY, PARLOR]]);
}
const enemyAt = (game: GameContext, code: string, loc: string) => {
  const id = createCard(game, code, ZONE.Enemy);
  moveCard(game, id, ZONE.Enemy, { location: loc });
  return id;
};
const enemyPhase = (r: ReturnType<typeof game>) => inject(r, () => {}, { t: STEP.EnemyPhase });
const at = (r: ReturnType<typeof game>, id: string) => card(gOf(r), id).location;

describe("Patrol", () => {
  it("moves one step toward its target at the start of the enemy phase", () => {
    patch(CELLAR, { traits: ["Key Locus"] });
    patch(MINION, { keywords: [{ patrol: { trait: "Key Locus", nearest: true } }] });
    let e = "";
    const r = enemyPhase(
      game({
        investigators: [ROLAND],
        prep: (g) => (row(g), (e = enemyAt(g, MINION, ids[HALLWAY]))),
      }),
    );
    expect(at(r, e)).toBe(ids[ATTIC]);
  });

  it("moves before hunters: a hunter's move is logged after the patrol's", () => {
    patch(CELLAR, { traits: ["Key Locus"] });
    patch(MINION, { keywords: [{ patrol: { trait: "Key Locus" } }] });
    let e = "";
    const r = enemyPhase(
      game({
        investigators: [ROLAND],
        prep: (g) => (row(g), (e = enemyAt(g, MINION, ids[HALLWAY]))),
      }),
    );
    const moves = r.state.log.filter((x) => x.type === "enemyMove");
    expect(moves[0]?.card).toBe(e);
  });

  it("a tie between targets asks the lead", () => {
    patch(CELLAR, { traits: ["Key Locus"] });
    patch(PARLOR, { traits: ["Key Locus"] });
    patch(MINION, { keywords: [{ patrol: { trait: "Key Locus", nearest: true } }] });
    let e = "";
    let r = enemyPhase(
      game({
        investigators: [ROLAND],
        prep: (g) => (row(g), (e = enemyAt(g, MINION, ids[ATTIC]))),
      }),
    );
    // from the Attic the Cellar is one step and the Parlor two: no tie; from the Hallway both are one and two
    expect(at(r, e)).toBe(ids[CELLAR]);
    r = enemyPhase(
      game({
        investigators: [ROLAND],
        prep: (g) => (
          row(g),
          (e = enemyAt(g, MINION, ids[HALLWAY])),
          patch(ATTIC, { traits: ["Key Locus"] })
        ),
      }),
    );
    expect(r.state.pending?.promptKey).toBe("patrolToward");
    expect(options(r).sort()).toEqual(["Downtown", "St. Mary's Hospital"]);
    r = pick(r, "Downtown");
    expect(at(r, e)).toBe(ids[PARLOR]);
  });

  it("a blocked step cancels the move; at its target it stays", () => {
    patch(CELLAR, { traits: ["Key Locus"] });
    patch(ATTIC, {
      abilities: [
        { kind: "constant", modifiers: [{ flag: "nonEliteCannotMoveInto", scope: "self" }] },
      ],
    });
    patch(MINION, { keywords: [{ patrol: { trait: "Key Locus" } }] });
    let e = "";
    let r = enemyPhase(
      game({
        investigators: [ROLAND],
        prep: (g) => (row(g), (e = enemyAt(g, MINION, ids[HALLWAY]))),
      }),
    );
    expect(at(r, e)).toBe(ids[HALLWAY]);
    saved.forEach((p, code) => code === ATTIC && Object.assign(db.cards[code], p));
    r = enemyPhase(
      game({
        investigators: [ROLAND],
        prep: (g) => (row(g), (e = enemyAt(g, MINION, ids[CELLAR]))),
      }),
    );
    expect(at(r, e)).toBe(ids[CELLAR]);
  });

  it("a constant ability can give every enemy Patrol (an agenda's), and a scenario hook can name the target", () => {
    patch(CELLAR, { traits: ["Key Locus"] });
    db.scenarios[ID] = { ...db.scenarios["the-gathering"], id: ID };
    let e = "";
    let r = game({
      scenario: ID,
      investigators: [ROLAND],
      prep: (g) => {
        row(g);
        e = enemyAt(g, MINION, ids[HALLWAY]);
        patch(card(g, currentAgenda(g)!).code, {
          abilities: [
            {
              kind: "constant",
              modifiers: [{ keyword: { patrol: { trait: "Key Locus" } }, scope: "allEnemies" }],
            },
          ],
        });
      },
    });
    expect(at(enemyPhase(r), e)).toBe(ids[ATTIC]);
    db.scripts[ID] = {
      ...db.scripts["the-gathering"],
      hooks: { patrolTarget: () => [ids[PARLOR]] },
    };
    r = enemyPhase(r);
    expect(at(r, e)).toBe(ids[PARLOR]);
  });
});
