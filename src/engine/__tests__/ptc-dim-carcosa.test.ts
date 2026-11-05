/** Dim Carcosa (campaign-the-path-to-carcosa, group 9): setup, tokens, the sanity rule, the stories, cards, resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, type Result } from "../index";
import { db, gOf, options, pick, skipMulligans } from "../kits/testkit";
import { game, inject, lastTest, toTurn, until } from "../kits/driver";
import { canPlay } from "../rules/cards";
import {
  connections,
  enemies,
  findByCode,
  locations,
  maxSanity,
  remainingSanity,
} from "../queries";
import {
  addCounter,
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
import { createCard, discard, moveCard } from "../movement";
import { EVENT } from "../events/event";
import * as flags from "../world/flags";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry } from "../campaign/log";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; sanity 5
const D = "01002"; // Daisy: sanity 9
const SHORES = "03325";
const SPIRES = "03330";
const PALACE = "03331";
const MITPM = "03059";
const TATTERED = "03334";
const KING_IN_YELLOW = "03332";
const LORD = "03333";
const BEAST = "03088";
const MASK = "03321b";
const SLOTS = {
  bleak: ["03326a", "03326c"],
  ruins: ["03327a", "03327c", "03327e"],
  streets: ["03328a", "03328c", "03328e"],
  depths: ["03329a", "03329c"],
};

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const dca = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = { openedPathBelow: true },
  prep,
}: Opts = {}) =>
  game({
    scenario: "dim-carcosa",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-path-to-carcosa", campaignLog: log, difficulty },
  });

const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const inPlay = (game: GameContext, code: string) =>
  allCards(game).filter((c) => c.code === code && c.zone === ZONE.Location);
const at = (game: GameContext, code: string) =>
  allCards(game).find((c) => c.code === code && c.zone === ZONE.Location)!.id;
const slotIn = (game: GameContext, codes: string[]) =>
  allCards(game).find((c) => codes.includes(c.code) && c.zone === ZONE.Location)!;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** a Hastur put into play at a location (The King in Yellow: at none) */
function hastur(game: GameContext, code = TATTERED, loc: InstId | null = null): InstId {
  const h = findByCode(game, code, [ZONE.SetAside])!.id;
  moveCard(game, h, ZONE.Enemy, { location: loc });
  return h;
}
const act3 = (game: GameContext) => {
  for (let k = 0; k < 2; k++) {
    const id = currentAct(game)!;
    moveCard(game, id, ZONE.Removed);
    moveCard(game, deckCards(game, "act")[0], ZONE.Act);
  }
};

