/** The Path to Carcosa's player cards and its six investigators (player-cards-ptc, group 1): one test each, at least. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { card, inv, placeInvestigator, ready, setCounter } from "../context";
import type { GameContext } from "../context";
import {
  addLocation,
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  lastTest,
  offered,
  toTurn,
  until,
  use,
  windowOf,
} from "../kits/driver";
import { db, deckCodes, gOf, options, pick, skipMulligans } from "../kits/testkit";
import { createGame, type Result } from "../index";
import { createCard, moveCard, putBeneath, putOnTop } from "../movement";
import { controlled, enemies, findByCode, skillValue, threatArea } from "../queries";
import { fireGameEnd } from "../rules/scripts";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import { logEntry, role } from "../world/flags";
import type { Effect } from "../../content/schema";
import type { ChaosToken } from "../../content/schema";

beforeAll(() => loadPack("ptc"));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const MARK = "03001"; // combat 5
const MINH = "03002"; // willpower 4
const SEFINA = "03003";
const AKACHI = "03004";
const YORICK = "03005"; // willpower 3
const LOLA = "03006";
const STUDY = "01111"; // shroud 2
const HALLWAY = "01112"; // shroud 1
const ATTIC = "01113";
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3
const GUTS = "01089"; // skill: 2 willpower
const MACHETE = "01020"; // Guardian, Item, cost 3
const FLASHLIGHT = "01087"; // Neutral, Item, cost 2
const SHRIVELLING = "01060"; // Mystic Spell, cost 3, 4 charges
const CACHE = "01088"; // Emergency Cache: gain 3 resources

/** the Study with the Hallway (1 clue, unless said) beside it */
const hallway = (game: GameContext, clues = 1) => {
  const id = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
  setCounter(game, id, "clues", clues);
  return id;
};
const eff = (r: Result, you: string, e: Effect, ctx: Record<string, unknown> = {}) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source: null, ...ctx } });
const tokenMods = (r: Result) =>
  (r.state.log.findLast((x) => x.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
const codeOf = (r: Result, id: string) => card(gOf(r), id).code;
const mine = (r: Result, i: string, code: string) =>
  controlled(gOf(r), i).find((c) => c.code === code);
/** a card's revelation for `who`, the card made from nothing */
const reveal = (r: Result, who: string, code: string) => {
  let id = "";
  r = inject(r, (g) => void (id = createCard(g, code, ZONE.Limbo, who)));
  return { r: inject(r, () => {}, { t: STEP.Revelation, inv: who, card: id }), id };
};
const damage = (r: Result, who: string, n: number, direct = true) =>
  inject(r, () => {}, {
    t: STEP.AssignDamage,
    inv: who,
    damage: n,
    horror: 0,
    direct,
    source: null,
  });
const willpowerTest = (r: Result, who: string, difficulty: number) =>
  eff(r, who, { op: "skillTest", skill: "willpower", difficulty });
/** a scenario started with the investigator's own starter deck, at its first prompt */
const started = (code: string, seed = 1, bag?: ChaosToken[]) =>
  createGame(db, {
    campaignId: "night-of-the-zealot",
    scenarioId: "the-gathering",
    difficulty: "standard",
    seed,
    ...(bag ? { chaosBag: bag } : {}),
    investigators: [{ code, deck: deckCodes(`${code}-starter`) }],
  });

describe("Mark Harrigan", () => {
  it("begins with Sophie in play; draws 1 after damage on him, once per phase; elder sign +1 per damage", () => {
    let r = game({ investigators: [MARK], bag: ["elderSign"] });
    expect(mine(r, MARK, "03009")).toBeDefined();
    const n = inv(gOf(r), MARK).hand.length;
    r = until(damage(r, MARK, 1), offered(/^Mark Harrigan: draw/));
    r = toTurn(pick(r, /^Mark Harrigan: draw/), MARK);
    expect(inv(gOf(r), MARK).hand.length).toBe(n + 1);
    r = toTurn(damage(r, MARK, 1), MARK);
    expect(inv(gOf(r), MARK).hand.length).toBe(n + 1);
    r = toTurn(willpowerTest(r, MARK, 1), MARK);
    expect(tokenMods(r)).toEqual([2]);
  });

  it("damage on an asset he controls lets him draw too", () => {
    let r = game({ investigators: [MARK], prep: (g) => void inPlay(g, MARK, "01021") });
    const n = inv(gOf(r), MARK).hand.length;
    r = damage(r, MARK, 1, false);
    r = pick(r, /to Guard Dog/);
    r = until(r, offered(/^Mark Harrigan: draw/));
    r = toTurn(pick(r, /^Mark Harrigan: draw/), MARK);
    expect(inv(gOf(r), MARK).hand.length).toBe(n + 1);
  });
});

describe("Sophie (03009, 03009b)", () => {
  it("takes 1 direct damage for +2; flips at 5 damage (−1 to each skill) and back at 4", () => {
    let r = game({ investigators: [MARK], bag: ["0"] });
    r = willpowerTest(r, MARK, 9);
    r = until(r, offered(/^Sophie: take 1 direct damage/));
    r = pick(r, /^Sophie: take 1 direct damage/);
    r = toTurn(r, MARK);
    expect(lastTest(r)?.total).toBe(3 + 2);
    expect(inv(gOf(r), MARK).damage).toBe(1);
    r = toTurn(damage(r, MARK, 4), MARK);
    const sophie = findByCode(gOf(r), "03009b", [ZONE.Play]);
    expect(sophie).toBeDefined();
    expect(skillValue(gOf(r), MARK, "combat")).toBe(4);
    r = toTurn(eff(r, MARK, { op: "heal", damage: 1 }), MARK);
    expect(codeOf(r, sophie!.id)).toBe("03009");
    expect(skillValue(gOf(r), MARK, "combat")).toBe(5);
  });

  it("cannot leave play", () => {
    let r = game({ investigators: [MARK] });
    const sophie = mine(r, MARK, "03009")!.id;
    r = inject(r, (g) => moveCard(g, sophie, ZONE.Discard));
    expect(card(gOf(r), sophie).zone).toBe(ZONE.Play);
  });
});

describe("The Home Front (03007)", () => {
  it("a successful attack moves 1 damage from Mark to the attacked enemy", () => {
    let r = game({
      investigators: [MARK],
      bag: ["0"],
      prep: (g) => {
        setCounter(g, MARK, "damage", 2);
        enemyHere(g, MARK, RAVENOUS);
        hand(g, MARK, "03007");
      },
    });
    r = eff(r, MARK, { op: "fight" });
    r = until(r, offered(/^Commit The Home Front/));
    r = toTurn(pick(until(pick(r, /^Commit The Home Front/), offered(/^Done/)), /^Done/), MARK);
    expect(inv(gOf(r), MARK).damage).toBe(1);
    // 1 moved, 1 from the attack: the Ravenous Ghoul (health 3) has 2
    expect(enemies(gOf(r))[0].damage).toBe(2);
  });
});

describe("Shell Shock (03008)", () => {
  it("1 horror for every 2 damage on you", () => {
    let r = game({ investigators: [R], prep: (g) => setCounter(g, R, "damage", 5) });
    r = toTurn(reveal(r, R, "03008").r, R);
    expect(inv(gOf(r), R).horror).toBe(2);
  });
});

describe("Minh Thi Phan", () => {
  it("a card committed at her location gains a wild icon, once for each investigator per round", () => {
    let r = game({
      investigators: [R, MINH],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, GUTS);
        hand(g, R, "01067"); // Fearless: 1 willpower
      },
    });
    r = willpowerTest(r, R, 12);
    r = until(r, offered(/^Commit Guts/));
    r = pick(r, /^Commit Guts/);
    r = until(r, offered(/^Minh Thi Phan: the committed card/));
    expect(r.state.pending?.inv).toBe(MINH);
    r = pick(r, /^Minh Thi Phan: the committed card/);
    r = until(r, (x) => x.state.pending?.kind === "commit");
    r = pick(r, /^Commit Fearless/);
    // Roland's second card: not again this round
    expect(r.state.pending?.kind).toBe("commit");
    expect(windowOf(r)).toBeNull();
    r = toTurn(r, R);
    // willpower 3, Guts 2 and its wild 1, Fearless 1
    expect(lastTest(r)?.total).toBe(3 + 2 + 1 + 1);
  });

  it("her elder sign: +1, and a committed skill card back to its owner's hand after the test", () => {
    let guts = "";
    let r = game({
      investigators: [MINH],
      bag: ["elderSign"],
      prep: (g) => void (guts = hand(g, MINH, GUTS)),
    });
    r = willpowerTest(r, MINH, 1);
    r = until(r, offered(/^Commit Guts/));
    r = pick(r, /^Commit Guts/);
    r = until(r, offered("Return none"));
    r = toTurn(pick(r, "Guts"), MINH);
    expect(tokenMods(r)).toEqual([1]);
    expect(inv(gOf(r), MINH).hand).toContain(guts);
  });
});

