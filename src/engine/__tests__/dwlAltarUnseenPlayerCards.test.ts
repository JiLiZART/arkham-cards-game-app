/**
 * The player cards of Blood on the Altar and Undimensioned and Unseen (player-cards-dwl, groups 4 and 5): one test each,
 * at least.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { card, currentRound, inv, placeInvestigator, setCounter, setEngaged } from "../context";
import type { GameContext } from "../context";
import {
  addLocation,
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  investigate,
  lastTest,
  play,
  rigBag,
  toTurn,
  until,
  use,
  windowOf,
} from "../kits/driver";
import { commitDone, gOf, options, pick, putEnemy } from "../kits/testkit";
import { createCard, moveCard, putOnTop } from "../movement";
import { enemies } from "../queries";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import type { Result } from "../index";

beforeAll(() => loadPack("dwl"));

const ROLAND = "01001"; // willpower 3, intellect 3, combat 4, agility 2
const DAISY = "01002"; // intellect 5
const STUDY = "01111"; // shroud 2
const HALLWAY = "01112";
const MINION = "01160"; // Ghoul Minion (Monster): fight 2, health 2, evade 2, damage 1, horror 1
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3, evade 3, damage 1, horror 1

const cardOf = (r: Result, id: string) => card(gOf(r), id);
const where = (r: Result, i: string) => card(gOf(r), inv(gOf(r), i).location!).code;
const hallway = (game: GameContext) => addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
/** the Study with clues on it */
const clues = (game: GameContext, n: number) =>
  setCounter(game, inv(game, ROLAND).location!, "clues", n);
/** open Roland's investigation of the Study: the commit window */
const investigating = (r: Result) => pick(r, "Investigate Study");

