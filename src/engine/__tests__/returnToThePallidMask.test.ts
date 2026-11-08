/** Return to The Pallid Mask (campaign-return-to-the-path-to-carcosa, group 7): setup card 52048 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, options, pick } from "../kits/testkit";
import { game, inject, toTurn, until } from "../kits/driver";
import { canEnemyEnter } from "../rules/enemies";
import { connections, enemies, findByCode, locationAt } from "../queries";
import {
  allCards,
  card,
  currentAct,
  currentAgenda,
  inv,
  placeInvestigator,
  reveal,
  setController,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard, setCell } from "../movement";
import * as flags from "../world/flags";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const R = "01001";
const BASE_CATACOMBS = 14; // 11 codes, three of them twice
const NEW = ["52049", "52050", "52051", "52052"];
const GATE = "03247";
const BLOCKED = "03256";
const TOMB = "03257";
const MITPM = "03059";
const SKELETON = "52053";
const CLASP = "03142";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const rtpm = ({ invs = [R], bag = ["0"], seed = 1, log = {}, prep }: Opts = {}) =>
  game({
    scenario: "return-to-the-pallid-mask",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-path-to-carcosa", campaignLog: log },
  });

const start = (game: GameContext) => flags.startLocation.get(game)!;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const CATACOMBS = [
  GATE,
  "03248",
  "03249",
  "03250",
  "03251",
  "03252",
  "03253",
  "03254",
  "03255",
  BLOCKED,
  TOMB,
  ...NEW,
];
/** a Catacombs (by code), set aside or removed, put into play on a cell, unrevealed */
function place(game: GameContext, code: string, cell: [number, number]): InstId {
  const c = allCards(game).find(
    (x) => x.code === code && (x.zone === ZONE.SetAside || x.zone === ZONE.Removed),
  )!;
  moveCard(game, c.id, ZONE.Location);
  setCell(game, c.id, cell);
  return c.id;
}
function clearMap(game: GameContext) {
  for (const l of allCards(game).filter((x) => x.zone === ZONE.Location && x.id !== start(game)))
    moveCard(game, l.id, ZONE.SetAside);
}
const inPlay = (game: GameContext) => allCards(game).filter((c) => c.zone === ZONE.Location).length;
const toEnd = (r: Result) => until(r, () => false, 400);
const firstTurn = (o: Opts = {}) => toTurn(rtpm(o), R);
const toAct = (game: GameContext, code: string) => {
  moveCard(game, currentAct(game)!, ZONE.Removed);
  moveCard(game, findByCode(game, code, [ZONE.ActDeck])!.id, ZONE.Act, { deck: "a" });
};

describe("setup", () => {
  it("the four new Catacombs join the pool; four random others (not the start, the Tomb or the Blocked Passage) leave unseen", () => {
    for (const seed of [1, 2, 3, 4]) {
      const g = gOf(rtpm({ seed }));
      const all = allCards(g).filter((c) => CATACOMBS.includes(c.code));
      expect(all).toHaveLength(BASE_CATACOMBS + 4);
      const removed = all.filter((c) => c.zone === ZONE.Removed);
      expect(removed).toHaveLength(4);
      for (const c of removed)
        expect([TOMB, BLOCKED, card(g, start(g)).code]).not.toContain(c.code);
      expect(card(g, start(g)).code).toBe(GATE);
      // in play and in the deck: the 14 base ones and the 4 new ones, 4 fewer
      const deck = flags.catacombs.get(g)!.filter((id) => card(g, id).zone === ZONE.SetAside);
      expect(deck.length + inPlay(g)).toBe(BASE_CATACOMBS + 4 - 4);
    }
  });

  it("awoke inside the catacombs: the start may be one of the new Catacombs", () => {
    const starts = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const g = gOf(rtpm({ seed, log: { awokeInsideCatacombs: true } }));
      starts.add(card(g, start(g)).code);
    }
    expect([...starts].some((c) => NEW.includes(c))).toBe(true);
    expect(starts.has(TOMB) || starts.has(BLOCKED)).toBe(false);
  });
});

