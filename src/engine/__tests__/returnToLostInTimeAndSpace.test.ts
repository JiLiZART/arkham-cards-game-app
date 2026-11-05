/** Return to Lost in Time and Space (campaign-return-to-the-dunwich-legacy, group 9): setup card 51053 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Effect } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, pick } from "../kits/testkit";
import {
  game,
  inject,
  lastTest,
  linkCodes,
  move,
  offered,
  rigBag,
  toTurn,
  until,
} from "../kits/driver";
import {
  addTempMod,
  cardsIn,
  connections,
  enemies,
  enemyStat,
  findByCode,
  locations,
} from "../queries";
import {
  card,
  currentAct,
  currentAgenda,
  inv,
  pile,
  placeInvestigator,
  reveal,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import * as flags from "../world/flags";
import type { InstId, Step } from "../world/types";
import { canEnemyEnter } from "../rules/enemies";

beforeAll(async () => {
  await loadPack("dwl");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const AD = "02320";
const EDGE = "02321";
const TTT = "02322";
const YOG = "02323";
const TEAR = "02324";
const REALMS = "51057";
const SETH = "51056";
const STAIRS = "51058";
const LUMINOSITY = "51059";
const VORTEX = "51060";

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const rtlitas = ({ invs = [R], bag = ["0"], seed = 1, log = {}, prep }: Opts = {}) =>
  game({
    scenario: "return-to-lost-in-time-and-space",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-dunwich-legacy", campaignLog: log },
  });

const loc = (game: GameContext, code: string): InstId | undefined =>
  findByCode(game, code, [ZONE.Location])?.id;
/** a location of this code put into play revealed with its clues */
function place(game: GameContext, code: string): InstId {
  const c = cardsIn(game, ZONE.EncounterDeck).find((x) => x.code === code);
  const id =
    c?.id ?? findByCode(game, code, [ZONE.SetAside])?.id ?? createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  reveal(game, id);
  setCounter(game, id, "clues", game.db.cards[code].clues ?? 0);
  return id;
}
const yogOf = (game: GameContext) => enemies(game).find((e) => e.code === YOG);
const codeAt = (r: Result, who = R) => card(gOf(r), inv(gOf(r), who).location!).code;
const actCode = (r: Result) => card(gOf(r), currentAct(gOf(r))!).code;
const agendaCode = (r: Result) => card(gOf(r), currentAgenda(gOf(r))!).code;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** make this act (or agenda) the current one: the cards before it in its deck gone */
function toCard(game: GameContext, code: string) {
  const isAct = game.db.cards[code].type === "act";
  const deck = isAct ? ZONE.ActDeck : ZONE.AgendaDeck;
  moveCard(game, isAct ? currentAct(game)! : currentAgenda(game)!, ZONE.Removed);
  for (const id of pile(game, deck).slice()) {
    if (card(game, id).code === code) {
      moveCard(game, id, isAct ? ZONE.Act : ZONE.Agenda, { deck: "a" });
      return;
    }
    moveCard(game, id, ZONE.Removed);
  }
}
function drawNew(r: Result, code: string, who = R): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = cardsIn(g, ZONE.EncounterDeck).find((x) => x.code === code)?.id ?? "";
    if (!id) id = createCard(g, code, ZONE.Limbo);
    else moveCard(g, id, ZONE.Limbo);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}

describe("setup", () => {
  it("Another Dimension and Realms Beyond in play, Yog-Sothoth spawned in the Realms; everyone in Another Dimension", () => {
    const g = gOf(rtlitas({ invs: [R, D] }));
    expect(
      locations(g)
        .map((l) => l.code)
        .sort(),
    ).toEqual([AD, REALMS].sort());
    expect(card(g, yogOf(g)!.location!).code).toBe(REALMS);
    for (const i of [R, D]) expect(card(g, inv(g, i).location!).code).toBe(AD);
    for (const code of [EDGE, TTT, SETH])
      expect(findByCode(g, code, [ZONE.SetAside])).toBeDefined();
  });

  it("the single-sided locations of both sets in the encounter deck; no act or agenda there", () => {
    const g = gOf(rtlitas());
    const deck = cardsIn(g, ZONE.EncounterDeck).map((c) => c.code);
    for (const code of [TEAR, STAIRS, LUMINOSITY, VORTEX]) expect(deck).toContain(code);
    expect(deck.filter((c) => ["act", "agenda"].includes(g.db.cards[c].type))).toEqual([]);
  });

  it("agendas 02312, 02313, 51054, 02315; act 2 is v. II only if the ritual was completed", () => {
    const g = gOf(rtlitas());
    expect([
      card(g, currentAgenda(g)!).code,
      ...pile(g, ZONE.AgendaDeck).map((id) => card(g, id).code),
    ]).toEqual(["02312", "02313", "51054", "02315"]);
    const acts = (log: Record<string, unknown>) => {
      const x = gOf(rtlitas({ log }));
      return [card(x, currentAct(x)!).code, ...pile(x, ZONE.ActDeck).map((id) => card(x, id).code)];
    };
    expect(acts({ ritualCompleted: true })).toEqual(["02316", "51055", "02318", "02319"]);
    expect(acts({})).toEqual(["02316", "02317", "02318", "02319"]);
  });

  it("Realms Beyond links only to Another Dimension", () => {
    const g = gOf(rtlitas());
    expect(connections(g, loc(g, REALMS)!)).toEqual([loc(g, AD)]);
  });
});