describe("Blood on the Altar", () => {
  it("Prepared for the Worst: a Weapon asset from the top 9 cards into your hand", () => {
    let gun = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "02184");
        gun = createCard(g, "01016", ZONE.Limbo, ROLAND); // .45 Automatic
        putOnTop(g, ROLAND, [gun]);
      },
    });
    r = toTurn(pick(play(r, "02184"), ".45 Automatic"), ROLAND);
    expect(cardOf(r, gun).zone).toBe(ZONE.Hand);
  });

  it("Keen Eye: 2 resources for +1 intellect until the end of the phase", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02185");
        clues(g, 2);
      },
    });
    const resources = inv(gOf(r), ROLAND).resources;
    r = toTurn(use(r, "02185"), ROLAND);
    expect(inv(gOf(r), ROLAND).resources).toBe(resources - 2);
    r = toTurn(investigate(r), ROLAND);
    expect(lastTest(r)?.base).toBe(4);
  });

  it("Preposterous Sketches: only with a clue on your location; draws 3", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "02186");
        clues(g, 0);
      },
    });
    expect(options(r).some((o) => o.includes("Preposterous Sketches"))).toBe(false);
    r = inject(r, (g) => clues(g, 1));
    const n = inv(gOf(r), ROLAND).deck.length;
    r = toTurn(play(r, "02186"), ROLAND);
    expect(inv(gOf(r), ROLAND).deck.length).toBe(n - 3);
  });

  it("Higher Education: +2 intellect for 1 resource, only with 5 or more cards in hand", () => {
    const run = (cards: number) => {
      let r = game({
        investigators: [ROLAND],
        bag: ["0"],
        prep: (g) => {
          inPlay(g, ROLAND, "02187");
          clues(g, 2);
          for (const h of inv(g, ROLAND).hand.slice()) moveCard(g, h, ZONE.Discard);
          for (let k = 0; k < cards; k++) hand(g, ROLAND, "01088"); // Emergency Cache
        },
      });
      r = investigating(r);
      return r;
    };
    expect(options(run(4)).some((o) => o.startsWith("Higher Education"))).toBe(false);
    let r = pick(run(5), "Higher Education: +2 intellect");
    r = toTurn(commitDone(r), ROLAND);
    expect(lastTest(r)?.base).toBe(5);
  });

  it("Lone Wolf: 1 resource as your turn begins, if no other investigator is at your location", () => {
    const turn = (alone: boolean) => {
      let r = game({
        investigators: [ROLAND, DAISY],
        prep: (g) => {
          inPlay(g, ROLAND, "02188");
          if (alone) placeInvestigator(g, DAISY, hallway(g));
        },
      });
      return until(
        inject(r, () => {}, { t: STEP.Window, trigger: "turnBegins", data: { inv: ROLAND } }),
        (x) => windowOf(x) === "turnBegins" || x.state.pending?.kind === "turn",
      );
    };
    expect(options(turn(false)).some((o) => o.startsWith("Lone Wolf"))).toBe(false);
    const r = turn(true);
    const before = inv(gOf(r), ROLAND).resources;
    expect(inv(gOf(toTurn(pick(r, /^Lone Wolf/), ROLAND)), ROLAND).resources).toBe(before + 1);
  });

  it("Lone Wolf: one per investigator", () => {
    const r = game({
      investigators: [ROLAND],
      prep: (g) => {
        inPlay(g, ROLAND, "02188");
        hand(g, ROLAND, "02188");
      },
    });
    expect(options(r).some((o) => o === "Play Lone Wolf")).toBe(false);
  });

  it("Streetwise: 2 resources for +3 intellect on your test", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02189");
        clues(g, 2);
      },
    });
    r = toTurn(commitDone(pick(investigating(r), /\+3 intellect/)), ROLAND);
    expect(lastTest(r)?.base).toBe(6);
  });

  it("Defiance: the symbol chosen before the reveal is ignored, its modifier too", () => {
    const run = (symbol: string) => {
      let r = game({
        investigators: [ROLAND],
        bag: ["cultist"], // The Gathering, Standard: -1, 1 horror on a failure
        prep: (g) => {
          hand(g, ROLAND, "02190");
          clues(g, 2);
        },
      });
      r = pick(investigating(r), /^Commit Defiance/);
      r = until(
        commitDone(r),
        (x) => x.state.pending?.options.some((o) => o.id === "skull") ?? false,
      );
      return toTurn(pick(r, symbol), ROLAND);
    };
    // intellect 3 + 1 wild
    expect(lastTest(run("cultist"))?.total).toBe(4);
    expect(lastTest(run("skull"))?.total).toBe(3);
  });

  it("Blood Pact: 1 doom on it for +3 willpower, once per test", () => {
    let pact = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => (pact = inPlay(g, ROLAND, "02191")),
    });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 5 },
      ctx: { you: ROLAND, source: null },
    });
    r = pick(r, /\+3 willpower/);
    expect(options(r).some((o) => o.includes("+3 willpower"))).toBe(false);
    r = toTurn(commitDone(r), ROLAND);
    expect(lastTest(r)?.base).toBe(6);
    expect(cardOf(r, pact).doom).toBe(1);
  });

  it("Rise to the Occasion: only to your own test at least 2 over your base skill", () => {
    const window = (difficulty: number, by = ROLAND) => {
      const r = game({
        investigators: [ROLAND, DAISY],
        prep: (g) => void hand(g, by, "02192"),
      });
      return inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "skillTest", skill: "intellect", difficulty },
        ctx: { you: ROLAND, source: null },
      });
    };
    const offered = (r: Result) => options(r).some((o) => o.startsWith("Commit Rise"));
    expect(offered(window(4))).toBe(false);
    expect(offered(window(5))).toBe(true);
    // Daisy at Roland's location can't commit it to his test
    const r = until(commitDone(window(9, DAISY)), (x) => x.state.pending?.inv === DAISY);
    expect(offered(r)).toBe(false);
  });

  it("Scrapper: 1 resource for +1 combat on your attack", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02193");
        enemyHere(g, ROLAND, RAVENOUS);
      },
    });
    r = pick(r, "Fight Ravenous Ghoul");
    r = toTurn(commitDone(pick(r, "Scrapper: +1 combat")), ROLAND);
    expect(lastTest(r)?.base).toBe(5);
  });

  it("Emergency Cache (2): 3 resources and 1 card", () => {
    let r = game({ investigators: [ROLAND], prep: (g) => void hand(g, ROLAND, "02194") });
    const me = { ...inv(gOf(r), ROLAND), hand: [...inv(gOf(r), ROLAND).hand] };
    r = toTurn(play(r, "02194"), ROLAND);
    expect(inv(gOf(r), ROLAND).resources).toBe(me.resources + 3);
    expect(inv(gOf(r), ROLAND).hand.length).toBe(me.hand.length);
  });
});