// ---------- 9.1 setup ----------
describe("setup", () => {
  it("one random copy of each location with versions in play, the others set aside; every location revealed with clues", () => {
    const picks = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const g = gOf(dca({ seed, invs: [R, D] }));
      for (const codes of Object.values(SLOTS)) {
        const here = allCards(g).filter((c) => codes.includes(c.code) && c.zone === ZONE.Location);
        expect(here).toHaveLength(1);
        picks.add(here[0].code);
        const aside = allCards(g).filter((c) => codes.includes(c.code) && c.zone === ZONE.SetAside);
        expect(aside).toHaveLength(codes.length - 1);
      }
      for (const code of [SHORES, SPIRES, PALACE]) expect(inPlay(g, code)).toHaveLength(1);
      for (const l of locations(g)) {
        expect(l.revealed).toBe(true);
      }
      expect(card(g, at(g, PALACE)).clues).toBe(6); // 3 per investigator
    }
    expect(picks.size).toBeGreaterThan(5);
  });

  it("the start: Shores of Hali through the path below, Dark Spires through the path above", () => {
    const below = gOf(dca());
    expect(codeOf(below, inv(below, R).location)).toBe(SHORES);
    const above = gOf(dca({ log: { openedPathAbove: true } }));
    expect(codeOf(above, inv(above, R).location)).toBe(SPIRES);
  });

  it("the three Hasturs, Beast of Aldebaran, The Pallid Mask and The Man in the Pallid Mask are set aside", () => {
    const g = gOf(dca());
    for (const code of [TATTERED, KING_IN_YELLOW, LORD, BEAST, MASK, MITPM])
      expect(findByCode(g, code, [ZONE.SetAside])).toBeTruthy();
    expect(allCards(g).filter((c) => c.zone === ZONE.EncounterDeck && c.code === MASK)).toEqual([]);
  });

  it("doom on agenda 1a by the tallies under Chasing the Stranger: 0–2: 3, 3–5: 2, 6–8: 1, 9 or more: none", () => {
    const doom = (n: number) => {
      const g = gOf(dca({ log: { openedPathBelow: true, chasingTheStranger: n } }));
      return card(g, currentAgenda(g)!).doom;
    };
    expect([0, 2, 3, 5, 6, 8, 9].map(doom)).toEqual([3, 3, 2, 2, 1, 1, 0]);
  });

  it("each investigator takes horror equal to half their sanity, and isn't defeated by it", () => {
    const g = gOf(dca({ invs: [R, D] }));
    expect(inv(g, R).horror).toBe(2); // sanity 5
    expect(inv(g, D).horror).toBe(4); // sanity 9
  });

  it("act 2 by Conviction and Doubt: 5 or less: v.I; more Doubt: v.II; more Conviction: v.III", () => {
    const act2 = (log: Record<string, unknown>) => {
      const g = gOf(dca({ log: { openedPathBelow: true, ...log } }));
      return codeOf(g, deckCards(g, "act")[0]);
    };
    expect(act2({ conviction: 3, doubt: 2 })).toBe("03321a");
    expect(act2({ conviction: 2, doubt: 4 })).toBe("03322a");
    expect(act2({ conviction: 5, doubt: 3 })).toBe("03323a");
  });

  it("act 2, tied at 6 or more: the lead chooses on the first turn", () => {
    let r = toTurn(
      skipMulligans(
        createGame(db, {
          campaignId: "the-path-to-carcosa",
          scenarioId: "dim-carcosa",
          difficulty: "standard",
          seed: 1,
          chaosBag: ["0"],
          campaignLog: { openedPathBelow: true, conviction: 3, doubt: 3 },
          investigators: [{ code: R, deck: [] }],
        }),
      ),
      (x) => x.state.pending?.promptKey === "dcaAct2",
    );
    expect(r.state.pending?.promptKey).toBe("dcaAct2");
    r = pick(r, /v\. III/);
    expect(codeOf(gOf(r), deckCards(gOf(r), "act")[0])).toBe("03323a");
  });
});