describe("52048: The Man in the Pallid Mask", () => {
  it("is no Humanoid to Corpse Dweller: with only him in play it is discarded and the drawer draws again", () => {
    const alone = firstTurn({
      prep: (g) => {
        moveCard(g, findByCode(g, MITPM, [ZONE.SetAside])!.id, ZONE.Enemy, { location: start(g) });
        createCard(g, "03259", ZONE.Limbo);
      },
    });
    const d = allCards(gOf(alone)).find((c) => c.code === "03259")!.id;
    const n = alone.state.log.length;
    const after = run(alone, { t: STEP.Spawn, enemy: d, inv: R } as Step);
    const g = gOf(after);
    expect(card(g, d).zone).toBe(ZONE.EncounterDiscard);
    expect(enemies(g).some((e) => e.code === MITPM)).toBe(true);
    expect(after.state.log.slice(n).some((e) => e.type === "encounter")).toBe(true);
  });

  it("with another Humanoid it spawns there and discards that one, never him", () => {
    let docent = "";
    const r = firstTurn({
      prep: (g) => {
        moveCard(g, findByCode(g, MITPM, [ZONE.SetAside])!.id, ZONE.Enemy, { location: start(g) });
        docent = createCard(g, "03258", ZONE.Enemy);
        moveCard(g, docent, ZONE.Enemy, { location: start(g) });
        createCard(g, "03259", ZONE.Limbo);
      },
    });
    const d = allCards(gOf(r)).find((c) => c.code === "03259")!.id;
    const g = gOf(run(r, { t: STEP.Spawn, enemy: d, inv: R } as Step));
    expect(card(g, d).location).toBe(start(g));
    expect(card(g, docent).zone).not.toBe(ZONE.Enemy);
    expect(enemies(g).some((e) => e.code === MITPM)).toBe(true);
  });

  it("cannot leave the Tomb of Shadows while it is act 2", () => {
    let him = "";
    let tomb = "";
    const at = (act: string) =>
      gOf(
        firstTurn({
          prep: (g) => {
            toAct(g, act);
            tomb = place(g, TOMB, [1, 0]);
            reveal(g, tomb);
            him = findByCode(g, MITPM, [ZONE.SetAside])!.id;
            moveCard(g, him, ZONE.Enemy, { location: tomb });
          },
        }),
      );
    const g2 = at("03244");
    expect(canEnemyEnter(g2, him, start(g2))).toBe(false);
    const g3 = at("03245");
    expect(canEnemyEnter(g3, him, start(g3))).toBe(true);
  });
});

describe("the box's Catacombs", () => {
  it("52050 Mound of Bones: four Catacombs around it; at the end of the round a Malformed Skeleton spawns there", () => {
    let r = firstTurn({ prep: (g) => (clearMap(g), void place(g, "52050", [1, 0])) });
    const mound = findByCode(gOf(r), "52050", [ZONE.Location])!.id;
    const before = inPlay(gOf(r));
    r = run(r, { t: STEP.RevealLocation, location: mound });
    let g = gOf(r);
    // [0,0] is the start: three free spots around it
    for (const c of [
      [1, -1],
      [1, 1],
      [2, 0],
    ] as [number, number][])
      expect(locationAt(g, c)).toBeTruthy();
    expect(inPlay(g)).toBe(before + 3);
    r = toTurn(pick(r, "End turn"), R);
    g = gOf(r);
    expect(enemies(g).find((e) => e.code === SKELETON)?.location).toBe(mound);
  });

  it("52049 Secret Passage: revealed puts a Catacombs to its right; the clasp reveals that one", () => {
    let r = firstTurn({
      prep: (g) => {
        clearMap(g);
        const sp = place(g, "52049", [1, 0]);
        placeInvestigator(g, R, sp);
        setController(g, createCard(g, CLASP, ZONE.Play), R);
      },
    });
    const sp = findByCode(gOf(r), "52049", [ZONE.Location])!.id;
    r = run(r, { t: STEP.RevealLocation, location: sp });
    const right = locationAt(gOf(r), [2, 0])!;
    expect(card(gOf(r), right).revealed).toBe(false);
    r = toTurn(pick(r, /Secret Passage: place the clasp/), R);
    expect(card(gOf(r), right).revealed).toBe(true);
  });

  it("52051 Research Site: revealed puts a Catacombs beside any other location; investigating it reveals any Catacombs", () => {
    let r = firstTurn({
      bag: ["+1"],
      prep: (g) => {
        clearMap(g);
        place(g, "52051", [1, 0]);
      },
    });
    const site = findByCode(gOf(r), "52051", [ZONE.Location])!.id;
    const before = inPlay(gOf(r));
    r = inject(r, () => {}, { t: STEP.RevealLocation, location: site });
    // the only other location is the Gate (the site itself is excluded): above or below it
    r = until(r, (x) => /put the next Catacombs where/.test(x.state.pending?.prompt ?? ""));
    expect(options(r).sort()).toEqual(["Above", "Below"]);
    r = toTurn(pick(r, "Below"), R);
    expect(inPlay(gOf(r))).toBe(before + 1);
    const placed = locationAt(gOf(r), [0, 1])!;
    expect(card(gOf(r), placed).revealed).toBe(false);
    // after a successful investigation there: reveal any Catacombs, once per game
    const window: Step = {
      t: STEP.Window,
      trigger: "successfulInvestigate",
      data: { inv: R, location: site },
    };
    r = inject(r, (g) => placeInvestigator(g, R, site), window);
    r = toTurn(pick(r, /Research Site: reveal any Catacombs/), R); // the only hidden one: no choice
    expect(card(gOf(r), placed).revealed).toBe(true);
    const again = inject(r, () => {}, window);
    expect(options(again).some((o) => /Research Site: reveal/.test(o))).toBe(false);
  });

  it("52052 Sea of Skulls: a Catacombs beside the farthest location, marked with horror and connected to it", () => {
    let r = firstTurn({
      prep: (g) => {
        clearMap(g);
        reveal(g, place(g, "03248", [1, 0]));
        reveal(g, place(g, "03249", [2, 0])); // 3 away from the sea: the farthest
        place(g, "52052", [-1, 0]);
      },
    });
    const sea = findByCode(gOf(r), "52052", [ZONE.Location])!.id;
    r = inject(r, () => {}, { t: STEP.RevealLocation, location: sea });
    r = until(r, (x) => /put the next Catacombs where/.test(x.state.pending?.prompt ?? ""));
    r = toTurn(pick(r, "To the right"), R);
    const g = gOf(r);
    const marked = locationAt(g, [3, 0])!;
    expect(card(g, marked).horror).toBe(1);
    expect(connections(g, sea)).toContain(marked);
    expect(connections(g, marked)).toContain(sea);
  });

  it("52052 Sea of Skulls: ending your turn there takes 1 direct horror or discards 3 chosen cards", () => {
    const r = firstTurn({
      prep: (g) => {
        clearMap(g);
        const s = place(g, "52052", [1, 0]);
        reveal(g, s);
        placeInvestigator(g, R, s);
      },
    });
    const ended = until(pick(r, "End turn"), (x) =>
      options(x).some((o) => /direct horror/.test(o)),
    );
    expect(options(ended).some((o) => /discard 3/.test(o))).toBe(true);
    expect(inv(gOf(toTurn(pick(ended, /direct horror/), R)), R).horror).toBe(1);
  });
});