describe("Realms Beyond", () => {
  it("Yog-Sothoth there cannot take damage nor move", () => {
    const r = rtlitas();
    const g = gOf(r);
    const yog = yogOf(g)!;
    expect(canEnemyEnter(g, yog.id, loc(g, AD)!)).toBe(false);
    const hit = run(r, {
      t: STEP.DamageEnemy,
      enemy: yog.id,
      amount: 3,
      by: R,
      source: null,
    } as Step);
    expect(card(gOf(hit), yog.id).damage).toBe(0);
  });

  it("Yog-Sothoth there is immune to player card effects; an attack on it is still made, and other cards still reach it", () => {
    const r = rtlitas({ prep: (g) => placeInvestigator(g, R, loc(g, REALMS)!) });
    const yog = yogOf(gOf(r))!.id;
    let gun = "";
    const withGun = mutate(r, (g) => {
      gun = createCard(g, "01016", ZONE.Limbo); // .45 Automatic, a player card
    });
    const eff = (source: InstId, effect: Effect, enemy?: InstId) =>
      run(withGun, { t: STEP.Eff, effect, ctx: { you: R, source, enemy } } as Step);
    // not a target of a player card's effect, nor affected as the event's enemy
    expect(card(gOf(eff(gun, { op: "placeDoom", amount: 1, on: "nearestEnemy" })), yog).doom).toBe(
      0,
    );
    expect(
      cardsIn(gOf(eff(gun, { op: "defeatEnemy" }, yog)), ZONE.Enemy).map((c) => c.id),
    ).toContain(yog);
    // the attack is a game action: the test against it begins
    const fight = inject(withGun, () => {}, {
      t: STEP.Eff,
      effect: { op: "fight", target: "chooseAtLocation" },
      ctx: { you: R, source: gun },
    } as Step);
    expect(gOf(fight).s.skillTest?.target).toBe(yog);
    // nor modified by one (Expose Weakness's -fight): an encounter card's modifier still applies
    const agenda = currentAgenda(gOf(r))!;
    const fightOf = (source: InstId) =>
      enemyStat(
        gOf(
          mutate(withGun, (g) => addTempMod(g, { stat: "fight", value: -2 }, yog, "round", source)),
        ),
        yog,
        "fight",
      );
    expect(fightOf(gun)).toBe(enemyStat(gOf(r), yog, "fight"));
    expect(fightOf(agenda)).toBe(enemyStat(gOf(r), yog, "fight") - 2);
    // an encounter card's effect still reaches it
    expect(
      card(gOf(eff(agenda, { op: "placeDoom", amount: 1, on: "nearestEnemy" })), yog).doom,
    ).toBe(1);
  });

  it("leaving it costs a willpower or agility (3) test: failing cancels the move", () => {
    const leave = (bag: ChaosToken[]) => {
      const r = rtlitas({ bag, prep: (g) => placeInvestigator(g, R, loc(g, REALMS)!) });
      const asked = until(move(r, AD), offered(/Test agility \(3\)/));
      return toTurn(pick(asked, /Test willpower \(3\)/), R);
    };
    const failed = leave(["-5"]);
    expect(lastTest(failed)).toMatchObject({ skill: "willpower", difficulty: 3, success: false });
    expect(codeAt(failed)).toBe(REALMS);
    expect(codeAt(leave(["+1"]))).toBe(AD);
  });

  it("a location leaving play sends its investigators and enemies to Realms Beyond instead of Another Dimension", () => {
    let tear = "";
    let enemy = "";
    let r = rtlitas({
      invs: [R, D],
      prep: (g) => {
        tear = place(g, TEAR);
        placeInvestigator(g, R, tear);
        enemy = createCard(g, "01160", ZONE.Limbo); // Ghoul Minion
        moveCard(g, enemy, ZONE.Enemy, { location: tear });
      },
    });
    r = toTurn(inject(r, () => {}, { t: STEP.RemoveLocation, location: tear } as Step));
    const g = gOf(r);
    expect(card(g, tear).zone).toBe(ZONE.EncounterDiscard);
    expect(codeAt(r)).toBe(REALMS);
    expect(card(g, enemy).location).toBe(loc(g, REALMS));
    expect(inv(g, R).horror).toBe(1); // moved by an encounter card effect
  });
});