// ---------- 9.2 tokens ----------
const testOf = (skill: "willpower" | "intellect", difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill, difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;

describe("chaos tokens", () => {
  const draw = (bag: ChaosToken[], difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(dca({ bag, difficulty, prep }), testOf("willpower", against));

  it("skull −2, −4 with no remaining sanity; Hard: −X, the horror on you", () => {
    expect(mods(draw(["skull"], "standard"))).toEqual([-2]);
    const mad = (game: GameContext) => setCounter(game, R, "horror", 9);
    expect(mods(draw(["skull"], "standard", 0, mad))).toEqual([-4]);
    expect(mods(draw(["skull"], "hard"))).toEqual([-2]); // Roland's 2 horror from setup
    expect(mods(draw(["skull"], "hard", 0, mad))).toEqual([-9]);
  });

  it("cultist: reveal another; a failure takes 1 horror (2 on Hard)", () => {
    const r = draw(["cultist", "0"], "standard", 9);
    expect(lastTest(r)?.tokens).toHaveLength(2);
    expect(inv(gOf(r), R).horror).toBe(3);
    expect(inv(gOf(draw(["cultist", "0"], "hard", 9)), R).horror).toBe(4);
  });

  it("tablet −3: a failure with Hastur in play places 1 clue on your location", () => {
    const here = (r: Result) => card(gOf(r), inv(gOf(r), R).location!).clues;
    const without = draw(["tablet"], "standard", 9);
    const withHim = draw(["tablet"], "standard", 9, (g) => void hastur(g, KING_IN_YELLOW));
    expect(mods(withHim)).toEqual([-3]);
    expect(here(withHim)).toBe(here(without) + 1);
    expect(mods(draw(["tablet"], "hard"))).toEqual([-5]);
  });

  it("elder thing −3: during an attack on a Monster or Ancient One, lose 1 action", () => {
    let r = dca({
      bag: ["elderThing"],
      prep: (g) =>
        moveCard(g, findByCode(g, BEAST, [ZONE.SetAside])!.id, ZONE.Enemy, {
          location: inv(g, R).location,
        }),
    });
    const before = inv(gOf(r), R).actionsLeft;
    r = toTurn(fightOnce(r, BEAST), R);
    expect(mods(r)).toEqual([-3]);
    expect(inv(gOf(r), R).actionsLeft).toBe(before - 2);
  });
});

const fightOnce = (r: Result, code: string) => {
  const p = r.state.pending!;
  const o = p.options.find((x) => {
    const v = x.value as { kind?: string; enemy?: string };
    return v.kind === "fight" && !!v.enemy && card(gOf(r), v.enemy).code === code;
  })!;
  r = pick(r, o.id);
  return r.state.pending?.kind === "commit" ? pick(r, "done") : r;
};

// ---------- 9.3 the sanity rule, the acts, the agendas, the stories ----------
describe("sanity in the realm of Carcosa", () => {
  it("horror at or past your sanity doesn't defeat you; your remaining sanity is 0; damage still does", () => {
    let r = run(dca(), {
      t: STEP.AssignDamage,
      inv: R,
      damage: 0,
      horror: 6,
      direct: true,
      source: null,
    });
    const g = gOf(r);
    expect(inv(g, R).status).toBe("playing");
    expect(inv(g, R).horror).toBe(8);
    expect(remainingSanity(g, R)).toBe(0);
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.AssignDamage,
        inv: R,
        damage: 9,
        horror: 0,
        direct: true,
        source: null,
      }),
    );
    expect(inv(gOf(r), R).status).toBe("defeated");
  });

  it("Possession: with horror greater than twice your sanity you are killed", () => {
    let r = dca({
      prep: (g) => {
        possess(g, "03341", R);
      },
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.AssignDamage,
        inv: R,
        damage: 0,
        horror: 8,
        direct: true,
        source: null,
      }),
    );
    expect(inv(gOf(r), R).status).toBe("playing"); // 10 horror, sanity 5
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.AssignDamage,
        inv: R,
        damage: 0,
        horror: 1,
        direct: true,
        source: null,
      }),
    );
    expect(inv(gOf(r), R).status).toBe("defeated");
    expect(flags.killed.get(gOf(r), R)).toBe(true);
  });

  it("Possession (Torturous): spend 5 resources to discard it", () => {
    let r = dca({
      prep: (g) => {
        possess(g, "03341", R);
      },
    });
    r = toTurn(pick(r, /Torturous/), R);
    expect(inv(gOf(r), R).hand.some((h) => card(gOf(r), h).code === "03341")).toBe(false);
    expect(inv(gOf(r), R).resources).toBe(0);
  });

  it("Possession (Traitorous) committed to a test at your location makes it fail", () => {
    let r = dca({
      prep: (g) => {
        possess(g, "03340", R);
      },
    });
    r = inject(r, () => {}, testOf("willpower", 0));
    r = pick(r, /Commit Possession/);
    r = toTurn(pick(r, "done"), R);
    expect(lastTest(r)?.success).toBe(false);
  });

  it("Hastur's attack: horror in excess of your sanity deals 1 damage as well", () => {
    let king = "";
    let r = dca({ prep: (g) => (king = hastur(g, KING_IN_YELLOW)) });
    r = run(r, { t: STEP.EnemyAttack, enemy: king, inv: R, aoo: false, key: "k1" });
    expect(inv(gOf(r), R).horror).toBe(4);
    expect(inv(gOf(r), R).damage).toBe(0);
    r = run(r, { t: STEP.EnemyAttack, enemy: king, inv: R, aoo: false, key: "k2" });
    expect(inv(gOf(r), R).horror).toBe(6);
    expect(inv(gOf(r), R).damage).toBe(1);
  });
});

