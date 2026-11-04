import { afterEach, describe, expect, it } from "vitest";
import type { CardDef } from "../../content/schema";
import { card, inv, placeInvestigator, type GameContext } from "../context";
import { addLocation, game, inject, toTurn } from "../kits/driver";
import { db, gOf } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import { connections } from "../world/flags";

const ROLAND = "01001";
const DAISY = "01002";
const STUDY = "01111";
const HALLWAY = "01112";
const ATTIC = "01113";
const CELLAR = "01114";
const PARLOR = "01115";
const MINION = "01160"; // Ghoul Minion: its spawn and prey are set per test
const ACOLYTE = "01169"; // a Cultist

const saved = new Map<string, Partial<CardDef>>();
function patch(code: string, p: Partial<CardDef>) {
  if (!saved.has(code))
    saved.set(code, {
      traits: db.cards[code].traits,
      spawn: db.cards[code].spawn,
      prey: db.cards[code].prey,
    });
  Object.assign(db.cards[code], p);
}
afterEach(() => {
  for (const [code, p] of saved) Object.assign(db.cards[code], p);
  saved.clear();
});

/** the Study, with the Hallway beside it and the Attic and the Cellar beyond the Hallway */
const ids: Record<string, string> = {};
function house(game: GameContext) {
  ids[STUDY] = inv(game, ROLAND).location!;
  ids[HALLWAY] = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
  ids[ATTIC] = addLocation(game, ATTIC, [[HALLWAY, ATTIC]]);
  ids[CELLAR] = addLocation(game, CELLAR, [[HALLWAY, CELLAR]]);
}
const enemyAt = (game: GameContext, code: string, loc: string) => {
  const id = createCard(game, code, ZONE.Enemy);
  moveCard(game, id, ZONE.Enemy, { location: loc });
  return id;
};
const spawn = (r: ReturnType<typeof game>, enemy: string) =>
  inject(r, (g) => moveCard(g, enemy, ZONE.Limbo), { t: STEP.Spawn, enemy, inv: ROLAND });

describe("spawn expressions", () => {
  it("any empty Arkham location: the drawer chooses among the empty ones", () => {
    for (const c of [HALLWAY, ATTIC, CELLAR]) patch(c, { traits: ["Arkham"] });
    patch(MINION, { spawn: { trait: "Arkham", empty: true } });
    let minion = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        house(g);
        enemyAt(g, ACOLYTE, ids[CELLAR]);
        minion = createCard(g, MINION, ZONE.Limbo);
      },
    });
    r = spawn(r, minion);
    expect(r.state.pending?.options.map((o) => o.value).sort()).toEqual(
      [ids[HALLWAY], ids[ATTIC]].sort(),
    );
  });

  it("the nearest Prison", () => {
    for (const c of [HALLWAY, CELLAR]) patch(c, { traits: ["Prison"] });
    patch(MINION, { spawn: { trait: "Prison", nearest: true } });
    let minion = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => (house(g), (minion = createCard(g, MINION, ZONE.Limbo))),
    });
    r = toTurn(spawn(r, minion));
    expect(card(gOf(r), minion).location).toBe(ids[HALLWAY]);
  });

  it("connected to you, unrevealed if able", () => {
    patch(MINION, { spawn: { connected: true, unrevealed: "ifAble" } });
    let minion = "";
    let parlor = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        house(g);
        parlor = createCard(g, PARLOR, ZONE.Location);
        connections.set(g, [...(connections.get(g) ?? []), [STUDY, PARLOR]]);
        minion = createCard(g, MINION, ZONE.Limbo);
      },
    });
    r = toTurn(spawn(r, minion));
    expect(card(gOf(r), minion).location).toBe(parlor);
  });

  it("prey nearest to a Cultist engages the investigator nearest one", () => {
    patch(MINION, { spawn: "Engaged with Prey", prey: { nearestTo: { trait: "Cultist" } } });
    let minion = "";
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        house(g);
        placeInvestigator(g, DAISY, ids[CELLAR]);
        enemyAt(g, ACOLYTE, ids[CELLAR]);
        minion = createCard(g, MINION, ZONE.Limbo);
      },
    });
    r = toTurn(spawn(r, minion));
    expect(card(gOf(r), minion).engagedWith).toBe(DAISY);
  });
});