describe("acts and agendas", () => {
  it("Breaking Through (v. II)'s back: Yog-Sothoth to the Edge, Realms Beyond out of the game (its investigators to Another Dimension), agenda 4", () => {
    const r = rtlitas({
      prep: (g) => {
        toCard(g, "51054");
        place(g, EDGE);
        placeInvestigator(g, R, loc(g, REALMS)!);
      },
    });
    const after = run(r, { t: STEP.AdvanceAgenda } as Step);
    const g = gOf(after);
    expect(agendaCode(after)).toBe("02315");
    expect(card(g, yogOf(g)!.location!).code).toBe(EDGE);
    expect(loc(g, REALMS)).toBeUndefined();
    expect(findByCode(g, REALMS, [ZONE.Removed])).toBeDefined();
    expect(codeAt(after)).toBe(AD);
  });

  it("Breaking Through (v. II): moved by an encounter card, 1 horror", () => {
    const r = rtlitas({ prep: (g) => toCard(g, "51054") });
    const moved = run(r, {
      t: STEP.Script,
      code: "lost-in-time-and-space",
      fn: "litasFindLocation",
      ctx: { you: R, source: null },
    } as Step);
    expect(inv(gOf(moved), R).horror).toBe(1);
  });

  it("Into the Beyond (v. II): entering the Edge advances; its back spawns Seth Bishop at the Edge", () => {
    const r = rtlitas({
      log: { ritualCompleted: true },
      prep: (g) => {
        toCard(g, "51055");
        place(g, EDGE);
        placeInvestigator(g, R, place(g, STAIRS));
        // a test map: the Stairs next to the Edge
        linkCodes(g, STAIRS, EDGE);
        setCounter(g, R, "clues", 3);
      },
    });
    const entered = until(move(r, EDGE), (x) => x.state.pending?.kind === "turn");
    expect(actCode(entered)).toBe("02318");
    const g = gOf(entered);
    const seth = enemies(g).find((e) => e.code === SETH)!;
    expect(card(g, seth.location!).code).toBe(EDGE);
  });

  it("Seth Bishop is devoured when Yog-Sothoth shares his location: out of the game, 6 damage healed from Yog-Sothoth", () => {
    const r = rtlitas({
      prep: (g) => {
        const edge = place(g, EDGE);
        const seth = findByCode(g, SETH, [ZONE.SetAside])!.id;
        moveCard(g, seth, ZONE.Enemy, { location: edge });
        const yog = yogOf(g)!.id;
        moveCard(g, yog, ZONE.Enemy, { location: edge });
        setCounter(g, yog, "damage", 8);
      },
    });
    const after = run(r, { t: STEP.CheckObjectives } as Step);
    const g = gOf(after);
    expect(findByCode(g, SETH, [ZONE.Removed])).toBeDefined();
    expect(card(g, yogOf(g)!.id).damage).toBe(2);
  });
});

describe("Seth Bishop's attack in the enemy phase", () => {
  const attacked = (choice: RegExp) => {
    let seth = "";
    const r = rtlitas({
      prep: (g) => {
        seth = findByCode(g, SETH, [ZONE.SetAside])!.id;
        moveCard(g, seth, ZONE.Enemy, { location: inv(g, R).location! });
        g.s.phase = "enemy";
      },
    });
    const asked = until(
      inject(r, () => {}, {
        t: STEP.EnemyAttack,
        enemy: seth,
        inv: R,
        aoo: false,
        key: "k1",
      } as Step),
      offered(choice),
    );
    return until(pick(asked, choice), (x) => !x.state.pending || x.state.pending.kind === "turn");
  };

  it("moved to Another Dimension after the attack: Realms Beyond takes you", () => {
    const out = attacked(/Move to Another Dimension/);
    expect(codeAt(out)).toBe(REALMS);
  });

  it("or +2 damage for the attack", () => {
    const out = attacked(/\+2 damage/);
    expect(codeAt(out)).toBe(AD);
    const e = out.state.log.findLast((x) => x.type === "attack")!;
    expect(e.data).toMatchObject({ damage: 3, horror: 1 });
  });
});