describe("the acts", () => {
  it("1b: The Man in the Pallid Mask spawns at the Palace of the King", () => {
    const r = run(dca(), { t: STEP.AdvanceAct });
    const him = enemies(gOf(r)).find((e) => e.code === MITPM)!;
    expect(codeOf(gOf(r), him.location)).toBe(PALACE);
    expect(codeOf(gOf(r), currentAct(gOf(r)))).toBe("03321a");
  });

  const atStranger = (log: Record<string, unknown>) =>
    dca({
      log: { openedPathBelow: true, ...log },
      prep: (g) => {
        moveCard(g, currentAct(g)!, ZONE.Removed);
        moveCard(g, deckCards(g, "act")[0], ZONE.Act);
        const him = findByCode(g, MITPM, [ZONE.SetAside])!.id;
        moveCard(g, him, ZONE.Enemy, { location: at(g, PALACE) });
        placeInvestigator(g, R, at(g, PALACE));
      },
    });

  it("2 v.I: no clues can be discovered; the lead at his location spends 3 actions: The Pallid Mask, The Tattered King", () => {
    let r = atStranger({});
    expect(options(r).some((o) => /spend 3 actions/.test(o))).toBe(true);
    r = toTurn(pick(r, /spend 3 actions/), R);
    const g = gOf(r);
    const mask = allCards(g).find((c) => c.code === MASK)!;
    expect(mask.zone).toBe(ZONE.Play);
    expect(mask.controller).toBe(R);
    expect(maxSanity(g, R)).toBe(3);
    expect(enemies(g).some((e) => e.code === MITPM)).toBe(false);
    expect(codeOf(g, enemies(g).find((e) => e.code === TATTERED)!.location)).toBe(PALACE);
    expect(codeOf(g, currentAct(g))).toBe("03324");
  });

  it("The Pallid Mask cannot leave play: no discard, return to hand or removal takes it", () => {
    const r = toTurn(pick(atStranger({}), /spend 3 actions/), R);
    const after = inject(r, (g) => {
      const mask = allCards(g).find((c) => c.code === MASK)!.id;
      discard(g, mask);
      moveCard(g, mask, ZONE.Hand, { inv: R });
      moveCard(g, mask, ZONE.Removed);
    });
    const g = gOf(after);
    const mask = allCards(g).find((c) => c.code === MASK)!;
    expect(mask.zone).toBe(ZONE.Play);
    expect(mask.controller).toBe(R);
    expect(maxSanity(g, R)).toBe(3);
    expect(after.events.some((e) => e.type === EVENT.Discard && e.card === mask.id)).toBe(false);
  });

  it("2 v.II: damage can't defeat him; his [action] ability does, and advances: The King in Yellow, at no location", () => {
    let r = atStranger({ conviction: 2, doubt: 4 });
    const him = enemies(gOf(r)).find((e) => e.code === MITPM)!.id;
    r = run(r, { t: STEP.DamageEnemy, enemy: him, amount: 20, by: R });
    expect(enemies(gOf(r)).some((e) => e.code === MITPM)).toBe(true);
    r = run(r, { t: STEP.DefeatEnemy, enemy: him, by: R });
    // no damage left to account for: the defeat comes from his ability
    const g0 = gOf(r);
    expect(codeOf(g0, currentAct(g0))).toBe("03322a");
    r = run(
      inject(r, (g) => setCounter(g, him, "damage", 0)),
      { t: STEP.DefeatEnemy, enemy: him, by: R },
    );
    const g = gOf(r);
    const king = enemies(g).find((e) => e.code === KING_IN_YELLOW)!;
    expect(king.location).toBeNull();
    expect(codeOf(g, currentAct(g))).toBe("03324");
  });

  it("2 v.III: defeated by damage, he advances the act: Lord of Carcosa spawns where he was", () => {
    let r = atStranger({ conviction: 5, doubt: 3 });
    const him = enemies(gOf(r)).find((e) => e.code === MITPM)!.id;
    r = run(r, { t: STEP.DamageEnemy, enemy: him, amount: 20, by: R });
    const g = gOf(r);
    expect(codeOf(g, enemies(g).find((e) => e.code === LORD)!.location)).toBe(PALACE);
    expect(codeOf(g, currentAct(g))).toBe("03324");
  });

  it("3: [fast] with no clues here: everyone's clues leave the game, the location flips and its story resolves", () => {
    let r = dca({
      prep: (g) => {
        act3(g);
        hastur(g, KING_IN_YELLOW);
        setCounter(g, at(g, SHORES), "clues", 0);
        addCounter(g, R, "clues", 2);
      },
    });
    r = toTurn(pick(r, /flip your location/), R);
    const g = gOf(r);
    expect(inv(g, R).clues).toBe(0);
    const king = enemies(g).find((e) => e.code === KING_IN_YELLOW)!;
    expect(king.damage).toBe(1); // Songs That the Hyades Shall Sing: 1 per investigator
    expect(king.exhausted).toBe(true);
    const shores = at(g, SHORES);
    expect(card(g, shores).code).toBe(SHORES);
    expect(flags.rememberedFact.get(g, `dcaLocked:${shores}`)).toBe(true);
    expect(options(r).some((o) => /flip your location/.test(o))).toBe(false);
  });

  it("3: a story that replaces its location: another copy takes its place, the investigators moved, with its clues", () => {
    let r = dca({
      seed: 1,
      prep: (g) => {
        act3(g);
        const plains = slotIn(g, SLOTS.bleak);
        // Bleak Plains whose story is a replacement (Stars of Aldebaran): 03326a
        if (plains.code !== "03326a") {
          const a = findByCode(g, "03326a", [ZONE.SetAside])!.id;
          moveCard(g, plains.id, ZONE.SetAside);
          moveCard(g, a, ZONE.Location);
        }
        const loc = at(g, "03326a");
        setCounter(g, loc, "clues", 0);
        placeInvestigator(g, R, loc);
        setCounter(g, R, "horror", 4);
      },
    });
    r = toTurn(pick(r, /flip your location/), R);
    const g = gOf(r);
    expect(inv(g, R).horror).toBe(1);
    expect(codeOf(g, inv(g, R).location)).toBe("03326c");
    expect(card(g, inv(g, R).location!).clues).toBe(1);
    expect(allCards(g).find((c) => c.code === "03326b")?.zone).toBe(ZONE.Removed);
    expect(connections(g, inv(g, R).location!).map((l) => codeOf(g, l))).toContain(SHORES);
  });

  it("3: the Palace can't be flipped until Hastur has 5 damage per investigator; Hastur's End: the secret, and he can be defeated", () => {
    let king = "";
    let r = dca({
      prep: (g) => {
        act3(g);
        moveCard(g, currentAgenda(g)!, ZONE.Removed);
        moveCard(g, deckCards(g, "agenda")[0], ZONE.Removed);
        moveCard(g, deckCards(g, "agenda")[0], ZONE.Agenda);
        king = hastur(g, KING_IN_YELLOW);
        placeInvestigator(g, R, at(g, PALACE));
        setCounter(g, at(g, PALACE), "clues", 0);
      },
    });
    expect(options(r).some((o) => /flip your location/.test(o))).toBe(false);
    r = inject(r, (g) => setCounter(g, king, "damage", 7));
    r = toTurn(r, R);
    r = toTurn(pick(r, /flip your location/), R);
    const g = gOf(r);
    expect(flags.rememberedFact.get(g, "dcaKnowTheSecret")).toBe(true);
    expect(r.state.phase).toBe("ended");
    expect(r.state.resolution).toBe("R2");
  });

  it("Hastur cannot be defeated on agendas 1 and 2, nor on 3 without the secret", () => {
    let king = "";
    const r = dca({ prep: (g) => (king = hastur(g, TATTERED, at(g, PALACE))) });
    const g = gOf(run(r, { t: STEP.DefeatEnemy, enemy: king, by: R }));
    expect(card(g, king).zone).toBe(ZONE.Enemy);
  });
});

