/** Return to Dim Carcosa (campaign-return-to-the-path-to-carcosa, group 9): setup card 52059 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { db, gOf, options, pick } from "../kits/testkit";
import { applyScenarioEnd, startCampaign } from "../campaign/campaign";
import { game, inject, toTurn, until } from "../kits/driver";
import { attackable, connections, findByCode, skillValue } from "../queries";
import {
  allCards,
  card,
  currentAct,
  currentAgenda,
  deckCards,
  inv,
  placeInvestigator,
  setController,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { canEnemyEnter } from "../rules/enemies";
import * as flags from "../world/flags";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3
const D = "01002"; // Daisy
const SHORES = "03325";
const SPIRES = "03330";
const OLD_PALACE = "03331";
const DOMAIN = "52060";
const RECESSES = "52061";
const THRONE = "52062";
const STAGE = "52063";
const PRIEST = "52064";
const TATTERED = "03334";
const KING_IN_YELLOW = "03332";
const LORD = "03333";
const SECRET = "dcaKnowTheSecret";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const rdc = ({ invs = [R], bag = ["0"], log = { openedPathBelow: true }, prep }: Opts = {}) =>
  game({
    scenario: "return-to-dim-carcosa",
    investigators: invs,
    bag,
    seed: 1,
    prep,
    extra: { campaignId: "return-to-the-path-to-carcosa", campaignLog: log },
  });

const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const zones = (game: GameContext, code: string) =>
  allCards(game)
    .filter((c) => c.code === code)
    .map((c) => c.zone);
const at = (game: GameContext, code: string) =>
  allCards(game).find((c) => c.code === code && c.zone === ZONE.Location)!.id;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const toEnd = (r: Result) => until(r, () => false, 400);
/** a Hastur put into play at a location (The King in Yellow: at none) */
function hastur(game: GameContext, code: string, loc: InstId | null = null): InstId {
  const h = findByCode(game, code, [ZONE.SetAside])!.id;
  moveCard(game, h, ZONE.Enemy, { location: loc });
  return h;
}
/** act 3 and agenda 3 current */
function finale(game: GameContext) {
  for (let k = 0; k < 2; k++) {
    moveCard(game, currentAct(game)!, ZONE.Removed);
    moveCard(game, deckCards(game, "act")[0], ZONE.Act);
    moveCard(game, currentAgenda(game)!, ZONE.Removed);
    moveCard(game, deckCards(game, "agenda")[0], ZONE.Agenda);
  }
}
/** Roland at a location with no clues, ready to flip it */
function standAt(game: GameContext, code: string) {
  const l = at(game, code);
  setCounter(game, l, "clues", 0);
  placeInvestigator(game, R, l);
}
const flipHere = (r: Result) => toTurn(pick(r, /flip your location/), R);
const canFlip = (r: Result) => options(r).some((o) => /flip your location/.test(o));
/** a set-aside location of the box put into play */
function enter(game: GameContext, code: string): InstId {
  const l = findByCode(game, code, [ZONE.SetAside])!.id;
  moveCard(game, l, ZONE.Location);
  return l;
}

describe("setup", () => {
  it("Hastur's Domain in place of the Palace of the King, with its links; the old Palace out; the three new locations aside", () => {
    const g = gOf(rdc());
    expect(zones(g, DOMAIN)).toEqual([ZONE.Location]);
    expect(zones(g, OLD_PALACE)).toEqual([ZONE.Removed]);
    for (const code of [RECESSES, THRONE, STAGE]) expect(zones(g, code)).toEqual([ZONE.SetAside]);
    expect(zones(g, PRIEST)).toEqual([ZONE.EncounterDeck]);
    const linked = connections(g, at(g, DOMAIN)).map((l) => codeOf(g, l)!);
    expect(linked).toHaveLength(2);
    expect(linked.every((c) => /^0332[78]/.test(c))).toBe(true);
    expect(codeOf(g, inv(g, R).location)).toBe(SHORES);
    expect(flags.named(g, "dcaHasturHealthFloor")).toBe(true);
  });
});