describe("Analytical Mind (03010)", () => {
  it("commits 1 card to a test at another location; after exactly 1, exhaust to draw 1", () => {
    let r = game({
      investigators: [R, D],
      bag: ["0"],
      prep: (g) => {
        placeInvestigator(g, D, hallway(g));
        inPlay(g, D, "03010");
        hand(g, D, GUTS);
      },
    });
    const n = inv(gOf(r), D).hand.length;
    r = willpowerTest(r, R, 2);
    r = until(r, (x) => x.state.pending?.inv === D && x.state.pending.kind === "commit");
    r = pick(r, /^Commit Guts/);
    r = pick(until(r, offered(/^Done/)), /^Done/);
    r = until(r, offered(/^Analytical Mind: draw/));
    r = toTurn(pick(r, /^Analytical Mind: draw/), R);
    // Guts committed, then 1 drawn (and Guts' own draw on a success)
    expect(inv(gOf(r), D).hand.length).toBe(n - 1 + 1 + 1);
  });
});

describe("The King in Yellow (03011)", () => {
  it("goes to the threat area; no 1 or 2 cards committed; 6 matching icons by Minh discard it", () => {
    let r = game({
      investigators: [MINH],
      bag: ["0"],
      prep: (g) => {
        // 6 willpower icons: Guts 2, Unexpected Courage 2 (wild), Fearless 1 twice
        for (const code of [GUTS, "01093", "01067", "01067"]) hand(g, MINH, code);
        setCounter(g, MINH, "resources", 0);
      },
    });
    const rev = reveal(r, MINH, "03011");
    r = toTurn(rev.r, MINH);
    expect(threatArea(gOf(r), MINH).map((c) => c.id)).toContain(rev.id);
    r = willpowerTest(r, MINH, 1);
    // her own reaction to each commit is passed
    const commit = (x: Result, name: RegExp) => {
      x = pick(until(x, offered(name)), name);
      return x.state.pending?.kind === "commit" ? x : pick(x, "Pass");
    };
    r = commit(r, /^Commit Guts/);
    expect(options(r).some((o) => o.startsWith("Done"))).toBe(false);
    r = commit(r, /^Commit Unexpected Courage/);
    expect(options(r).some((o) => o.startsWith("Done"))).toBe(false);
    r = commit(r, /^Commit Fearless/);
    r = commit(r, /^Commit Fearless/);
    r = pick(r, /^Done/);
    r = until(r, offered(/^The King in Yellow: discard/));
    r = toTurn(pick(r, /^The King in Yellow: discard/), MINH);
    expect(card(gOf(r), rev.id).zone).toBe(ZONE.Discard);
  });
});

