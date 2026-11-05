/** A Phantom of Truth (campaign-the-path-to-carcosa, group 6): setup, tokens, map, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { createGame, type Result } from "../index";
import { db, gOf, options, pick, skipMulligans } from "../kits/testkit";
import { fight, game, inject, investigate, lastTest, move, toTurn, until } from "../kits/driver";
import { connections, enemies, enemyStat, findByCode } from "../queries";
import { playCost } from "../rules/cards";
import {
  allCards,
  card,
  currentAct,
  currentAgenda,
  exhaust,
  inv,
  placeInvestigator,
  reveal,
  setCode,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import * as flags from "../world/flags";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign/campaign";
import type { CampaignState } from "../campaign/types";
import { advance } from "../campaign/flow";
import { hasEntry, logCount } from "../campaign/log";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const MONTPARNASSE = "03208";
const MONTMARTRE = ["03209", "03210"];
const GUIGNOL = "03211";
const OPERA = ["03212", "03213"];
const GARE = "03214";
const PERE = "03215";
const CANAL = "03216";
const MARAIS = ["03217", "03218"];
const NOTRE_DAME = "03219";
const GARDENS = "03220";
const ORGANIST = "03221";
const DRAPED = "03221b";
const JORDAN = "03066b";
/** Conviction leads: act 1 and act 2 are version II */
const CONVICTION = { conviction: 3, doubt: 1 };

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const apot = ({
  invs = [R],
  bag = ["0"],
  difficulty = "standard",
  seed = 1,
  log = {},
  prep,
}: Opts = {}) =>
  game({
    scenario: "a-phantom-of-truth",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "the-path-to-carcosa", campaignLog: log, difficulty },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const anyLoc = (game: GameContext, codes: string[]) =>
  codes.map((c) => loc(game, c)).find(Boolean)!;
const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const testOf = (skill: "willpower" | "intellect", difficulty = 0): Step => ({
  t: STEP.Eff,
  effect: { op: "skillTest", skill, difficulty },
  ctx: { you: R, source: null },
});
const mods = (r: Result) =>
  (r.state.log.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;
const inDeck = (game: GameContext, code: string) =>
  allCards(game).filter((c) => c.code === code && c.zone === ZONE.EncounterDeck).length;
/** Roland at a revealed location of this code */
const visit = (game: GameContext, code: string, who = R) => {
  const at = loc(game, code)!;
  reveal(game, at);
  placeInvestigator(game, who, at);
  return at;
};
/** The Organist (of this face) set into play at a location */
function organistAt(game: GameContext, code: string, face = ORGANIST) {
  const o = findByCode(game, ORGANIST, [ZONE.SetAside])!;
  if (face !== ORGANIST) setCode(game, o.id, face);
  moveCard(game, o.id, ZONE.Enemy, { location: loc(game, code)! });
  return o.id;
}
const toEnd = (r: Result) => until(r, () => false, 400);

// ---------- 6.1 setup ----------
describe("setup", () => {
  it("one of each paired location at random, the other out; the seven others in play; everyone at Gare d'Orsay", () => {
    const g = gOf(apot());
    for (const pair of [MONTMARTRE, OPERA, MARAIS]) {
      expect(pair.filter((c) => loc(g, c))).toHaveLength(1);
      expect(pair.filter((c) => findByCode(g, c, [ZONE.Removed]))).toHaveLength(1);
    }
    for (const c of [MONTPARNASSE, GUIGNOL, GARE, PERE, CANAL, NOTRE_DAME, GARDENS])
      expect(loc(g, c)).toBeDefined();
    expect(codeOf(g, inv(g, R).location)).toBe(GARE);
    expect(findByCode(g, ORGANIST, [ZONE.SetAside])).toBeDefined();
    expect(findByCode(g, JORDAN, [ZONE.SetAside])).toBeDefined();
    expect(findByCode(gOf(apot({ log: { [JORDAN]: true } })), JORDAN, [ZONE.SetAside])).toBeFalsy();
  });

  it("as much Doubt as Conviction: act 1 v.I then Pursuing Shadows; Twin Suns and Hunting Shadow out", () => {
    const g = gOf(apot({ log: { conviction: 1, doubt: 1 } }));
    expect(codeOf(g, currentAct(g))).toBe("03204");
    expect(allCards(g).some((c) => c.code === "03206" && c.zone === ZONE.ActDeck)).toBe(true);
    expect(inDeck(g, "03223") + inDeck(g, "01135")).toBe(0);
    expect(inDeck(g, "03090")).toBe(2);
    expect(inDeck(g, "01136")).toBe(2);
  });

  it("more Conviction and Jordan interviewed: act 1 v.II then Stalked by Shadows; Black Stars Rise and False Lead out; Montparnasse with 3 more resources", () => {
    const base = inv(gOf(apot()), R).resources;
    const g = gOf(apot({ log: { ...CONVICTION, "03077": true } }));
    expect(codeOf(g, currentAct(g))).toBe("03205");
    expect(allCards(g).some((c) => c.code === "03207" && c.zone === ZONE.ActDeck)).toBe(true);
    expect(inDeck(g, "03090") + inDeck(g, "01136")).toBe(0);
    expect(inDeck(g, "03223")).toBe(2);
    expect(inDeck(g, "01135")).toBe(3);
    expect(codeOf(g, inv(g, R).location)).toBe(MONTPARNASSE);
    expect(inv(g, R).resources).toBe(base + 3);
  });
});

// ---------- 6.2 tokens ----------
describe("chaos tokens", () => {
  const draw = (bag: ChaosToken[], difficulty: Difficulty, against = 0, prep?: Opts["prep"]) =>
    run(apot({ bag, difficulty, prep }), testOf("willpower", against));
  const doom = (n: number) => (game: GameContext) =>
    setCounter(game, currentAgenda(game)!, "doom", n);

  it("skull −X, the doom in play: at most 5 on Easy and Standard, all of it on Hard", () => {
    expect(mods(draw(["skull"], "standard", 0, doom(2)))).toEqual([-2]);
    expect(mods(draw(["skull"], "easy", 0, doom(7)))).toEqual([-5]);
    expect(mods(draw(["skull"], "hard", 0, doom(7)))).toEqual([-7]);
  });

  it("cultist −2: a failure moves each unengaged Byakhee once toward the nearest investigator; on Hard it always does", () => {
    const byakhee = (game: GameContext) => {
      const b = createCard(game, "03222", ZONE.Enemy);
      moveCard(game, b, ZONE.Enemy, { location: loc(game, MONTPARNASSE)! });
    };
    const where = (r: Result) =>
      codeOf(gOf(r), enemies(gOf(r)).find((e) => e.code === "03222")!.location);
    expect(where(draw(["cultist"], "standard", 0, byakhee))).toBe(MONTPARNASSE);
    expect(where(draw(["cultist"], "standard", 10, byakhee))).not.toBe(MONTPARNASSE);
    expect(where(draw(["cultist"], "hard", 0, byakhee))).not.toBe(MONTPARNASSE);
    expect(mods(draw(["cultist"], "standard", 0))).toEqual([-2]);
  });

  it("tablet −3 (Hard −4) cancels the committed skill cards", () => {
    expect(mods(draw(["tablet"], "standard"))).toEqual([-3]);
    expect(mods(draw(["tablet"], "hard"))).toEqual([-4]);
  });

  it("elder thing −2 (Hard −3): a failure loses 1 resource per point failed", () => {
    const before = inv(gOf(apot()), R).resources;
    const r = draw(["elderThing"], "standard", 3);
    expect(mods(r)).toEqual([-2]);
    // willpower 3 − 2 = 1 against 3: failed by 2
    expect(inv(gOf(r), R).resources).toBe(before - 2);
  });
});

// ---------- 6.5 connections ----------
describe("connections", () => {
  it("the guide's map: fifteen two-way links, matched to the cards by their symbols", () => {
    const g = gOf(apot());
    const links = (code: string | string[]) =>
      connections(g, Array.isArray(code) ? anyLoc(g, code) : loc(g, code)!)
        .map((l) => codeOf(g, l)!)
        .map((c) => ([MONTMARTRE, OPERA, MARAIS].find((p) => p.includes(c)) ?? [c])[0])
        .sort();
    expect(links(GUIGNOL)).toEqual(["03209", "03212"]);
    expect(links(MONTMARTRE)).toEqual(["03211", "03212", "03216", "03217"]);
    expect(links(OPERA)).toEqual(["03209", "03211", GARE]);
    expect(links(CANAL)).toEqual(["03209", PERE, "03217"]);
    expect(links(PERE)).toEqual([CANAL, "03217"]);
    expect(links(MARAIS)).toEqual(["03209", PERE, CANAL, NOTRE_DAME].sort());
    expect(links(GARE)).toEqual([MONTPARNASSE, "03212", GARDENS].sort());
    expect(links(GARDENS)).toEqual([MONTPARNASSE, GARE, NOTRE_DAME].sort());
    expect(links(NOTRE_DAME)).toEqual([MONTPARNASSE, "03217", GARDENS].sort());
    expect(links(MONTPARNASSE)).toEqual([GARE, NOTRE_DAME, GARDENS].sort());
  });

  it("Gardens of Luxembourg: while a Byakhee moves and an investigator is there, its location connects to the Gardens", () => {
    const g = gOf(apot({ prep: (x) => void visit(x, GARDENS) }));
    const b = createCard(g, "03222", ZONE.Enemy);
    moveCard(g, b, ZONE.Enemy, { location: loc(g, PERE)! });
    expect(connections(g, loc(g, PERE)!, b)).toContain(loc(g, GARDENS));
    expect(connections(g, loc(g, PERE)!, true)).not.toContain(loc(g, GARDENS));
    expect(connections(g, loc(g, PERE)!)).not.toContain(loc(g, GARDENS));
  });
});

// ---------- 6.3 the agendas and acts ----------
describe("the agendas", () => {
  const atThreshold = (log: Record<string, unknown>) =>
    run(
      apot({
        log,
        prep: (g) => {
          setCounter(g, currentAgenda(g)!, "doom", 6);
          setCounter(g, loc(g, GARE)!, "doom", 1);
        },
      }),
      { t: STEP.CheckDoom },
    );

  it("while Conviction leads, the doom on other cards counts against the agenda's", () => {
    expect(codeOf(gOf(atThreshold(CONVICTION)), currentAgenda(gOf(atThreshold(CONVICTION))))).toBe(
      "03201",
    );
    expect(codeOf(gOf(atThreshold({})), currentAgenda(gOf(atThreshold({}))))).toBe("03202");
  });

  it("1b: each investigator disengages and may move; The Organist moves 1 location away from the nearest investigator", () => {
    let r = apot({
      invs: [R],
      prep: (g) => {
        organistAt(g, GARDENS, DRAPED);
        setCounter(g, currentAgenda(g)!, "doom", 6);
      },
    });
    r = inject(r, () => {}, { t: STEP.CheckDoom });
    r = until(r, (x) => /connecting location/.test(x.state.pending?.prompt ?? ""));
    r = toTurn(pick(r, "Stay"), R);
    const g = gOf(r);
    expect(codeOf(g, currentAgenda(g))).toBe("03202");
    // from the Gardens, away from Gare d'Orsay: Montparnasse or Notre-Dame
    const o = enemies(g).find((e) => e.code === DRAPED)!;
    expect([MONTPARNASSE, NOTRE_DAME]).toContain(codeOf(g, o.location));
  });

  it("2b: Jordan Perry spawns in Montparnasse unless slain", () => {
    const r = run(
      apot({
        prep: (g) => {
          moveCard(g, currentAgenda(g)!, ZONE.Removed);
          moveCard(g, findByCode(g, "03202", [ZONE.AgendaDeck])!.id, ZONE.Agenda, { deck: "a" });
          setCounter(g, currentAgenda(g)!, "doom", 5);
        },
      }),
      { t: STEP.CheckDoom },
    );
    const g = gOf(r);
    expect(codeOf(g, enemies(g).find((e) => e.code === JORDAN)?.location)).toBe(MONTPARNASSE);
  });

  it("3b: R3 with as much Doubt as Conviction; with more Conviction R1, or R2 if you intruded on a secret meeting", () => {
    const night3 = (log: Record<string, unknown>) =>
      toEnd(
        inject(
          apot({
            log,
            prep: (g) => {
              moveCard(g, currentAgenda(g)!, ZONE.Removed);
              moveCard(g, findByCode(g, "03203", [ZONE.AgendaDeck])!.id, ZONE.Agenda, {
                deck: "a",
              });
              setCounter(g, currentAgenda(g)!, "doom", 5);
            },
          }),
          () => {},
          { t: STEP.CheckDoom },
        ),
      ).state.resolution;
    expect(night3({})).toBe("R3");
    expect(night3(CONVICTION)).toBe("R1");
    expect(night3({ ...CONVICTION, intrudedOnSecretMeeting: true })).toBe("R2");
  });
});

describe("the acts", () => {
  it("1 v.I by clues: The Organist spawns Draped in Mystery at the lead's location", () => {
    const r = run(apot(), { t: STEP.AdvanceAct });
    const g = gOf(r);
    const o = enemies(g).find((e) => e.code === DRAPED)!;
    expect(o.location).toBe(inv(g, R).location);
    expect(codeOf(g, currentAct(g))).toBe("03206");
  });

  it("1 v.I at the end of a round with 3 doom: 2 horror each, The Organist at the location farthest from everyone", () => {
    let r = apot({ prep: (g) => setCounter(g, currentAgenda(g)!, "doom", 3) });
    r = toTurn(pick(r, "End turn"), R);
    const g = gOf(r);
    expect(inv(g, R).horror).toBe(2);
    const o = enemies(g).find((e) => e.code === DRAPED)!;
    // from Gare d'Orsay, Père Lachaise is the farthest (4 away)
    expect(codeOf(g, o.location)).toBe(PERE);
  });

  it("1 v.II by clues: The Organist spawns Hopeless, I Defied Him at the farthest location", () => {
    const g = gOf(run(apot({ log: CONVICTION }), { t: STEP.AdvanceAct }));
    const o = enemies(g).find((e) => e.code === ORGANIST)!;
    expect(codeOf(g, o.location)).toBe(PERE);
    expect(codeOf(g, currentAct(g))).toBe("03207");
  });

  it("2 v.I: after attacking The Organist an investigator there may place 1 clue on him; 3 per investigator advance: R1, or R2 if you intruded", () => {
    const pursue = (log: Record<string, unknown>) => {
      let r = apot({
        log,
        bag: ["+1"],
        prep: (g) => {
          moveCard(g, currentAct(g)!, ZONE.Removed);
          moveCard(g, findByCode(g, "03206", [ZONE.ActDeck])!.id, ZONE.Act, { deck: "a" });
          const o = organistAt(g, GARE);
          setCounter(g, o, "clues", 2);
          setCounter(g, R, "clues", 1);
        },
      });
      const o = enemies(gOf(r)).find((e) => e.code === ORGANIST)!.id;
      r = fight(r, ORGANIST);
      r = until(r, (x) => options(x).some((l) => /Pursuing Shadows/.test(l)));
      r = pick(r, /Pursuing Shadows/);
      r = toEnd(r);
      expect(card(gOf(r), o).clues).toBe(3);
      return r.state.resolution;
    };
    expect(pursue({})).toBe("R1");
    expect(pursue({ intrudedOnSecretMeeting: true })).toBe("R2");
  });

  it("2 v.II: once per round, 1 clue per investigator places 1 doom on the agenda or evades The Organist", () => {
    let r = apot({
      log: CONVICTION,
      prep: (g) => {
        moveCard(g, currentAct(g)!, ZONE.Removed);
        moveCard(g, findByCode(g, "03207", [ZONE.ActDeck])!.id, ZONE.Act, { deck: "a" });
        setCounter(g, R, "clues", 2);
      },
    });
    // The Organist isn't in play: only the doom
    r = toTurn(pick(r, /Stalked by Shadows/), R);
    const g = gOf(r);
    expect(card(g, currentAgenda(g)!).doom).toBe(1);
    expect(inv(g, R).clues).toBe(1);
    expect(options(r).some((l) => /Stalked by Shadows/.test(l))).toBe(false);
  });
});

// ---------- 6.4 cards ----------
describe("cards", () => {
  it("03221 The Organist: can't be damaged", () => {
    const g = gOf(apot({ prep: (x) => void organistAt(x, GARE) }));
    const o = enemies(g).find((e) => e.code === ORGANIST)!;
    const r = run(apot({ prep: (x) => void organistAt(x, GARE) }), {
      t: STEP.DamageEnemy,
      enemy: o.id,
      amount: 3,
      by: R,
      attack: true,
      source: null,
    } as Step);
    expect(card(gOf(r), o.id).damage).toBe(0);
  });

  it("03222 Stealthy Byakhee: −3 fight while exhausted", () => {
    const g = gOf(apot());
    const b = createCard(g, "03222", ZONE.Enemy);
    moveCard(g, b, ZONE.Enemy, { location: loc(g, PERE)! });
    expect(enemyStat(g, b, "fight")).toBe(5);
    exhaust(g, b);
    expect(enemyStat(g, b, "fight")).toBe(2);
  });

  it("03219 Notre-Dame: enemies there get −1 fight and +1 evade", () => {
    const g = gOf(apot());
    const b = createCard(g, "03222", ZONE.Enemy);
    moveCard(g, b, ZONE.Enemy, { location: loc(g, NOTRE_DAME)! });
    reveal(g, loc(g, NOTRE_DAME)!);
    expect(enemyStat(g, b, "fight")).toBe(4);
    expect(enemyStat(g, b, "evade")).toBe(4);
  });

  it("03214 Gare d'Orsay: spend 1 resource to move to any Rail location", () => {
    let r = apot({ prep: (g) => void visit(g, GARE) });
    const before = inv(gOf(r), R).resources;
    r = pick(r, /spend 1 resource to move/);
    r = pick(r, /Notre-Dame/);
    r = toTurn(r, R);
    expect(codeOf(gOf(r), inv(gOf(r), R).location)).toBe(NOTRE_DAME);
    expect(inv(gOf(r), R).resources).toBe(before - 1);
  });

  it("03227 Lost Soul: with Conviction leading, willpower against your intellect; a failure takes 2 damage", () => {
    let r = apot({
      log: CONVICTION,
      bag: ["-2"],
      prep: (g) => void createCard(g, "03227", ZONE.Limbo),
    });
    const id = allCards(gOf(r)).find((c) => c.code === "03227")!.id;
    r = run(r, { t: STEP.Revelation, inv: R, card: id });
    const t = lastTest(r)!;
    expect(t.skill).toBe("willpower");
    expect(t.difficulty).toBe(3);
    expect(inv(gOf(r), R).damage).toBe(2);
  });

  /** an encounter card of this code revealed to Roland */
  const reveals = (code: string, o: Opts = {}) => {
    let r = apot({ ...o, prep: (g) => (o.prep?.(g), void createCard(g, code, ZONE.Limbo)) });
    const id = allCards(gOf(r)).find((c) => c.code === code)!.id;
    r = inject(r, () => {}, { t: STEP.Revelation, inv: R, card: id });
    return { r, id };
  };

  it("03223 Twin Suns: a failure removes 1 doom from the agenda, or takes 1 horror per point failed", () => {
    let { r } = reveals("03223", {
      bag: ["-2"],
      prep: (g) => setCounter(g, currentAgenda(g)!, "doom", 2),
    });
    r = until(r, (x) => /Remove 1 doom/.test(options(x).join("|")));
    r = toTurn(pick(r, /Remove 1 doom/), R);
    expect(card(gOf(r), currentAgenda(gOf(r))!).doom).toBe(1);
    // intellect 3 − 2 against 4: failed by 3; no doom to remove
    const horror = toTurn(reveals("03223", { bag: ["-2"] }).r, R);
    expect(inv(gOf(horror), R).horror).toBe(3);
  });

  it("03224 Deadly Fate: a failure discards to the first enemy, which you draw or which attacks you", () => {
    let { r } = reveals("03224", {
      bag: ["-5"],
      prep: (g) => {
        const e = createCard(g, "03222", ZONE.EncounterDeck);
        g.s.world.piles.encounterDeck = [
          e,
          ...(g.s.world.piles.encounterDeck ?? []).filter((x) => x !== e),
        ];
      },
    });
    r = until(r, (x) => /attacks you/.test(options(x).join("|")));
    r = toTurn(pick(r, /attacks you/), R);
    expect(inv(gOf(r), R).damage).toBe(2);
  });

  it("03225 Torturous Chords: in your threat area with a resource per point failed; each card played costs 1 more", () => {
    const { r, id } = reveals("03225", { bag: ["-1"] });
    const g = gOf(toTurn(r, R));
    // willpower 3 − 1 against 5: failed by 3
    expect(card(g, id).zone).toBe(ZONE.Threat);
    expect(card(g, id).resources).toBe(3);
    const asset = inv(g, R).hand.find((h) => typeof db.cards[card(g, h).code].cost === "number")!;
    expect(playCost(g, R, asset)).toBe((db.cards[card(g, asset).code].cost as number) + 1);
  });

  it("03226 Frozen in Fear: the core card's", () => {
    const g = gOf(toTurn(reveals("03226").r, R));
    expect(allCards(g).find((c) => c.code === "03226")!.zone).toBe(ZONE.Threat);
  });

  it("03087 Hunted by Byakhee: a failure reveals that many encounter cards; a Byakhee among them is drawn", () => {
    const { r } = reveals("03087", {
      bag: ["-5"],
      prep: (g) => {
        const e = createCard(g, "03222", ZONE.EncounterDeck);
        g.s.world.piles.encounterDeck = [
          e,
          ...(g.s.world.piles.encounterDeck ?? []).filter((x) => x !== e),
        ];
      },
    });
    const g = gOf(toTurn(r, R));
    expect(enemies(g).some((e) => e.code === "03222")).toBe(true);
  });

  it("03208 Montparnasse: discard a card to gain a resource per [willpower] icon, once per round", () => {
    let r = apot({ prep: (g) => void visit(g, MONTPARNASSE) });
    const before = inv(gOf(r), R).resources;
    r = pick(r, /Montparnasse: discard/);
    const hand = inv(gOf(r), R).hand;
    const icons = (db.cards[card(gOf(r), hand[0]).code].icons?.willpower ?? 0) as number;
    r = toTurn(pick(r, hand[0]), R);
    expect(inv(gOf(r), R).resources).toBe(before + icons);
    expect(options(r).some((l) => /Montparnasse: discard/.test(l))).toBe(false);
  });

  it("03213 Opéra Garnier: investigating it doubles your skill's base value", () => {
    const r = apot({
      bag: ["0"],
      prep: (g) => {
        for (const c of allCards(g).filter((x) => x.code === "03212" && x.zone === ZONE.Location))
          moveCard(g, c.id, ZONE.Removed);
        const v2 = allCards(g).find((x) => x.code === "03213")!;
        moveCard(g, v2.id, ZONE.Location);
        reveal(g, v2.id);
        placeInvestigator(g, R, v2.id);
      },
    });
    const t = lastTest(toTurn(investigate(r), R))!;
    expect(t.total).toBe(6);
  });

  it("03215 Père Lachaise: after a successful investigation you can't leave this round", () => {
    const r = toTurn(investigate(apot({ bag: ["+1"], prep: (g) => void visit(g, PERE) })), R);
    expect(options(r).some((l) => l.startsWith("Move to"))).toBe(false);
  });

  it("03218 Le Marais: after you enter it you can't leave this round", () => {
    const r = apot({
      prep: (g) => {
        for (const c of allCards(g).filter((x) => x.code === "03217" && x.zone === ZONE.Location))
          moveCard(g, c.id, ZONE.Removed);
        const v2 = allCards(g).find((x) => x.code === "03218")!;
        moveCard(g, v2.id, ZONE.Location);
        reveal(g, v2.id);
        placeInvestigator(g, R, loc(g, CANAL)!);
        reveal(g, loc(g, CANAL)!);
      },
    });
    const after = toTurn(move(r, "03218"), R);
    expect(options(after).some((l) => l.startsWith("Move to"))).toBe(false);
  });

  it("03221b The Organist (Draped in Mystery): at the end of the enemy phase he moves away; engaged, he disengages", () => {
    let r = apot({ prep: (g) => void organistAt(g, GARE, DRAPED) });
    r = toTurn(pick(r, "End turn"), R);
    const g = gOf(r);
    const o = enemies(g).find((e) => e.code === DRAPED)!;
    expect(o.location).not.toBe(loc(g, GARE));
  });

  it("03086 Swift Byakhee: it hunts until it enters its prey's location, and then doesn't attack", () => {
    let r = apot({
      prep: (g) => {
        const b = createCard(g, "03086", ZONE.Enemy);
        moveCard(g, b, ZONE.Enemy, { location: loc(g, PERE)! });
      },
    });
    r = toTurn(pick(r, "End turn"), R);
    const g = gOf(r);
    const b = enemies(g).find((e) => e.code === "03086")!;
    expect(b.location).toBe(inv(g, R).location);
    expect(inv(g, R).damage).toBe(0);
  });
});

// ---------- 6.6 the end and the campaign ----------
describe("the end of the game", () => {
  it("records Jordan Perry in the victory display as slain", () => {
    const r = toEnd(
      inject(
        apot({
          prep: (g) => moveCard(g, findByCode(g, JORDAN, [ZONE.SetAside])!.id, ZONE.Victory),
        }),
        () => {},
        { t: STEP.Resolution, id: "R3" },
      ),
    );
    expect(r.state.flags[`log:vipsSlain:${JORDAN}`]).toBe(true);
  });
});

describe("the campaign", () => {
  function walk(c: CampaignState): CampaignState {
    for (let k = 0; k < 120 && c.flow.waiting; k++) {
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
  /** at A Phantom of Truth: Curtain Call R1, The Last King R1, Interlude I, Echoes R1, The Unspeakable Oath R3 */
  const atPhantom = () => {
    let c = walk(
      startCampaign(db, {
        campaignId: "the-path-to-carcosa",
        difficulty: "standard",
        seed: 2,
        investigators: [{ code: R, deckId: "roland-starter" }],
      }),
    );
    for (const res of ["R1", "R1", "R1", "R3"]) c = walk(finish(c, res));
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "a-phantom-of-truth" });
    return c;
  };

  it("the dreams before it: each investigator earns Lost Soul, and the dream marks Conviction or Doubt", () => {
    const c = atPhantom();
    expect(c.investigators[0].deck).toContain("03227");
    expect(
      logCount(c.log, "conviction", "conviction") + logCount(c.log, "doubt", "doubt"),
    ).toBeGreaterThan(0);
  });

  it("no prompt for Jordan Perry; all the cultist, tablet and elder thing tokens go before 2 are added", () => {
    const c0 = atPhantom();
    const c = walk(finish(c0, "R1", (g) => flags.logEntry.set(g, ["vipsSlain", JORDAN], true)));
    expect(hasEntry(c.log, "foundNigelsHome", "campaign_notes")).toBe(true);
    expect(hasEntry(c.log, JORDAN, "vipsSlain")).toBe(true);
    expect(JSON.stringify(c.flow)).not.toMatch(/prompt_jordan_perry/);
    expect(c.chaosBag.filter((t) => t === "cultist")).toHaveLength(2);
    expect(c.chaosBag.filter((t) => t === "tablet")).toHaveLength(0);
    expect(c.chaosBag.filter((t) => t === "elderThing")).toHaveLength(0);
    expect(c.flow.waiting?.step).toEqual({ kind: "play", scenario: "the-pallid-mask" });
  });
});