describe("Hastur's health floor of 2 per investigator", () => {
  // Songs That the Hyades Shall Sing (Shores of Hali's story): 1 damage per investigator to Hastur
  const songs = (damage: number, secret: boolean) => {
    let king = "";
    const r = rdc({
      prep: (g) => {
        finale(g);
        king = hastur(g, KING_IN_YELLOW);
        setCounter(g, king, "damage", damage);
        standAt(g, SHORES);
        if (secret) flags.rememberedFact.set(g, SECRET, true);
      },
    });
    return { r: flipHere(r), king };
  };

  it("without the secret he stops at 2 remaining health per investigator", () => {
    const { r, king } = songs(5, false); // health 7
    expect(card(gOf(r), king).damage).toBe(5);
    expect(card(gOf(r), king).zone).toBe(ZONE.Enemy);
    const below = songs(4, false);
    expect(card(gOf(below.r), below.king).damage).toBe(5);
  });

  it("with the secret he takes it, and is defeated on agenda 3", () => {
    const { r } = songs(6, true);
    expect(r.state.phase).toBe("ended");
    expect(r.state.resolution).toBe("R2");
  });
});

describe("52060 Hastur's Domain and Hastur's Last Stand", () => {
  const atDomain = (code: string, damage: number) => {
    let h = "";
    const r = rdc({
      prep: (g) => {
        finale(g);
        h = hastur(g, code, code === KING_IN_YELLOW ? null : at(g, SPIRES));
        setCounter(g, h, "damage", damage);
        standAt(g, DOMAIN);
      },
    });
    return { r, h };
  };

  it("can't be flipped while Hastur has more than 2 per investigator remaining health", () => {
    expect(canFlip(atDomain(KING_IN_YELLOW, 4).r)).toBe(false);
    expect(canFlip(atDomain(KING_IN_YELLOW, 5).r)).toBe(true);
  });

  it("puts the location of the Hastur in play into play, linked to the Domain; Lord of Carcosa moves to The Throne Room", () => {
    for (const [code, damage, loc] of [
      [KING_IN_YELLOW, 5, RECESSES],
      [LORD, 7, THRONE],
      [TATTERED, 6, STAGE],
    ] as const) {
      const { r, h } = atDomain(code, damage);
      const g = gOf(flipHere(r));
      const there = at(g, loc);
      expect(card(g, there).revealed).toBe(true);
      expect(connections(g, at(g, DOMAIN))).toContain(there);
      for (const other of [RECESSES, THRONE, STAGE].filter((c) => c !== loc))
        expect(zones(g, other)).toEqual([ZONE.SetAside]);
      if (code === LORD) expect(card(g, h).location).toBe(there);
      // flipped back, never again
      expect(codeOf(g, at(g, DOMAIN))).toBe(DOMAIN);
      expect(flags.rememberedFact.get(g, `dcaLocked:${at(g, DOMAIN)}`)).toBe(true);
    }
  });
});