describe("Sefina Rousseau", () => {
  it("13 cards: up to 5 events beneath her, 8 kept, the rest discarded, no mulligan", () => {
    let r = started(SEFINA);
    expect(inv(gOf(r), SEFINA).hand).toHaveLength(13);
    const sefina = inv(gOf(r), SEFINA).cardId;
    for (let k = 0; k < 5 && options(r).length > 1; k++)
      r = pick(r, r.state.pending!.options[1].id);
    const under = gOf(r).s.world.piles[`beneath:${sefina}`] ?? [];
    expect(under.length).toBeGreaterThan(0);
    r = until(r, (x) => x.state.pending?.kind === "turn" || inv(gOf(x), SEFINA).hand.length <= 8);
    expect(r.state.log.some((e) => e.type === "mulligan")).toBe(false);
    r = toTurn(r, SEFINA);
    const me = inv(gOf(r), SEFINA);
    expect(me.hand).toHaveLength(8);
    expect(me.discard).toHaveLength(13 - under.length - 8);
    // her action draws one of them
    r = toTurn(use(r, SEFINA, 0), SEFINA);
    expect(inv(gOf(r), SEFINA).hand).toHaveLength(9);
  });

  it("her elder sign: +3, and she may draw an event beneath her", () => {
    let r = game({
      investigators: [SEFINA],
      bag: ["elderSign"],
      prep: (g) => putBeneath(g, createCard(g, CACHE, ZONE.Limbo, SEFINA), inv(g, SEFINA).cardId),
    });
    r = willpowerTest(r, SEFINA, 1);
    r = until(r, offered("Draw none"));
    r = toTurn(pick(r, "Emergency Cache"), SEFINA);
    expect(tokenMods(r)).toEqual([3]);
    expect(inv(gOf(r), SEFINA).hand.some((h) => codeOf(r, h) === CACHE)).toBe(true);
  });
});

describe("The Painted World (03012)", () => {
  it("played as a copy of an event beneath Sefina, then removed from the game", () => {
    let pw = "";
    let r = game({
      investigators: [SEFINA],
      prep: (g) => {
        putBeneath(g, createCard(g, CACHE, ZONE.Limbo, SEFINA), inv(g, SEFINA).cardId);
        pw = hand(g, SEFINA, "03012");
      },
    });
    const res = inv(gOf(r), SEFINA).resources;
    r = toTurn(pick(r, /^Play The Painted World/), SEFINA);
    expect(inv(gOf(r), SEFINA).resources).toBe(res + 3);
    expect(card(gOf(r), pw).zone).toBe(ZONE.Removed);
  });
});