describe("52053 Malformed Skeleton", () => {
  it("with no investigator within 2 it moves to the unrevealed location nearest an investigator instead of hunting", () => {
    let s = "";
    let r = firstTurn({
      prep: (g) => {
        clearMap(g);
        const a = place(g, "03248", [1, 0]);
        const b = place(g, "03249", [2, 0]);
        const c = place(g, "03250", [3, 0]);
        const far = place(g, "03251", [4, 0]);
        for (const x of [a, b, c, far]) reveal(g, x);
        place(g, "03252", [0, 1]); // the only unrevealed Catacombs, next to the start
        s = allCards(g).find((x) => x.code === SKELETON)!.id;
        moveCard(g, s, ZONE.Enemy, { location: far });
      },
    });
    r = toTurn(pick(r, "End turn"), R);
    const g = gOf(r);
    expect(card(g, s).location).toBe(locationAt(g, [0, 1]));
  });

  it("within 2 locations of an investigator it hunts as usual", () => {
    let s = "";
    let r = firstTurn({
      prep: (g) => {
        clearMap(g);
        const a = place(g, "03248", [1, 0]);
        const b = place(g, "03249", [2, 0]);
        for (const x of [a, b]) reveal(g, x);
        place(g, "03252", [0, 1]);
        s = allCards(g).find((x) => x.code === SKELETON)!.id;
        moveCard(g, s, ZONE.Enemy, { location: b });
      },
    });
    r = toTurn(pick(r, "End turn"), R);
    const g = gOf(r);
    expect(card(g, s).location).toBe(locationAt(g, [1, 0]));
  });

  it("its attack deals its damage or its horror, as you choose", () => {
    let s = "";
    let r = firstTurn({
      prep: (g) => {
        s = allCards(g).find((x) => x.code === SKELETON)!.id;
        moveCard(g, s, ZONE.Enemy, { location: start(g) });
      },
    });
    r = inject(r, () => {}, { t: STEP.EnemyAttack, enemy: s, inv: R, key: "atk-test" } as Step);
    r = until(r, (x) => /damage or its horror/.test(x.state.pending?.prompt ?? ""));
    r = toTurn(pick(r, /horror only/), R);
    expect(inv(gOf(r), R)).toMatchObject({ damage: 0 });
    expect(inv(gOf(r), R).horror).toBeGreaterThan(0);
  });
});

describe("the resolutions, played", () => {
  it("3a everyone at the Gate: R1; 3b everyone at the Blocked Passage: R2; agenda 2b: no resolution", () => {
    const r1 = firstTurn({
      prep: (g) => {
        toAct(g, "03245");
        clearMap(g);
      },
    });
    expect(toEnd(run(r1, { t: STEP.CheckObjectives } as Step)).state.resolution).toBe("R1");
    let r2 = firstTurn({
      prep: (g) => {
        toAct(g, "03246");
        const b = place(g, BLOCKED, [1, 0]);
        placeInvestigator(g, R, b);
      },
    });
    const b = findByCode(gOf(r2), BLOCKED, [ZONE.Location])!.id;
    r2 = inject(r2, () => {}, { t: STEP.RevealLocation, location: b, by: R } as Step);
    expect(toEnd(r2).state.resolution).toBe("R2");
    const none = toEnd(
      inject(
        firstTurn({
          prep: (g) => {
            moveCard(g, currentAgenda(g)!, ZONE.Removed);
            moveCard(g, findByCode(g, "03242", [ZONE.AgendaDeck])!.id, ZONE.Agenda, { deck: "a" });
            setCounter(g, currentAgenda(g)!, "doom", 12);
          },
        }),
        () => {},
        { t: STEP.CheckDoom },
      ),
    );
    expect(none.state.resolution).toBe("none");
  });
});