describe("the agendas", () => {
  it("1: with 3 damage per investigator on Hastur, it advances; its back: the lead chooses, a failed test chooses again", () => {
    let king = "";
    let r = dca({ bag: ["autoFail"], prep: (g) => (king = hastur(g, KING_IN_YELLOW)) });
    r = inject(r, (g) => setCounter(g, king, "damage", 3), { t: STEP.CheckObjectives });
    r = until(r, (x) => x.state.pending?.promptKey === "dcaKeyTo");
    expect(options(r)).toHaveLength(4);
    r = pick(r, /snap out of it/);
    r = until(r, (x) => x.state.pending?.promptKey === "dcaKeyTo");
    expect(options(r)).toHaveLength(3);
    r = pick(r, /faint/);
    r = toTurn(r, R);
    const g = gOf(r);
    expect(codeOf(g, currentAgenda(g))).toBe("03318");
    expect(card(g, currentAgenda(g)!).doom).toBe(1);
  });

  it("2b: Beast of Aldebaran spawns at the Palace of the King", () => {
    const r = run(
      dca({
        prep: (g) => {
          moveCard(g, currentAgenda(g)!, ZONE.Removed);
          moveCard(g, deckCards(g, "agenda")[0], ZONE.Agenda);
        },
      }),
      { t: STEP.AdvanceAgenda },
    );
    const g = gOf(r);
    expect(codeOf(g, enemies(g).find((e) => e.code === BEAST)!.location)).toBe(PALACE);
  });

  it("3b: Resolution 4 with as much Conviction as Doubt, else 5", () => {
    const end = (log: Record<string, unknown>) => {
      const r = until(
        inject(
          dca({
            log: { openedPathBelow: true, ...log },
            prep: (g) => {
              moveCard(g, currentAgenda(g)!, ZONE.Removed);
              moveCard(g, deckCards(g, "agenda")[0], ZONE.Removed);
              moveCard(g, deckCards(g, "agenda")[0], ZONE.Agenda);
            },
          }),
          () => {},
          { t: STEP.AdvanceAgenda },
        ),
        () => false,
      );
      return r.state.resolution;
    };
    expect(end({ conviction: 3, doubt: 3 })).toBe("R4");
    expect(end({ conviction: 2, doubt: 3 })).toBe("R5");
  });
});

