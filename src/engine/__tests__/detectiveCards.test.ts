/** the Seeker/Rogue player cards of the starter decks that carry Fingerprint Kit (Joe Diamond, Carolyn Fern, Trish Scarborough) */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { def, inv, type GameContext } from "../context";
import { createGame } from "../index";
import { overfullSlot, playCost, playable } from "../rules/cards";
import type { Result } from "../index";
import { handLimit } from "../rules/investigators";
import { iconsFor } from "../rules/skillTest";
import type { Skill } from "../../content/schema";
import {
  ACOLYTE,
  HALLWAY,
  ROLAND,
  STUDY,
  addLocation,
  enemyHere,
  natGame,
  hand,
  inPlay,
  toTurn,
} from "../kits/natkit";
import { commitDone, db, deckCodes, mutate, options, pick, skipMulligans } from "../kits/testkit";
import { allCardRecsIn, cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";

beforeAll(async () => {
  await Promise.all(["dwl", "ptc", "tcu", "tfa", "tic", "tsk"].map(loadPack));
});

const gameOf = (r: Result): GameContext => ({ s: structuredClone(r.state), db, events: [] });
const clues = (r: Result) => invStateIn(r.state, ROLAND).clues;

describe("Laboratory Assistant", () => {
  it("draws 2 cards when it enters play and raises the hand size by 2", () => {
    let r = natGame([ROLAND], (x) => {
      hand(x, ROLAND, "02020");
      invStateIn(x.s, ROLAND).resources = 5;
    });
    const before = invStateIn(r.state, ROLAND).deck.length;
    r = pick(r, /^Play Laboratory Assistant/);
    r = pick(r, /Laboratory Assistant: draw 2/);
    expect(invStateIn(r.state, ROLAND).deck.length).toBe(before - 2);
    expect(handLimit(gameOf(r), ROLAND)).toBe(10);
  });
});

describe("Lucky Cigarette Case", () => {
  it("draws 1 card after a test succeeded by 2 or more", () => {
    // Roland intellect 3 with a +1 token against the Study's shroud 2: succeeds by 2
    let r = natGame([ROLAND], (x) => void inPlay(x, ROLAND, "04107"), ["+1"]);
    const before = invStateIn(r.state, ROLAND).hand.length;
    r = commitDone(pick(r, /^Investigate/));
    r = pick(r, /Lucky Cigarette Case/);
    expect(invStateIn(r.state, ROLAND).hand.length).toBe(before + 1);
  });

  it("is not offered when the test succeeds by only 1", () => {
    let r = natGame([ROLAND], (x) => void inPlay(x, ROLAND, "04107"));
    r = commitDone(pick(r, /^Investigate/));
    expect(options(r).some((o) => /Lucky Cigarette Case/.test(o))).toBe(false);
  });
});

describe("Thieves' Kit", () => {
  it("investigates with agility, spending a supply, and gains 1 resource on success", () => {
    let id = "";
    let r = natGame([ROLAND], (x) => (id = inPlay(x, ROLAND, "09064")));
    const res = invStateIn(r.state, ROLAND).resources;
    expect(options(r).filter((o) => o.startsWith("Thieves' Kit"))).toHaveLength(2);
    r = commitDone(pick(r, /^Thieves' Kit: investigate with agility/));
    // Roland agility 2 vs shroud 2 with a 0 token: success
    expect(clues(r)).toBe(1);
    expect(invStateIn(r.state, ROLAND).resources).toBe(res + 1);
    expect(cardRecIn(r.state, id).uses).toBe(5);
  });
});

describe("Breaking and Entering", () => {
  it("adds agility to the investigation and may evade an enemy here on a success by 2", () => {
    let enemy = "";
    let r = natGame([ROLAND], (x) => {
      hand(x, ROLAND, "07114");
      invStateIn(x.s, ROLAND).resources = 5;
      enemy = enemyHere(x, ROLAND);
    });
    r = commitDone(pick(r, /^Play Breaking and Entering/));
    r = pick(r, /Automatically evade/);
    if (r.state.pending?.options.some((o) => /Ghoul/.test(o.label))) r = pick(r, /Ghoul/);
    expect(clues(r)).toBe(1);
    expect(cardRecIn(r.state, enemy).engagedWith).toBeNull();
    expect(cardRecIn(r.state, enemy).exhausted).toBe(true);
    // no attack of opportunity from the engaged Ghoul
    expect(invStateIn(r.state, ROLAND).damage).toBe(0);
  });
});

describe("Scene of the Crime", () => {
  const scene = (enemy: boolean) =>
    natGame([ROLAND], (x) => {
      hand(x, ROLAND, "04103");
      invStateIn(x.s, ROLAND).resources = 5;
      if (enemy) enemyHere(x, ROLAND, undefined, false);
    });

  it("discovers 1 clue as the first action", () => {
    const r = pick(scene(false), /^Play Scene of the Crime/);
    expect(clues(r)).toBe(1);
  });

  it("discovers 2 clues when an enemy is at the location", () => {
    const r = pick(scene(true), /^Play Scene of the Crime/);
    expect(clues(r)).toBe(2);
  });

  it("can't be played after the first action", () => {
    const r = pick(scene(false), /^Gain 1 resource/);
    expect(options(r).some((o) => /Scene of the Crime/.test(o))).toBe(false);
  });
});

describe("Overzealous", () => {
  it("draws the top encounter card, and that draw is followed by another", () => {
    let r = natGame([ROLAND], (x) => {
      const id = hand(x, ROLAND, "03040");
      const me = invStateIn(x.s, ROLAND);
      me.hand = me.hand.filter((h) => h !== id);
      cardRecIn(x.s, id).zone = ZONE.Deck;
      me.deck.unshift(id);
    });
    const from = r.state.log.length;
    r = toTurn(pick(r, "Draw 1 card"));
    expect(r.state.log.slice(from).filter((e) => e.type === "encounter")).toHaveLength(2);
  });
});

describe("Steadfast and Curiosity", () => {
  const icons = (code: string, skill: Skill, prep: (x: GameContext) => void) => {
    const x = gameOf(natGame([ROLAND]));
    const id = hand(x, ROLAND, code);
    prep(x);
    return iconsFor(x, id, skill);
  };

  it("Steadfast gains willpower and combat by total remaining health and sanity (Roland: 9 + 5)", () => {
    expect(icons("05022", "combat", () => {})).toBe(3);
    expect(icons("05022", "combat", (x) => (invStateIn(x.s, ROLAND).damage = 6))).toBe(2);
    expect(icons("05022", "willpower", (x) => (invStateIn(x.s, ROLAND).damage = 8))).toBe(2);
    expect(
      icons("05022", "willpower", (x) => {
        invStateIn(x.s, ROLAND).damage = 8;
        invStateIn(x.s, ROLAND).horror = 2;
      }),
    ).toBe(1);
  });

  it("Curiosity gains willpower and intellect by cards in hand", () => {
    const handOf = (n: number) => (x: GameContext) => {
      const me = invStateIn(x.s, ROLAND);
      while (me.hand.length < n + 1) hand(x, ROLAND, "01088");
      me.hand = [
        ...me.hand.filter((h) => cardRecIn(x.s, h).code !== "05026").slice(0, n),
        ...me.hand.filter((h) => cardRecIn(x.s, h).code === "05026"),
      ];
    };
    expect(icons("05026", "intellect", handOf(3))).toBe(1);
    expect(icons("05026", "intellect", handOf(4))).toBe(2);
    expect(icons("05026", "willpower", handOf(7))).toBe(3);
  });
});

describe("Interrogate", () => {
  it("tests combat against 3 + the Humanoid's damage, then discovers a clue here and one elsewhere", () => {
    let hall = "";
    let r = natGame([ROLAND], (x) => {
      hand(x, ROLAND, "05020");
      invStateIn(x.s, ROLAND).resources = 5;
      enemyHere(x, ROLAND, ACOLYTE, false); // Humanoid, 1 damage: difficulty 4
      hall = addLocation(x, HALLWAY, [[STUDY, HALLWAY]]);
      cardRecIn(x.s, hall).clues = 2;
    });
    r = commitDone(pick(r, /^Play Interrogate/));
    expect(clues(r)).toBe(2); // Roland combat 4 with a 0 token
    expect(cardRecIn(r.state, hall).clues).toBe(1);
  });

  it("can't be played without a Humanoid enemy at your location", () => {
    const r = natGame([ROLAND], (x) => {
      hand(x, ROLAND, "05020");
      invStateIn(x.s, ROLAND).resources = 5;
      enemyHere(x, ROLAND, "01159", false); // Swarm of Rats: a Creature
    });
    expect(options(r).some((o) => /Interrogate/.test(o))).toBe(false);
  });
});

describe("Connect the Dots", () => {
  it("after the last clue here is discovered, discovers 2 clues at a location with a lower printed shroud", () => {
    let low = "";
    let r = natGame([ROLAND], (x) => {
      hand(x, ROLAND, "05025");
      invStateIn(x.s, ROLAND).resources = 5;
      cardRecIn(x.s, inv(x, ROLAND).location!).clues = 1;
      low = addLocation(x, HALLWAY, [[STUDY, HALLWAY]]); // Hallway: shroud 1, the Study: 2
      cardRecIn(x.s, low).clues = 3;
    });
    r = commitDone(pick(r, /^Investigate/));
    r = pick(r, /Connect the Dots/);
    expect(clues(r)).toBe(3);
    expect(cardRecIn(r.state, low).clues).toBe(1);
  });
});

describe("Delay the Inevitable", () => {
  const delayed = () => {
    let r = natGame([ROLAND], (x) => {
      hand(x, ROLAND, "05021");
      invStateIn(x.s, ROLAND).resources = 5;
    });
    r = pick(r, /^Play Delay the Inevitable/);
    return r;
  };
  const delay = (r: Result) => allCardRecsIn(r.state).find((c) => c.code === "05021")!;

  it("attaches to an investigator at your location, under their control", () => {
    const d = delay(delayed());
    expect(d.zone).toBe("play");
    expect(d.controller).toBe(ROLAND);
  });

  it("is discarded to cancel all the damage and horror an attack just dealt", () => {
    let r = mutate(delayed(), (x) => void enemyHere(x, ROLAND));
    r = pick(r, /^Gain 1 resource/); // provokes the Ghoul's attack of opportunity
    r = pick(r, /Delay the Inevitable: cancel/);
    expect(invStateIn(r.state, ROLAND).damage).toBe(0);
    expect(invStateIn(r.state, ROLAND).horror).toBe(0);
    expect(delay(r).zone).toBe("discard");
  });

  it("when the mythos phase ends, costs 2 resources or is discarded", () => {
    let r = delayed();
    const res = invStateIn(r.state, ROLAND).resources;
    r = toTurn(
      pick(r, /^End turn/),
      (x) => !!x.state.pending?.options.some((o) => /Spend 2 resources/.test(o.label)),
    );
    r = pick(r, /Spend 2 resources/);
    // the upkeep phase gave 1 resource before the mythos phase
    expect(invStateIn(r.state, ROLAND).resources).toBe(res + 1 - 2);
    expect(delay(r).zone).toBe("play");
  });
});

describe("Joe Diamond", () => {
  const JOE = "05002";
  const joe = (bag = ["0"]) => {
    const r = toTurn(
      skipMulligans(
        createGame(db, {
          campaignId: "night-of-the-zealot",
          scenarioId: "the-gathering",
          difficulty: "standard",
          seed: 1,
          chaosBag: bag as never,
          investigators: [{ code: JOE, deck: deckCodes("05002-starter") }],
        }),
      ),
    );
    return r;
  };
  const hunchOf = (r: Result) => r.state.world.tables.hunch[JOE] ?? [];
  const revealedOf = (r: Result) => r.state.world.tables.hunchRevealed[JOE];

  it("builds an 11-card hunch deck of Insight events with Unsolved Case, outside his deck", () => {
    const r = joe();
    const all = [...hunchOf(r), revealedOf(r)].filter(Boolean) as string[];
    expect(all).toHaveLength(11);
    const x = gameOf(r);
    for (const id of all) {
      expect(def(x, id).traits).toContain("Insight");
      expect(invStateIn(r.state, JOE).deck).not.toContain(id);
    }
    expect(all.some((id) => cardRecIn(r.state, id).code === "05010")).toBe(true);
  });

  it("reveals the top hunch card as the investigation phase begins, playable at -2 cost", () => {
    const r = joe();
    const top = revealedOf(r)!;
    expect(top).toBeDefined();
    const x = gameOf(r);
    expect(playCost(x, JOE, top)).toBe(Math.max(0, (def(x, top).cost as number) - 2));
    expect(playable(x, JOE)).toContain(top);
  });

  it("shuffles an unplayed hunch back at the end of the phase (Unsolved Case goes to the threat area)", () => {
    let r = joe();
    const top = revealedOf(r)!;
    r = toTurn(
      pick(r, /^End turn/),
      (y) => y.state.round > r.state.round && y.state.pending?.kind === "turn",
    );
    const zone = cardRecIn(r.state, top).zone;
    if (cardRecIn(r.state, top).code === "05010") expect(zone).toBe("threat");
    else expect([...hunchOf(r), revealedOf(r)]).toContain(top);
  });
});

describe("Unsolved Case", () => {
  it("places one of your clues on the location with the highest shroud and is removed from the game", () => {
    let id = "";
    let hall = "";
    let r = natGame([ROLAND], (x) => {
      id = hand(x, ROLAND, "05010");
      invStateIn(x.s, ROLAND).resources = 5;
      invStateIn(x.s, ROLAND).clues = 2;
      hall = addLocation(x, HALLWAY, [[STUDY, HALLWAY]]); // shroud 1, below the Study's 2
    });
    const study = invStateIn(r.state, ROLAND).location!;
    const before = cardRecIn(r.state, study).clues;
    r = pick(r, /^Play Unsolved Case/);
    expect(invStateIn(r.state, ROLAND).clues).toBe(1);
    expect(cardRecIn(r.state, study).clues).toBe(before + 1);
    expect(cardRecIn(r.state, hall).clues).toBe(0);
    expect(cardRecIn(r.state, id).zone).toBe("removed");
  });
});

describe("Detective's Colt 1911s", () => {
  it("fights at +1 combat for +1 damage, and lets 2 Tool assets take no hand slot", () => {
    let enemy = "";
    let r = natGame([ROLAND], (x) => {
      inPlay(x, ROLAND, "05009");
      inPlay(x, ROLAND, "05024");
      inPlay(x, ROLAND, "05024");
      enemy = enemyHere(x, ROLAND);
    });
    expect(overfullSlot(gameOf(r), ROLAND, null)).toBeNull();
    r = commitDone(pick(r, /^Detective's Colt 1911s: fight/));
    if (r.state.pending?.options.some((o) => /Ghoul/.test(o.label))) r = pick(r, /Ghoul/);
    // Roland combat 4 + 1 vs Ghoul Minion fight 2; 2 damage defeats its 2 health
    expect(cardRecIn(r.state, enemy).zone).not.toBe("enemy");
  });
});

describe("Carolyn Fern, Hypnotic Therapy and Rational Thought", () => {
  const CAROLYN = "05001";
  const carolyn = (prep: (x: GameContext) => void) =>
    mutate(
      toTurn(
        skipMulligans(
          createGame(db, {
            campaignId: "night-of-the-zealot",
            scenarioId: "the-gathering",
            difficulty: "standard",
            seed: 1,
            chaosBag: ["0"] as never,
            investigators: [{ code: CAROLYN, deck: deckCodes("roland-starter") }],
          }),
        ),
      ),
      (x) => {
        invStateIn(x.s, CAROLYN).horror = 3;
        prep(x);
      },
    );
  const me = (r: Result) => invStateIn(r.state, CAROLYN);

  it("Hypnotic Therapy heals 1 horror on a successful intellect test; Carolyn's reaction gives the healed investigator 1 resource", () => {
    let r = carolyn((x) => void inPlay(x, CAROLYN, "05007"));
    const res = me(r).resources;
    r = commitDone(pick(r, /^Hypnotic Therapy: test intellect/));
    expect(options(r).some((o) => /Hypnotic Therapy: heal 1 additional/.test(o))).toBe(false);
    r = pick(r, /^Carolyn Fern: the healed card's controller gains 1 resource/);
    r = pick(r, /^Draw 1 card/);
    expect(me(r).horror).toBe(2);
    expect(me(r).resources).toBe(res + 1);
  });

  it("Hypnotic Therapy adds 1 horror to another card's heal", () => {
    let r = carolyn((x) => {
      inPlay(x, CAROLYN, "05007");
      inPlay(x, CAROLYN, "02030"); // Clarity of Mind: heal 1 horror
    });
    r = pick(r, /^Clarity of Mind/);
    r = pick(r, /^Hypnotic Therapy: heal 1 additional/);
    expect(me(r).horror).toBe(1);
  });

  it("with Rational Thought, Carolyn's horror heals go on it and her reaction gives no resource", () => {
    let rt = "";
    let r = carolyn((x) => {
      inPlay(x, CAROLYN, "02030");
      rt = hand(x, CAROLYN, "05008");
      const m = invStateIn(x.s, CAROLYN);
      m.hand = m.hand.filter((h) => h !== rt);
      cardRecIn(x.s, rt).zone = ZONE.Deck;
      m.deck.unshift(rt);
    });
    r = pick(r, "Draw 1 card");
    expect(cardRecIn(r.state, rt).zone).toBe("threat");
    expect(cardRecIn(r.state, rt).horror).toBe(4);
    r = pick(r, /^Clarity of Mind/);
    expect(me(r).horror).toBe(3);
    expect(cardRecIn(r.state, rt).horror).toBe(3);
    expect(options(r).some((o) => /Carolyn Fern:/.test(o))).toBe(false);
  });
});