describe("Stars of Hyades (03013)", () => {
  it("a random event beneath Sefina leaves the game; with 5+ cards in the deck it is shuffled back", () => {
    let cache = "";
    let r = game({
      investigators: [SEFINA],
      prep: (g) => {
        cache = createCard(g, CACHE, ZONE.Limbo, SEFINA);
        putBeneath(g, cache, inv(g, SEFINA).cardId);
      },
    });
    const rev = reveal(r, SEFINA, "03013");
    r = toTurn(rev.r, SEFINA);
    expect(card(gOf(r), cache).zone).toBe(ZONE.Removed);
    expect(card(gOf(r), rev.id).zone).toBe(ZONE.Deck);
    r = toTurn(reveal(r, SEFINA, "03013").r, SEFINA);
    expect(inv(gOf(r), SEFINA).damage).toBe(1);
    expect(inv(gOf(r), SEFINA).horror).toBe(1);
  });
});

describe("Akachi Onyele", () => {
  it("her charge assets enter play with 1 more; elder sign +1 and a charge", () => {
    let r = game({
      investigators: [AKACHI],
      bag: ["elderSign"],
      prep: (g) => {
        hand(g, AKACHI, SHRIVELLING);
        setCounter(g, AKACHI, "resources", 9);
      },
    });
    r = toTurn(pick(r, /^Play Shrivelling/), AKACHI);
    expect(mine(r, AKACHI, SHRIVELLING)?.uses).toBe(5);
    r = toTurn(willpowerTest(r, AKACHI, 1), AKACHI);
    expect(tokenMods(r)).toEqual([1]);
    expect(mine(r, AKACHI, SHRIVELLING)?.uses).toBe(6);
  });
});

describe("Spirit-Speaker (03014)", () => {
  it("a charge asset's charges become resources and it is discarded", () => {
    let r = game({
      investigators: [AKACHI],
      prep: (g) => {
        inPlay(g, AKACHI, SHRIVELLING);
        inPlay(g, AKACHI, "03014");
      },
    });
    const res = inv(gOf(r), AKACHI).resources;
    r = pick(r, /^Spirit-Speaker/);
    r = toTurn(pick(r, /^Move its charges/), AKACHI);
    expect(inv(gOf(r), AKACHI).resources).toBe(res + 4);
    expect(mine(r, AKACHI, SHRIVELLING)).toBeUndefined();
  });

  it("or the asset returns to your hand", () => {
    let r = game({
      investigators: [AKACHI],
      prep: (g) => {
        inPlay(g, AKACHI, SHRIVELLING);
        inPlay(g, AKACHI, "03014");
      },
    });
    r = toTurn(pick(pick(r, /^Spirit-Speaker/), /^Return it to your hand/), AKACHI);
    expect(inv(gOf(r), AKACHI).hand.some((h) => codeOf(r, h) === SHRIVELLING)).toBe(true);
  });
});

describe("Angered Spirits (03015)", () => {
  it("in the threat area, fed charges by exhausting a Spell; under 4 at the end: 1 physical trauma", () => {
    let r = game({ investigators: [AKACHI], prep: (g) => void inPlay(g, AKACHI, SHRIVELLING) });
    const rev = reveal(r, AKACHI, "03015");
    r = toTurn(rev.r, AKACHI);
    expect(threatArea(gOf(r), AKACHI).map((c) => c.id)).toContain(rev.id);
    r = toTurn(pick(r, /^Angered Spirits/), AKACHI);
    expect(card(gOf(r), rev.id).uses).toBe(1);
    expect(mine(r, AKACHI, SHRIVELLING)).toMatchObject({ uses: 3, exhausted: true });
    const g = gOf(r);
    fireGameEnd(g, [{ id: rev.id, code: "03015", controller: AKACHI }]);
    expect(inv(g, AKACHI).physicalTrauma).toBe(1);
  });
});

describe("William Yorick", () => {
  it("after he defeats an enemy he may play an asset from his discard pile, once per round", () => {
    let machete = "";
    let r = game({
      investigators: [YORICK],
      prep: (g) => {
        machete = hand(g, YORICK, MACHETE);
        moveCard(g, machete, ZONE.Discard);
        setCounter(g, YORICK, "resources", 5);
        enemyHere(g, YORICK, MINION);
      },
    });
    const ghoul = enemies(gOf(r))[0].id;
    r = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: ghoul, by: YORICK });
    r = until(r, offered(/^William Yorick: play an asset/));
    r = pick(r, /^William Yorick: play an asset/);
    r = toTurn(pick(r, "Machete"), YORICK);
    expect(card(gOf(r), machete).zone).toBe(ZONE.Play);
    expect(inv(gOf(r), YORICK).resources).toBe(2);
  });

  it("his elder sign: +2, and a card from his discard pile back on a success", () => {
    let guts = "";
    let r = game({
      investigators: [YORICK],
      bag: ["elderSign"],
      prep: (g) => {
        guts = hand(g, YORICK, GUTS);
        moveCard(g, guts, ZONE.Discard);
      },
    });
    r = toTurn(willpowerTest(r, YORICK, 1), YORICK);
    expect(tokenMods(r)).toEqual([2]);
    expect(card(gOf(r), guts).zone).toBe(ZONE.Hand);
  });
});