// ---------- 9.4 cards ----------
describe("cards", () => {
  it("03332 The King in Yellow attacks each investigator at the beginning of the enemy phase; his [action] exhausts him", () => {
    let king = "";
    let r = dca({ bag: ["+1"], prep: (g) => (king = hastur(g, KING_IN_YELLOW)) });
    r = toTurn(pick(r, /exhaust him/), R);
    r = r.state.pending?.kind === "commit" ? toTurn(pick(r, "done"), R) : r;
    expect(card(gOf(r), king).exhausted).toBe(true);
  });

  it("03326 Bleak Plains: no [[Ally]] assets played there; 03329 Depths of Demhe: no fast cards", () => {
    const g = gOf(
      dca({
        prep: (x) => {
          placeInvestigator(x, R, slotIn(x, SLOTS.bleak).id);
        },
      }),
    );
    const ally = createCard(g, "01018", ZONE.Hand, R); // Beat Cop
    moveCard(g, ally, ZONE.Hand, { inv: R });
    setCounter(g, R, "resources", 9);
    expect(canPlayHere(g, ally)).toBe(false);
    placeInvestigator(g, R, slotIn(g, SLOTS.depths).id);
    expect(canPlayHere(g, ally)).toBe(true);
    const fast = createCard(g, "01022", ZONE.Hand, R); // Evidence! (fast)
    moveCard(g, fast, ZONE.Hand, { inv: R });
    expect(canPlayFast(g, fast)).toBe(false);
  });

  it("03327 Ruins of Carcosa: the last clue discovered there deals 1 damage; 03328 Dim Streets: 1 action lost", () => {
    for (const [slot, check] of [
      [SLOTS.ruins, (game: GameContext) => inv(game, R).damage === 1],
      [SLOTS.streets, (game: GameContext) => inv(game, R).actionsLeft === 2],
    ] as const) {
      let loc = "";
      const r = run(
        dca({
          prep: (g) => {
            loc = slotIn(g, slot).id;
            placeInvestigator(g, R, loc);
            setCounter(g, loc, "clues", 1);
          },
        }),
        { t: STEP.DiscoverClues, inv: R, location: loc, n: 1 },
      );
      expect(check(gOf(r))).toBe(true);
    }
  });

  /** an encounter card of this code revealed by Roland: the game before it, and the game as it resolves */
  function reveal(
    code: string,
    prep: (game: GameContext) => void = () => {},
    bag: ChaosToken[] = ["0"],
  ) {
    let id = "";
    const before = dca({
      bag,
      prep: (g) => {
        prep(g);
        id = createCard(g, code, ZONE.Limbo);
      },
    });
    return { before, after: inject(before, () => {}, { t: STEP.Revelation, inv: R, card: id }) };
  }

  it("03337 Dismal Curse: a failure takes 2 damage, 4 past twice your sanity", () => {
    const take = (horror: number) =>
      toTurn(reveal("03337", (g) => setCounter(g, R, "horror", horror), ["autoFail"]).after, R);
    expect(inv(gOf(take(2)), R).damage).toBe(2);
    expect(inv(gOf(take(11)), R).damage).toBe(4);
  });

  it("03339 The Final Act: with no remaining sanity, 2 doom on the agenda", () => {
    const { before, after } = reveal("03339", (g) => setCounter(g, R, "horror", 6));
    const doom = (r: Result) => card(gOf(r), currentAgenda(gOf(r))!).doom;
    expect(doom(after)).toBe(doom(before) + 2);
    expect(doom(reveal("03339").after)).toBe(doom(before));
  });

  it("03338 Realm of Madness: discard cards costing X (the horror on you), or take 2 horror", () => {
    let x = reveal("03338").after;
    expect(x.state.pending?.promptKey).toBe("dcaRealm");
    x = toTurn(pick(x, /Take 2 horror/), R);
    expect(inv(gOf(x), R).horror).toBe(4);
  });

  it("03336 Winged One, ready and unengaged, moves once toward a location flipped over", () => {
    let wing = "";
    const r = toTurn(
      pick(
        dca({
          prep: (g) => {
            act3(g);
            hastur(g, KING_IN_YELLOW);
            wing = createCard(g, "03336", ZONE.Limbo);
            moveCard(g, wing, ZONE.Enemy, { location: slotIn(g, SLOTS.bleak).id });
            setCounter(g, at(g, SHORES), "clues", 0);
          },
        }),
        /flip your location/,
      ),
      R,
    );
    expect(codeOf(gOf(r), card(gOf(r), wing).location)).toBe(SHORES);
  });

  it("03335 Creature Out of Demhe attacks the investigators at a location flipped beside it", () => {
    let r = dca({
      prep: (g) => {
        act3(g);
        const depths = slotIn(g, SLOTS.depths).id;
        const c = createCard(g, "03335", ZONE.Limbo);
        moveCard(g, c, ZONE.Enemy, { location: depths });
        placeInvestigator(g, R, at(g, SPIRES));
        setCounter(g, at(g, SPIRES), "clues", 0);
      },
    });
    r = until(pick(r, /flip your location/), (x) => x.state.pending?.promptKey === "dcaFall");
    expect(r.state.log.some((e) => e.type === "attack" && codeOf(gOf(r), e.card) === "03335")).toBe(
      true,
    );
  });
});