describe("Undimensioned and Unseen", () => {
  it(`"If it bleeds...": after you defeat a Monster, each investigator here heals its horror value`, () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      bag: ["0"],
      prep: (g) => {
        hand(g, ROLAND, "02225");
        const m = enemyHere(g, ROLAND, MINION);
        setCounter(g, m, "damage", 1);
        setCounter(g, ROLAND, "horror", 2);
        setCounter(g, DAISY, "horror", 2);
      },
    });
    r = commitDone(pick(r, "Fight Ghoul Minion"));
    r = until(r, (x) => windowOf(x) === "enemyDefeated");
    r = toTurn(pick(r, /If it bleeds/), ROLAND);
    expect(inv(gOf(r), ROLAND).horror).toBe(1);
    expect(inv(gOf(r), DAISY).horror).toBe(1);
  });

  it("Springfield M1903: +3 combat, +2 damage, only against an enemy not engaged with you", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02226");
        enemyHere(g, ROLAND, RAVENOUS);
      },
    });
    expect(options(r).some((o) => o.startsWith("Springfield"))).toBe(false);
    r = inject(r, (g) => {
      for (const e of enemies(g)) setEngaged(g, e.id, null);
    });
    r = toTurn(use(r, "02226"), ROLAND);
    expect(lastTest(r)?.base).toBe(7);
    expect(enemies(gOf(r))).toHaveLength(0);
  });

  it("Inquiring Mind: committed only with a clue at your location", () => {
    const offered = (n: number) => {
      const r = game({
        investigators: [ROLAND],
        prep: (g) => {
          hand(g, ROLAND, "02227");
          clues(g, n);
        },
      });
      return inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "skillTest", skill: "combat", difficulty: 3 },
        ctx: { you: ROLAND, source: null },
      });
    };
    expect(options(offered(0)).some((o) => o.startsWith("Commit Inquiring Mind"))).toBe(false);
    expect(options(offered(1)).some((o) => o.startsWith("Commit Inquiring Mind"))).toBe(true);
  });

  it("Expose Weakness: each point succeeded by lowers the enemy's fight for the next attack only", () => {
    let r = game({
      investigators: [DAISY],
      bag: ["0"],
      prep: (g) => {
        hand(g, DAISY, "02228");
        putEnemy(g, "01116", inv(g, DAISY).location!, DAISY); // Ghoul Priest: fight 4
      },
    });
    // intellect 5 against fight 4: by 1
    r = toTurn(commitDone(play(r, "02228")), DAISY);
    r = toTurn(commitDone(pick(r, "Fight Ghoul Priest")), DAISY);
    expect(lastTest(r)?.difficulty).toBe(3);
    r = toTurn(commitDone(pick(r, "Fight Ghoul Priest")), DAISY);
    expect(lastTest(r)?.difficulty).toBe(4);
  });

  it("Quick Thinking: a success by 2 or more gives an action that costs none of yours", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        hand(g, ROLAND, "02229");
        clues(g, 3);
      },
    });
    const actions = inv(gOf(r), ROLAND).actionsLeft;
    // intellect 3 + 1 wild against shroud 2
    r = commitDone(pick(investigating(r), /^Commit Quick Thinking/));
    r = until(r, (x) => x.state.pending?.promptKey === "bonusAction");
    r = toTurn(pick(r, "Investigate Study"), ROLAND);
    expect(inv(gOf(r), ROLAND).clues).toBe(2);
    expect(inv(gOf(r), ROLAND).actionsLeft).toBe(actions - 1);
  });

  it("Lucky Dice: 2 resources ignore a token and reveal another; an auto-fail that way removes them", () => {
    const roll = (next: "0" | "autoFail") => {
      let dice = "";
      let r = game({
        investigators: [ROLAND],
        bag: ["-4"],
        prep: (g) => {
          dice = inPlay(g, ROLAND, "02230");
          clues(g, 2);
        },
      });
      r = until(commitDone(investigating(r)), (x) => windowOf(x) === "tokenRevealed");
      r = pick(rigBag(r, [next]), /^Lucky Dice/);
      return { r: toTurn(r, ROLAND), dice };
    };
    const { r, dice } = roll("0");
    expect(lastTest(r)?.tokens).toEqual(["0"]);
    expect(lastTest(r)?.success).toBe(true);
    expect([...r.state.chaosBag].sort()).toEqual(["-4", "0"]);
    expect(cardOf(r, dice).zone).toBe(ZONE.Play);
    const lost = roll("autoFail");
    expect(lastTest(lost.r)?.success).toBe(false);
    expect(cardOf(lost.r, lost.dice).zone).toBe(ZONE.Removed);
  });

  it("Opportunist: back to your hand after a success by 2 or more, else discarded", () => {
    const run = (token: "0" | "-1") => {
      let opp = "";
      let r = game({
        investigators: [ROLAND],
        bag: [token],
        prep: (g) => {
          opp = hand(g, ROLAND, "02231");
          clues(g, 2);
        },
      });
      r = toTurn(commitDone(pick(investigating(r), /^Commit Opportunist/)), ROLAND);
      return cardOf(r, opp).zone;
    };
    // intellect 3 + 1 wild against shroud 2
    expect(run("0")).toBe(ZONE.Hand);
    expect(run("-1")).toBe(ZONE.Discard);
  });

  it("Alyssa Graham: +1 intellect; the top card of a deck to its bottom for 1 doom on her", () => {
    let alyssa = "";
    let top = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        alyssa = inPlay(g, ROLAND, "02232");
        top = inv(g, ROLAND).deck[0];
      },
    });
    r = pick(use(r, "02232", 1), /Roland Banks/);
    r = toTurn(pick(r, /bottom/), ROLAND);
    const deck = inv(gOf(r), ROLAND).deck;
    expect(deck[deck.length - 1]).toBe(top);
    expect(cardOf(r, alyssa).doom).toBe(1);
  });

  it("Alyssa Graham gives +1 intellect", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02232");
        clues(g, 2);
      },
    });
    r = toTurn(investigate(r), ROLAND);
    expect(lastTest(r)?.base).toBe(4);
  });

  it("Rite of Seeking (4): willpower +2; 2 more clues on a success; a symbol ends the turn", () => {
    const run = (token: "0" | "skull") => {
      let r = game({
        investigators: [ROLAND],
        bag: [token],
        prep: (g) => {
          inPlay(g, ROLAND, "02233");
          clues(g, 5);
        },
      });
      return toTurn(use(r, "02233"));
    };
    const r = run("0");
    expect(lastTest(r)?.base).toBe(5);
    expect(inv(gOf(r), ROLAND).clues).toBe(3);
    expect(currentRound(gOf(r))).toBe(1);
    // the skull (-1) still succeeds; the turn is over: the next turn is the next round's
    const s = run("skull");
    expect(inv(gOf(s), ROLAND).clues).toBe(3);
    expect(currentRound(gOf(s))).toBe(2);
  });

  it("Dark Horse: +1 to each skill with no resources; the upkeep income may be refused", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02234");
        clues(g, 2);
        setCounter(g, ROLAND, "resources", 0);
      },
    });
    r = toTurn(investigate(r), ROLAND);
    expect(lastTest(r)?.base).toBe(4);
    r = inject(r, () => {}, { t: STEP.GainResource, inv: ROLAND });
    expect(options(r)).toEqual(["Gain 1 resources", "Gain none"]);
    r = toTurn(pick(r, "Gain none"), ROLAND);
    expect(inv(gOf(r), ROLAND).resources).toBe(0);
  });

  it("Survival Instinct (2): after the evasion, evade each other engaged enemy and move to a connecting location", () => {
    let other = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        hand(g, ROLAND, "02235");
        hallway(g);
        enemyHere(g, ROLAND, MINION);
        other = enemyHere(g, ROLAND, RAVENOUS);
      },
    });
    // agility 2 + 2 icons against evade 2
    r = commitDone(pick(pick(r, "Evade Ghoul Minion"), /^Commit Survival Instinct/));
    r = until(r, (x) => x.state.pending?.promptKey === "survivalInstinct");
    r = until(pick(r, "Yes"), (x) => x.state.pending?.promptKey === "survivalInstinctMove");
    r = toTurn(pick(r, "Yes"), ROLAND);
    expect(cardOf(r, other).engagedWith).toBe(null);
    expect(cardOf(r, other).exhausted).toBe(true);
    expect(where(r, ROLAND)).toBe(HALLWAY);
  });
});
