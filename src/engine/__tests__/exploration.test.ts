/** The exploration deck and Explore (engine-tfa-supplies-vengeance-exploration, group 1; ADR-0052). */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { CardDef, ScenarioDef, SetupStep } from "../../content/schema";
import { dispatch, type Result } from "../index";
import { arrangeOnTop, card, inv, pile, setController } from "../context";
import { createCard, moveCard } from "../movement";
import { cardsIn, checkCondition, connections, connectsBySymbol, findByCode } from "../queries";
import { tokenX } from "../rules/tokens";
import { botChoice } from "../bot";
import { db, gOf, mutate, options } from "../kits/testkit";
import { game, until, use } from "../kits/driver";
import { PILE, ZONE, type FixedPile } from "../world/constants";
import { explored } from "../world/flags";

beforeAll(async () => {
  await loadPack("tfa");
});

const R = "01001"; // Roland: willpower 3
const ID = "zz-exploration";
const CAMP = "04050"; // Expedition Camp: 0 clues
const THORNS = "04069"; // Path of Thorns: 1 clue per investigator
const CANYON = "04070"; // River Canyon
const BRIDGE = "04071"; // Rope Bridge
const TRAIL = "04073"; // Circuitous Trail
const LOST = "04081"; // Lost in the Wilds
const AGENDA = "04044"; // Expedition into the Wild: "[action]: Explore. … a connecting location"
const MINION = "01160"; // Ghoul Minion

/** the symbols of the fixture's map: the camp connects to Path of Thorns and River Canyon; Circuitous Trail doesn't */
const PATCH: Record<string, Partial<CardDef>> = {
  [CAMP]: { symbol: "circle", connectsTo: ["square", "triangle"] },
  [THORNS]: { symbol: "square", connectsTo: ["circle"] },
  [CANYON]: { symbol: "triangle", connectsTo: ["circle"] },
  [TRAIL]: { symbol: "diamond", connectsTo: ["square"] },
  [BRIDGE]: { symbol: "diamond", connectsTo: ["square"] },
  [AGENDA]: {
    abilities: [
      {
        kind: "action",
        label: "Explore",
        designator: "explore",
        effects: [{ op: "explore", match: { connecting: true } }],
      },
    ],
  },
};
const saved = new Map<string, CardDef>();
/** change cards for one test; restored after it */
const patch = (code: string, fields: Partial<CardDef>) => {
  if (!saved.has(code)) saved.set(code, db.cards[code]);
  db.cards[code] = { ...db.cards[code], ...fields };
};
afterEach(() => {
  for (const [code, d] of saved) db.cards[code] = d;
  saved.clear();
  delete db.scenarios[ID];
});

const BUILD: SetupStep = { do: "buildExploration", cards: [THORNS, TRAIL, LOST] };
/** a TFA-like scenario: Roland at the Expedition Camp, the agenda's Explore, the exploration deck `build` */
function fixture(build: SetupStep = BUILD, extra: Partial<ScenarioDef> = {}, seed = 1) {
  // a card a test patched already keeps its patch
  for (const [code, fields] of Object.entries(PATCH)) if (!saved.has(code)) patch(code, fields);
  db.scenarios[ID] = {
    ...db.scenarios["the-gathering"],
    id: ID,
    encounterSets: ["wilds", "rainforest", "expedition"],
    acts: [],
    agendas: [AGENDA],
    setup: [{ do: "putIntoPlay", codes: [CAMP] }, { do: "startAt", code: CAMP }, build],
    connections: [],
    layout: {},
    ...extra,
  };
  return game({ scenario: ID, investigators: [R], bag: ["0"], seed });
}

const codes = (r: Result, zone: FixedPile = PILE.Exploration) =>
  pile(gOf(r), zone).map((id) => card(gOf(r), id).code);
const zoneOf = (r: Result, code: string) =>
  cardsIn(gOf(r), ZONE.Location).some((c) => c.code === code)
    ? ZONE.Location
    : findByCode(gOf(r), code, [ZONE.Exploration, ZONE.Removed, ZONE.EncounterDiscard])?.zone;
const at = (r: Result) => card(gOf(r), inv(gOf(r), R).location!).code;
/** the exploration deck's top cards, in this order */
const stack = (r: Result, ...top: string[]) =>
  mutate(r, (g) =>
    arrangeOnTop(
      g,
      "exploration",
      top.map((c) => findByCode(g, c, [ZONE.Exploration])!.id),
    ),
  );