describe("Bury Them Deep (03016)", () => {
  it("after a non-Elite enemy at your location is defeated: it and this card to the victory display", () => {
    let bury = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        enemyHere(g, R, MINION);
        bury = hand(g, R, "03016");
      },
    });
    const ghoul = enemies(gOf(r))[0].id;
    r = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: ghoul, by: R });
    r = until(r, offered(/^Bury Them Deep/));
    r = toTurn(pick(r, /^Bury Them Deep/), R);
    expect(card(gOf(r), ghoul).zone).toBe(ZONE.Victory);
    expect(card(gOf(r), bury).zone).toBe(ZONE.Victory);
  });
});

describe("Graveyard Ghouls (03017)", () => {
  it("preys on William Yorick only; engaged with him, nothing leaves his discard pile", () => {
    let ghouls = "";
    let r = game({
      investigators: [R, YORICK],
      prep: (g) => {
        const guts = hand(g, YORICK, GUTS);
        moveCard(g, guts, ZONE.Discard);
        ghouls = createCard(g, "03017", ZONE.Limbo, YORICK);
      },
    });
    r = inject(r, () => {}, { t: STEP.Spawn, enemy: ghouls, inv: R });
    r = toTurn(r, R);
    expect(card(gOf(r), ghouls).engagedWith).toBe(YORICK);
    const n = inv(gOf(r), YORICK).hand.length;
    r = toTurn(eff(r, YORICK, { op: "takeFromDiscard", filter: {} }), R);
    expect(inv(gOf(r), YORICK).hand.length).toBe(n);
  });
});

describe("Lola Hayes", () => {
  it("chooses a role after her opening hand; only Neutral and role cards; a fast switch once a round", () => {
    let r = skipMulligans(started(LOLA));
    expect(r.state.pending?.prompt).toMatch(/role/i);
    r = pick(r, "rogue");
    r = toTurn(r, LOLA);
    r = inject(r, (g) => {
      hand(g, LOLA, MACHETE);
      hand(g, LOLA, CACHE);
      setCounter(g, LOLA, "resources", 9);
    });
    expect(options(r).some((o) => o.startsWith("Play Machete"))).toBe(false);
    expect(options(r).some((o) => o.startsWith("Play Emergency Cache"))).toBe(true);
    r = pick(pick(r, /^Lola Hayes: switch your role/), "guardian");
    expect(role.get(gOf(r), LOLA)).toBe("guardian");
    expect(options(r).some((o) => o.startsWith("Play Machete"))).toBe(true);
    expect(options(r).some((o) => o.startsWith("Lola Hayes: switch"))).toBe(false);
  });

  it("her elder sign: +2, and she may switch roles", () => {
    let r = game({
      investigators: [LOLA],
      bag: ["elderSign"],
      prep: (g) => role.set(g, LOLA, "rogue"),
    });
    r = willpowerTest(r, LOLA, 1);
    r = until(r, offered("Keep your role"));
    r = toTurn(pick(r, "seeker"), LOLA);
    expect(tokenMods(r)).toEqual([2]);
    expect(role.get(gOf(r), LOLA)).toBe("seeker");
  });
});

describe("Improvisation (03018)", () => {
  it("switches the role; the next card of the new role costs 3 less; draws 1", () => {
    let r = game({
      investigators: [LOLA],
      prep: (g) => {
        role.set(g, LOLA, "rogue");
        hand(g, LOLA, "03018");
        hand(g, LOLA, MACHETE);
        setCounter(g, LOLA, "resources", 0);
      },
    });
    const n = inv(gOf(r), LOLA).hand.length;
    r = toTurn(pick(pick(r, /^Play Improvisation/), "guardian"), LOLA);
    expect(inv(gOf(r), LOLA).hand.length).toBe(n - 1 + 1);
    r = toTurn(pick(r, /^Play Machete/), LOLA);
    expect(mine(r, LOLA, MACHETE)).toBeDefined();
    expect(inv(gOf(r), LOLA).resources).toBe(0);
  });
});