describe("the new locations", () => {
  it("52061 Recesses of Your Own Mind: base willpower 0; no one commits to another's test there; its story: the secret", () => {
    let r = rdc({
      invs: [R, D],
      prep: (g) => {
        finale(g);
        hastur(g, KING_IN_YELLOW);
        enter(g, RECESSES);
        standAt(g, RECESSES);
        placeInvestigator(g, D, at(g, RECESSES));
      },
    });
    expect(skillValue(gOf(r), R, "willpower")).toBe(0);
    r = toTurn(pick(r, /flip your location/), R);
    expect(flags.rememberedFact.get(gOf(r), SECRET)).toBe(true);
    // a test of Roland's there: Daisy is never asked to commit
    let t = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "intellect", difficulty: 1 },
      ctx: { you: R, source: null },
    } as Step);
    t = t.state.pending?.kind === "commit" ? pick(t, "done") : t;
    expect(t.state.pending?.kind === "commit" && t.state.pending.inv === D).toBe(false);
  });

  it("52062 The Throne Room: Hastur there can't leave, exhaust or make attacks of opportunity; its story: the secret", () => {
    let h = "";
    let room = "";
    const r = rdc({
      prep: (g) => {
        finale(g);
        room = enter(g, THRONE);
        h = hastur(g, LORD, room);
      },
    });
    const g = gOf(run(r, { t: STEP.ExhaustEnemy, enemy: h } as Step));
    expect(card(g, h).exhausted).toBe(false);
    expect(canEnemyEnter(g, h, at(g, DOMAIN))).toBe(false);
    const elsewhere = gOf(
      inject(r, (x) => moveCard(x, h, ZONE.Enemy, { location: at(x, SPIRES) })),
    );
    expect(canEnemyEnter(elsewhere, h, at(elsewhere, DOMAIN))).toBe(true);
  });

  it("52063 Stage of the Ward Theatre: no attacking Hastur from there; while he moves, his location links to it", () => {
    let h = "";
    let stage = "";
    const r = rdc({
      prep: (g) => {
        finale(g);
        stage = enter(g, STAGE);
        h = hastur(g, TATTERED, at(g, SPIRES));
        placeInvestigator(g, R, stage);
      },
    });
    const g = gOf(r);
    expect(attackable(g, h, null, R)).toBe(false);
    const spires = at(g, SPIRES);
    expect(connections(g, spires, h)).toContain(stage);
    expect(connections(g, stage, h)).toContain(spires);
    expect(connections(g, spires)).not.toContain(stage);
    // nobody on the stage: no link
    const empty = gOf(inject(r, (x) => placeInvestigator(x, R, at(x, SHORES))));
    expect(connections(empty, spires, h)).not.toContain(stage);
  });

  it("52064 High Priest of Hastur: attacking a Possession holder eliminates them, driven insane", () => {
    let priest = "";
    const r = rdc({
      invs: [R, D],
      prep: (g) => {
        priest = findByCode(g, PRIEST, [ZONE.EncounterDeck])!.id;
        moveCard(g, priest, ZONE.Enemy, { location: inv(g, R).location });
        const p = createCard(g, "03340", ZONE.Limbo);
        moveCard(g, p, ZONE.Hand, { inv: R });
        setController(g, p, R);
      },
    });
    const g = gOf(
      inject(r, () => {}, { t: STEP.EnemyAttack, enemy: priest, inv: R, key: "atk" } as Step),
    );
    expect(inv(g, R).status).toBe("defeated");
    expect(flags.insane.get(g, R)).toBe(true);
    // the scenario's end marks them insane in the campaign
    const ended = inject(
      r,
      () => {},
      { t: STEP.EnemyAttack, enemy: priest, inv: R, key: "atk" } as Step,
      {
        t: STEP.Resolution,
        id: "R1",
      },
    );
    expect(ended.state.phase).toBe("ended");
    const c = applyScenarioEnd(
      db,
      startCampaign(db, {
        campaignId: "return-to-the-path-to-carcosa",
        difficulty: "standard",
        seed: 1,
        investigators: [
          { code: R, deckId: "roland-starter" },
          { code: D, deckId: "daisy-starter" },
        ],
      }),
      ended.state,
    );
    expect(c.investigators.map((i) => i.status)).toEqual(["insane", "active"]);
    // without a Possession, only the attack
    const d = gOf(run(r, { t: STEP.EnemyAttack, enemy: priest, inv: D, key: "atk" } as Step));
    expect(inv(d, D).status).toBe("playing");
  });
});

describe("the resolutions, played", () => {
  it("act 3's back by the Hastur defeated: R1, R2, R3; agenda 3's back: R4 or R5; none", () => {
    for (const [code, res] of [
      [TATTERED, "R1"],
      [KING_IN_YELLOW, "R2"],
      [LORD, "R3"],
    ] as const) {
      const r = toEnd(
        inject(
          rdc({ prep: finale }),
          (g) => flags.rememberedFact.set(g, `dcaHasturDefeated:${code}`, true),
          { t: STEP.AdvanceAct },
        ),
      );
      expect(r.state.resolution).toBe(res);
    }
    const agenda3 = (log: Record<string, unknown>) =>
      toEnd(
        inject(rdc({ log: { openedPathBelow: true, ...log }, prep: finale }), () => {}, {
          t: STEP.AdvanceAgenda,
        }),
      ).state.resolution;
    expect(agenda3({ conviction: 3, doubt: 3 })).toBe("R4");
    expect(agenda3({ conviction: 2, doubt: 3 })).toBe("R5");
    const none = toEnd(run(rdc(), { t: STEP.Defeated, inv: R, by: "damage" } as Step));
    expect(none.state.resolution).toBe("none");
  });

  it("played: Hastur at the floor, the Domain flipped, the secret in the Recesses, then the Songs defeat him: R2", () => {
    let king = "";
    let r = rdc({
      prep: (g) => {
        finale(g);
        king = hastur(g, KING_IN_YELLOW);
        setCounter(g, king, "damage", 5);
        standAt(g, DOMAIN);
      },
    });
    r = flipHere(r);
    r = inject(r, (g) => standAt(g, RECESSES));
    r = flipHere(toTurn(r, R));
    expect(flags.rememberedFact.get(gOf(r), SECRET)).toBe(true);
    r = inject(r, (g) => {
      setCounter(g, king, "damage", 6);
      standAt(g, SHORES);
    });
    r = flipHere(toTurn(r, R));
    expect(r.state.resolution).toBe("R2");
  });
});