const explore = (r: Result) => use(r, AGENDA);
/** explore and answer neutrally until it is over (the window passed, the turn back) */
const exploreFully = (r: Result) => until(explore(r), (x) => x.state.pending?.kind === "turn");

describe("building the exploration deck (1.1)", () => {
  it("takes the listed cards out of the set-aside cards and the encounter deck", () => {
    const r = fixture();
    expect(codes(r).sort()).toEqual([THORNS, TRAIL, LOST].sort());
    // one copy of Lost in the Wilds per listing: its other copies stay in the encounter deck
    expect(codes(r, PILE.EncounterDeck).filter((c) => c === LOST)).toHaveLength(2);
  });

  it("a pick takes one of its list and removes the rest", () => {
    const r = fixture({
      do: "buildExploration",
      pick: [{ from: [THORNS, CANYON, BRIDGE], count: 1, rest: "remove" }],
    });
    expect(codes(r)).toHaveLength(1);
    const removed = [THORNS, CANYON, BRIDGE].filter((c) => zoneOf(r, c) === ZONE.Removed);
    expect(removed).toHaveLength(2);
  });

  it("bySymbol takes one location per symbol and removes the others; the same seed gives the same deck", () => {
    const build: SetupStep = { do: "buildExploration", bySymbol: [THORNS, CANYON, TRAIL, BRIDGE] };
    // two per symbol: square (Path of Thorns, River Canyon), diamond (Circuitous Trail, Rope Bridge)
    patch(CANYON, { symbol: "square" });
    const r = fixture(build, {}, 7);
    const deck = codes(r);
    expect(deck).toHaveLength(2);
    expect(deck.filter((c) => c === THORNS || c === CANYON)).toHaveLength(1);
    expect(deck.filter((c) => c === TRAIL || c === BRIDGE)).toHaveLength(1);
    expect(
      [THORNS, CANYON, TRAIL, BRIDGE].filter((c) => zoneOf(r, c) === ZONE.Removed),
    ).toHaveLength(2);
    expect(codes(fixture(build, {}, 7))).toEqual(deck);
  });
});

describe("connection symbols (1.2)", () => {
  it("connect locations in play by their symbols, and a card out of play by connectsBySymbol", () => {
    let r = fixture();
    const g0 = gOf(r);
    const camp = findByCode(g0, CAMP, [ZONE.Location])!.id;
    expect(connectsBySymbol(g0, camp, findByCode(g0, THORNS, [ZONE.Exploration])!.id)).toBe(true);
    expect(connectsBySymbol(g0, camp, findByCode(g0, TRAIL, [ZONE.Exploration])!.id)).toBe(false);
    r = mutate(r, (g) => {
      for (const c of [THORNS, TRAIL])
        moveCard(g, findByCode(g, c, [ZONE.Exploration])!.id, ZONE.Location);
    });
    const g = gOf(r);
    const id = (c: string) => findByCode(g, c, [ZONE.Location])!.id;
    expect(connections(g, camp)).toEqual([id(THORNS)]);
    expect(connections(g, id(THORNS))).toEqual([camp]);
    // a connection is the moving location's: the trail connects to the path, not the path to the trail
    expect(connections(g, id(TRAIL))).toEqual([id(THORNS)]);
  });
});