describe("Crisis of Identity (03019)", () => {
  it("discards the role's cards she controls and her deck's top card, whose class is her new role", () => {
    let r = game({
      investigators: [LOLA],
      prep: (g) => {
        role.set(g, LOLA, "guardian");
        inPlay(g, LOLA, MACHETE);
        putOnTop(g, LOLA, [createCard(g, SHRIVELLING, ZONE.Limbo, LOLA)]);
      },
    });
    r = toTurn(reveal(r, LOLA, "03019").r, LOLA);
    expect(mine(r, LOLA, MACHETE)).toBeUndefined();
    expect(role.get(gOf(r), LOLA)).toBe("mystic");
  });
});

describe(".32 Colt (03020)", () => {
  it("spends ammo to fight with +1 damage", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "03020");
        enemyHere(g, R, RAVENOUS);
      },
    });
    r = toTurn(use(r, "03020"), R);
    expect(enemies(gOf(r))[0].damage).toBe(2);
    expect(mine(r, R, "03020")?.uses).toBe(5);
  });
});

describe("True Grit (03021)", () => {
  it("may be assigned damage dealt to another investigator at your location", () => {
    let r = game({ investigators: [R, D], prep: (g) => void inPlay(g, D, "03021") });
    r = damage(r, R, 1, false);
    expect(options(r).some((o) => /to True Grit/.test(o))).toBe(true);
  });
});

describe('"Let me handle this!" (03022)', () => {
  it("you draw another investigator's encounter card instead, +2 to each skill while it resolves", () => {
    let hands = "";
    let r = game({
      investigators: [R, D],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03022");
        hands = createCard(g, "01162", ZONE.Limbo); // Grasping Hands: agility (3)
        moveCard(g, hands, ZONE.EncounterDeck, { top: true });
      },
    });
    r = inject(r, () => {}, { t: STEP.DrawEncounter, inv: D });
    r = until(r, offered(/^"Let me handle this!"/));
    r = toTurn(pick(r, /^"Let me handle this!"/), R);
    // Roland's agility 2 + 2 against 3: no damage, and Daisy untouched
    expect(lastTest(r)).toMatchObject({ total: 4, success: true });
    expect(inv(gOf(r), D).damage).toBe(0);
    expect(skillValue(gOf(r), R, "agility")).toBe(2);
  });
});

describe("Ever Vigilant (03023)", () => {
  it("plays up to 3 assets from hand, one at a time, each for 1 less", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03023");
        hand(g, R, FLASHLIGHT);
        hand(g, R, MACHETE);
        setCounter(g, R, "resources", 4);
      },
    });
    r = pick(r, /^Play Ever Vigilant/);
    r = pick(r, "Flashlight");
    r = until(r, offered("Machete"));
    r = toTurn(pick(r, "Machete"), R);
    expect(mine(r, R, FLASHLIGHT)).toBeDefined();
    expect(mine(r, R, MACHETE)).toBeDefined();
    expect(inv(gOf(r), R).resources).toBe(4 - 1 - 2);
  });
});

describe("Fieldwork (03024)", () => {
  it("after moving to a location with clues: +2 on the next test this phase", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void inPlay(g, R, "03024") });
    r = inject(r, (g) => void hallway(g));
    r = pick(r, /^Move to Hallway|^Move.*Hallway/);
    r = until(r, offered(/^Fieldwork/));
    r = toTurn(pick(r, /^Fieldwork/), R);
    r = toTurn(willpowerTest(r, R, 1), R);
    expect(lastTest(r)?.total).toBe(5);
  });
});

describe("Archaic Glyphs (03025)", () => {
  it("the third secret: discarded, 5 resources, and the glyphs translated in the campaign log", () => {
    let glyphs = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        glyphs = inPlay(g, R, "03025");
        for (let k = 0; k < 3; k++) hand(g, R, "01039"); // Deduction: 1 intellect
      },
    });
    const res = inv(gOf(r), R).resources;
    for (let k = 0; k < 3; k++) r = toTurn(pick(use(r, "03025"), "Deduction"), R);
    expect(card(gOf(r), glyphs).zone).toBe(ZONE.Discard);
    expect(inv(gOf(r), R).resources).toBe(res + 5);
    expect(logEntry.get(gOf(r), ["", "translatedTheGlyphs"])).toBe(true);
  });
});

describe("No Stone Unturned (03026)", () => {
  it("an investigator at your location searches the top 6 of their deck for a card and draws it", () => {
    let r = game({ investigators: [R, D], prep: (g) => void hand(g, R, "03026") });
    const top = inv(gOf(r), D).deck[0];
    const n = inv(gOf(r), D).hand.length;
    r = pick(pick(r, /^Play No Stone Unturned/), "Daisy Walker");
    r = toTurn(pick(r, top), R);
    expect(inv(gOf(r), D).hand).toContain(top);
    expect(inv(gOf(r), D).hand.length).toBe(n + 1);
  });
});