describe("the new locations", () => {
  it("Indecipherable Stairs: into play, the top 3 cards of your deck discarded; leaving it, 2 horror or discard it", () => {
    let r = rtlitas();
    const before = inv(gOf(r), R).discard.length;
    r = toTurn(drawNew(r, STAIRS), R);
    expect(loc(gOf(r), STAIRS)).toBeDefined();
    expect(inv(gOf(r), R).discard.length).toBe(before + 3);
    r = mutate(r, (g) => placeInvestigator(g, R, loc(g, STAIRS)!));
    const asked = until(move(r, AD), offered(/Take 2 horror/));
    expect(inv(gOf(toTurn(pick(asked, /Take 2 horror/), R)), R).horror).toBe(2);
    expect(
      loc(gOf(toTurn(pick(asked, /Discard Indecipherable Stairs/), R)), STAIRS),
    ).toBeUndefined();
  });

  it("Towering Luminosity: into play, 1 doom on it or 2 damage; failing a test there, a clue to doom or discard it", () => {
    const r = rtlitas();
    const asked = until(drawNew(r, LUMINOSITY), offered(/Take 2 damage/));
    expect(inv(gOf(toTurn(pick(asked, /Take 2 damage/), R)), R).damage).toBe(2);
    const doomed = toTurn(pick(asked, /Place 1 doom/), R);
    const lum = loc(gOf(doomed), LUMINOSITY)!;
    expect(card(gOf(doomed), lum).doom).toBe(1);
    const there = mutate(rigBag(doomed, ["-5"]), (g) => placeInvestigator(g, R, lum));
    const failed = until(
      inject(there, () => {}, {
        t: STEP.Eff,
        effect: { op: "skillTest", skill: "willpower", difficulty: 5 },
        ctx: { you: R, source: null },
      } as Step),
      offered(/Flip 1 clue/),
    );
    const flipped = toTurn(pick(failed, /Flip 1 clue/), R);
    expect(card(gOf(flipped), lum)).toMatchObject({ clues: 3, doom: 2 });
  });

  it("Unstable Vortex: into play, a Tear Through Space discarded; ending your turn there, draw an encounter card or shuffle it back", () => {
    let r = rtlitas({ prep: (g) => void place(g, TEAR) });
    r = toTurn(drawNew(r, VORTEX), R);
    const g = gOf(r);
    expect(loc(g, VORTEX)).toBeDefined();
    expect(loc(g, TEAR)).toBeUndefined();
    r = mutate(r, (x) => placeInvestigator(x, R, loc(x, VORTEX)!));
    const asked = until(
      pick(r, "End turn"),
      offered(/Shuffle Unstable Vortex into the encounter deck/),
    );
    const back = until(
      pick(asked, /Shuffle Unstable Vortex/),
      (x) => !!x.state.pending && x.state.pending.kind !== "reaction",
    );
    expect(loc(gOf(back), VORTEX)).toBeUndefined();
    expect(cardsIn(gOf(back), ZONE.EncounterDeck).some((c) => c.code === VORTEX)).toBe(true);
  });
});

describe("the resolutions", () => {
  it("R1: act 4 left by resigning; R3: Yog-Sothoth defeated", () => {
    const resigned = until(
      inject(rtlitas(), (g) => toCard(g, "02319"), {
        t: STEP.Defeated,
        inv: R,
        by: "resign",
      } as Step),
      (x) => x.state.phase === "ended",
    );
    expect(resigned.state.resolution).toBe("R1");
    const won = until(
      inject(rtlitas(), (g) => moveCard(g, yogOf(g)!.id, ZONE.EncounterDiscard), {
        t: STEP.CheckObjectives,
      } as Step),
      (x) => x.state.phase === "ended",
    );
    expect(won.state.resolution).toBe("R3");
  });

  it("no resolution: the act reached is written for the flow (R2 on act 4, R4 before)", () => {
    const reached = (act: string) => {
      const out = until(
        inject(rtlitas({ log: { ritualCompleted: true } }), (g) => toCard(g, act), {
          t: STEP.Defeated,
          inv: R,
          by: "effect",
        } as Step),
        (x) => x.state.phase === "ended",
      );
      expect(out.state.resolution).toBe("none");
      return flags.countEntry.get(gOf(out), ["hidden", "actReached"]);
    };
    expect(reached("51055")).toBe(2);
    expect(reached("02319")).toBe(4);
  });
});