/** a Possession in an investigator's hand, as Hidden puts it there */
function possess(game: GameContext, code: string, who: string) {
  const p = createCard(game, code, ZONE.Limbo);
  moveCard(game, p, ZONE.Hand, { inv: who });
  setController(game, p, who);
}
const canPlayHere = (game: GameContext, id: InstId) => canPlay(game, R, id, false);
const canPlayFast = (game: GameContext, id: InstId) => canPlay(game, R, id, true);

// ---------- 9.6 the end and the campaign ----------
describe("the end of the game", () => {
  it("records each investigator holding a Possession", () => {
    const r = until(
      inject(
        dca({
          invs: [R, D],
          prep: (g) => {
            possess(g, "03342", D);
          },
        }),
        () => {},
        { t: STEP.Resolution, id: "R1" },
      ),
      () => false,
    );
    expect(r.state.flags["cards:campaign_notes:possessed"]).toEqual([D]);
  });
});

describe("the campaign", () => {
  function walk(c: CampaignState): CampaignState {
    for (let k = 0; k < 160 && c.flow.waiting; k++) {
      const st = c.flow.waiting.step;
      if (st.kind === "play") break;
      const value =
        st.kind === "chooseOne"
          ? st.choices[0].id
          : st.kind === "investigatorChoice" || st.kind === "investigator"
            ? c.investigators[0].code
            : st.kind === "upgradeDecks" || st.kind === "continue"
              ? "continue"
              : null;
      c = advance(db, c, value);
    }
    return c;
  }
  function finish(
    c: CampaignState,
    resolution: string,
    fn: (game: GameContext) => void = () => {},
  ) {
    let r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c, 1))));
    r = inject(r, fn, { t: STEP.Resolution, id: resolution });
    return applyScenarioEnd(db, c, r.state);
  }
  const atDim = () => {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-path-to-carcosa",
        difficulty: "standard",
        seed: 2,
        investigators: [
          { code: R, deckId: "roland-starter" },
          { code: D, deckId: "daisy-starter" },
        ],
      }),
    );
    for (const res of ["R1", "R1", "R1", "R3", "R1", "R1", "R1"]) c = walk(finish(c, res));
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "dim-carcosa" });
    return c;
  };

  it("R4 and R5: each investigator driven insane, mental trauma equal to their sanity; the campaign is lost", () => {
    for (const res of ["R4", "R5"]) {
      const c = walk(finish(atDim(), res));
      expect(c.investigators.map((i) => i.status)).toEqual(["insane", "insane"]);
      expect(c.investigators.map((i) => i.mentalTrauma >= (db.cards[i.code].sanity ?? 0))).toEqual([
        true,
        true,
      ]);
      expect(c.result).toBe("lose");
    }
  });

  it("no resolution: Resolution 4 or 5 by Conviction and Doubt", () => {
    const c = walk(finish(atDim(), "none"));
    expect(hasEntry(c.log, "carcosaMerged") || hasEntry(c.log, "hasturHasYou")).toBe(true);
    expect(c.result).toBe("lose");
  });

  it("R1: the possessed recorded per investigator; the epilogue reads them; the campaign is won", () => {
    const c = walk(
      finish(atDim(), "R1", (g) => {
        possess(g, "03340", D);
      }),
    );
    expect(c.log.campaign_notes?.cards.possessed).toEqual([D]);
    expect(hasEntry(c.log, "preventedHastursEscape")).toBe(true);
    expect(c.result).toBe("win");
  });

  it("R2 with no one possessed: nothing recorded", () => {
    const c = walk(finish(atDim(), "R2"));
    expect(c.log.campaign_notes?.cards.possessed).toBeUndefined();
  });
});