describe("In the Know (03027)", () => {
  it("spends a secret to investigate any revealed location as if there", () => {
    let attic = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "03027");
        hallway(g);
        attic = addLocation(g, ATTIC, [[HALLWAY, ATTIC]]);
        setCounter(g, attic, "clues", 1);
      },
    });
    r = toTurn(pick(use(r, "03027"), "Attic"), R);
    expect(inv(gOf(r), R).clues).toBe(1);
    expect(mine(r, R, "03027")?.uses).toBe(2);
  });
});

describe("Stealth (03028)", () => {
  it("evade with −2 evade: disengaged, not exhausted, can't engage you this turn", () => {
    let r = game({
      investigators: [R],
      bag: ["-2"],
      prep: (g) => {
        inPlay(g, R, "03028");
        enemyHere(g, R, MINION);
      },
    });
    // agility 2 − 2 + 2 against evade 2
    r = toTurn(use(r, "03028"), R);
    expect(lastTest(r)?.success).toBe(true);
    expect(enemies(gOf(r))[0]).toMatchObject({ exhausted: false, engagedWith: null });
    r = toTurn(pick(r, /^Gain 1 resource/), R);
    expect(enemies(gOf(r))[0].engagedWith).toBeNull();
  });
});

describe("Sleight of Hand (03029)", () => {
  it("an Item asset into play from your hand, back to your hand at the end of your turn", () => {
    let machete = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03029");
        machete = hand(g, R, MACHETE);
        setCounter(g, R, "resources", 1);
      },
    });
    r = toTurn(pick(pick(r, /^Play Sleight of Hand/), "Machete"), R);
    expect(card(gOf(r), machete).zone).toBe(ZONE.Play);
    expect(inv(gOf(r), R).resources).toBe(0);
    r = until(pick(r, "End turn"), (x) => card(gOf(x), machete).zone !== ZONE.Play);
    expect(card(gOf(r), machete).zone).toBe(ZONE.Hand);
  });
});

describe("Daring Maneuver (03030)", () => {
  it("when you would succeed: +2 skill value", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void hand(g, R, "03030") });
    r = willpowerTest(r, R, 3);
    r = until(r, offered(/^Daring Maneuver/));
    r = toTurn(pick(r, /^Daring Maneuver/), R);
    expect(lastTest(r)?.total).toBe(5);
  });
});

describe("Lockpicks (03031)", () => {
  const picking = (bag: ChaosToken, supplies: number) => {
    let r = game({
      investigators: [R],
      bag: [bag],
      prep: (g) => setCounter(g, inPlay(g, R, "03031"), "uses", supplies),
    });
    r = toTurn(use(r, "03031"), R);
    return r;
  };
  it("investigates adding your agility; succeeding by 2 keeps the supply", () => {
    // intellect 3 + agility 2 against shroud 2
    const r = picking("0", 3);
    expect(lastTest(r)?.total).toBe(5);
    expect(mine(r, R, "03031")?.uses).toBe(3);
  });
  it("by less, a supply goes; with none it is discarded", () => {
    expect(mine(picking("-2", 3), R, "03031")?.uses).toBe(2);
    expect(mine(picking("-2", 1), R, "03031")).toBeUndefined();
  });
});

describe("Alchemical Transmutation (03032)", () => {
  it("1 resource per point succeeded by, at most 3", () => {
    let r = game({ investigators: [R], bag: ["+1"], prep: (g) => void inPlay(g, R, "03032") });
    const res = inv(gOf(r), R).resources;
    r = toTurn(use(r, "03032"), R);
    expect(inv(gOf(r), R).resources).toBe(res + 3);
    expect(mine(r, R, "03032")?.uses).toBe(2);
  });
  it("a symbol token: 1 damage", () => {
    let r = game({
      investigators: [R],
      bag: ["autoFail"],
      prep: (g) => void inPlay(g, R, "03032"),
    });
    r = toTurn(use(r, "03032"), R);
    expect(inv(gOf(r), R).damage).toBe(1);
  });
});

describe("Uncage the Soul (03033)", () => {
  it("plays a Spell from your hand for 3 less", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03033");
        hand(g, R, SHRIVELLING);
        setCounter(g, R, "resources", 0);
      },
    });
    r = toTurn(pick(r, /^Play Uncage the Soul/), R);
    expect(mine(r, R, SHRIVELLING)).toBeDefined();
    expect(inv(gOf(r), R).resources).toBe(0);
  });
});

describe("Astral Travel (03034)", () => {
  it("moves to any revealed location; a symbol token discards an Item or Ally asset", () => {
    let r = game({
      investigators: [R],
      bag: ["skull"],
      prep: (g) => {
        hand(g, R, "03034");
        inPlay(g, R, FLASHLIGHT);
        hallway(g);
        addLocation(g, ATTIC, [[HALLWAY, ATTIC]]);
        setCounter(g, R, "resources", 3);
      },
    });
    r = toTurn(pick(pick(r, /^Play Astral Travel/), "Attic"), R);
    expect(card(gOf(r), inv(gOf(r), R).location!).code).toBe(ATTIC);
    expect(mine(r, R, FLASHLIGHT)).toBeUndefined();
  });
});