describe("exploring (1.3)", () => {
  it("a connecting location is put into play with its clues and the investigator moves there", () => {
    let r = stack(fixture(), THORNS);
    const actions = inv(gOf(r), R).actionsLeft;
    r = exploreFully(r);
    expect(explored.get(gOf(r), R)?.ok).toEqual([true]);
    expect(at(r)).toBe(THORNS);
    const thorns = findByCode(gOf(r), THORNS, [ZONE.Location])!;
    expect(thorns.revealed).toBe(true);
    expect(thorns.clues).toBe(1);
    expect(inv(gOf(r), R).actionsLeft).toBe(actions - 1);
  });

  it("a location that does not connect is set beside the deck, then shuffled back", () => {
    const r = exploreFully(stack(fixture(), TRAIL, THORNS));
    expect(at(r)).toBe(THORNS);
    expect(codes(r).sort()).toEqual([TRAIL, LOST].sort());
  });

  it("a treachery resolves, goes to the encounter discard pile, and the exploration fails", () => {
    const r = exploreFully(stack(fixture(), TRAIL, LOST));
    expect(explored.get(gOf(r), R)?.ok).toEqual([false]);
    expect(at(r)).toBe(CAMP);
    expect(zoneOf(r, LOST)).toBe(ZONE.EncounterDiscard);
    expect(codes(r).sort()).toEqual([THORNS, TRAIL].sort());
  });

  it("an enemy spawns as drawn", () => {
    let r = mutate(fixture(), (g) => {
      const id = createCard(g, MINION, ZONE.Limbo);
      moveCard(g, id, ZONE.Exploration, { top: true });
    });
    r = exploreFully(r);
    const minion = findByCode(gOf(r), MINION, [ZONE.Enemy])!;
    expect(minion.engagedWith).toBe(R);
    expect(at(r)).toBe(CAMP);
  });

  it("an empty deck ends the exploration, neither successful nor not", () => {
    let r = mutate(fixture(), (g) => {
      for (const id of [...pile(g, PILE.Exploration)]) moveCard(g, id, ZONE.SetAside);
    });
    r = exploreFully(r);
    expect(at(r)).toBe(CAMP);
    expect(explored.get(gOf(r), R)).toBeUndefined();
  });

  it("the tablet's X is the exploration deck's size (1.6)", () => {
    const r = fixture();
    expect(tokenX(gOf(r), "explorationDeckSize", R)).toBe(3);
  });
});

describe("after exploring (1.4)", () => {
  const reacting = () =>
    patch(AGENDA, {
      abilities: [
        ...(PATCH[AGENDA].abilities ?? []),
        {
          kind: "forced",
          trigger: "explored",
          condition: { explored: { ok: true } },
          effects: [{ op: "gainResources", amount: 1 }],
        },
      ],
    });
  const resources = (r: Result) => inv(gOf(r), R).resources;

  it("an ability on the explored window fires only on a successful exploration", () => {
    let r = fixture();
    reacting();
    const before = resources(r);
    r = exploreFully(stack(r, LOST));
    expect(resources(r)).toBe(before);
    r = exploreFully(stack(r, THORNS));
    expect(resources(r)).toBe(before + 1);
  });

  it("explored this turn remembers how each exploration went", () => {
    const r = exploreFully(stack(fixture(), THORNS));
    const g = gOf(r);
    expect(checkCondition(g, { explored: { ok: true, thisTurn: true } }, { you: R })).toBe(true);
    expect(checkCondition(g, { explored: { ok: false, thisTurn: true } }, { you: R })).toBe(false);
  });

  it("Lost in the Wilds' 'you cannot explore' blocks the action", () => {
    let r = fixture();
    expect(options(r)).toContain("Explore");
    patch(LOST, {
      abilities: [
        { kind: "constant", modifiers: [{ flag: "cannotExplore", scope: "controller" }] },
      ],
    });
    r = mutate(r, (g) => {
      const id = findByCode(g, LOST, [ZONE.Exploration])!.id;
      moveCard(g, id, ZONE.Threat);
      setController(g, id, R);
    });
    // the turn prompt is asked again with the threat area changed
    r = dispatch(db, r.state, { type: "choose", inv: R, option: JSON.stringify({ kind: "draw" }) });
    expect(options(r)).not.toContain("Explore");
  });

  it("'cannot explore at this location' blocks the action there", () => {
    let r = fixture();
    patch(CAMP, {
      abilities: [{ kind: "constant", modifiers: [{ flag: "cannotExplore", scope: "self" }] }],
    });
    r = dispatch(db, r.state, { type: "choose", inv: R, option: JSON.stringify({ kind: "draw" }) });
    expect(options(r)).not.toContain("Explore");
  });

  it("the scenario's afterExplore effects run after a successful exploration", () => {
    const r = exploreFully(
      stack(
        fixture(BUILD, { afterExplore: [{ op: "shuffleIntoExploration", card: "encounterTop" }] }),
        THORNS,
      ),
    );
    expect(codes(r)).toHaveLength(3);
  });
});

describe("the bot (1.6)", () => {
  it("explores from a location with no clues", () => {
    let r = mutate(stack(fixture(), THORNS), (g) => {
      for (const id of [...inv(g, R).hand]) moveCard(g, id, ZONE.Deck, { inv: R });
    });
    for (let k = 0; k < 20 && r.state.pending?.inv === R && !explored.get(gOf(r), R); k++)
      r = dispatch(db, r.state, { type: "choose", inv: R, option: botChoice(db, r) });
    expect(explored.get(gOf(r), R)?.ok).toEqual([true]);
  });
});