describe("Spirit Athame (03035)", () => {
  it("+2 during a test on a Spell; fights with +2 combat", () => {
    let shrivelling = "";
    let athame = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        athame = inPlay(g, R, "03035");
        shrivelling = inPlay(g, R, SHRIVELLING);
        enemyHere(g, R, RAVENOUS);
      },
    });
    // an attack with Shrivelling: a test on a Spell
    r = eff(r, R, { op: "fight", skill: "willpower" }, { source: shrivelling });
    r = until(r, offered(/^Spirit Athame: \+2/));
    r = toTurn(pick(r, /^Spirit Athame: \+2/), R);
    // Shrivelling: willpower 3 + 2 against fight 3
    expect(lastTest(r)?.total).toBe(5);
    r = toTurn(
      use(
        inject(r, (g) => ready(g, athame)),
        "03035",
        1,
      ),
      R,
    );
    // combat 4 + 2 against fight 3
    expect(lastTest(r)?.total).toBe(4 + 2);
  });
});

describe("Lantern (03036)", () => {
  it("investigates at −1 shroud; discarded, deals 1 damage to an enemy here", () => {
    let r = game({
      investigators: [R],
      bag: ["-1"],
      prep: (g) => {
        inPlay(g, R, "03036");
        setCounter(g, inv(g, R).location!, "clues", 2);
      },
    });
    // intellect 3 − 1 against shroud 2 − 1
    r = toTurn(use(r, "03036"), R);
    expect(lastTest(r)).toMatchObject({ difficulty: 1, success: true });
    r = inject(r, (g) => void enemyHere(g, R, RAVENOUS));
    r = toTurn(use(r, "03036", 1), R);
    expect(enemies(gOf(r))[0].damage).toBe(1);
    expect(mine(r, R, "03036")).toBeUndefined();
  });
});

describe("Gravedigger's Shovel (03037)", () => {
  it("fights with +2 combat; discarded, discovers 1 clue here", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "03037");
        enemyHere(g, R, RAVENOUS);
        setCounter(g, inv(g, R).location!, "clues", 1);
      },
    });
    r = toTurn(use(r, "03037"), R);
    expect(lastTest(r)?.total).toBe(6);
    r = toTurn(use(r, "03037", 1), R);
    expect(inv(gOf(r), R).clues).toBe(1);
    expect(mine(r, R, "03037")).toBeUndefined();
  });
});

describe("Hiding Spot (03038)", () => {
  it("attached to a location: its non-Elite enemies are aloof; a ready enemy there at enemy phase end discards it", () => {
    let spot = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        spot = hand(g, R, "03038");
        enemyHere(g, R, MINION, false);
      },
    });
    r = pick(r, /^Play Hiding Spot/);
    r = toTurn(r, R);
    expect(card(gOf(r), spot).zone).toBe(ZONE.Attached);
    expect(enemies(gOf(r))[0].engagedWith).toBeNull();
    r = toTurn(
      inject(r, () => {}, { t: STEP.Window, trigger: "enemyPhaseEnds", data: {} }),
      R,
    );
    expect(card(gOf(r), spot).zone).toBe(ZONE.Discard);
  });
});

describe("Resourceful (03039)", () => {
  it("on a success, a Survivor card not named Resourceful from your discard pile to your hand", () => {
    let lucky = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        lucky = hand(g, R, "01080");
        moveCard(g, lucky, ZONE.Discard);
        moveCard(g, hand(g, R, "03039"), ZONE.Discard);
        hand(g, R, "03039");
      },
    });
    r = willpowerTest(r, R, 1);
    r = until(r, offered(/^Commit Resourceful/));
    r = pick(r, /^Commit Resourceful/);
    r = toTurn(pick(until(r, offered(/^Done/)), /^Done/), R);
    expect(inv(gOf(r), R).hand).toContain(lucky);
  });
});

describe("The Thing That Follows (03042)", () => {
  it("spawns farthest from its bearer, preys on them only; defeated, it is shuffled into their deck", () => {
    let thing = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        hallway(g);
        thing = createCard(g, "03042", ZONE.Limbo, R);
      },
    });
    r = inject(r, () => {}, { t: STEP.Spawn, enemy: thing, inv: R });
    r = toTurn(r, R);
    expect(card(gOf(r), card(gOf(r), thing).location!).code).toBe(HALLWAY);
    r = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: thing, by: R });
    r = toTurn(r, R);
    expect(card(gOf(r), thing).zone).toBe(ZONE.Deck);
    expect(inv(gOf(r), R).deck).toContain(thing);
  });
});
