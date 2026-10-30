/** the Seeker/Rogue player cards of the starter decks that carry Fingerprint Kit (Joe Diamond, Carolyn Fern, Trish Scarborough) */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { card, def, inv, type G } from "./core";
import { createGame } from "./engine";
import { overfullSlot, playCost, playable } from "./rules/cards";
import type { Result } from "./engine";
import { handLimit } from "./rules/investigators";
import { iconsFor } from "./rules/skillTest";
import type { Skill } from "../content/schema";
import {
  ACOLYTE,
  HALLWAY,
  ROLAND,
  STUDY,
  addLocation,
  enemyHere,
  game,
  hand,
  inPlay,
  toTurn,
} from "./natkit";
import { commitDone, db, deckCodes, mutate, options, pick, skipMulligans } from "./testkit";

beforeAll(async () => {
  await Promise.all(["dwl", "ptc", "tcu", "tfa", "tic", "tsk"].map(loadPack));
});

const g = (r: Result): G => ({ s: structuredClone(r.state), db, events: [] });
const clues = (r: Result) => r.state.invs[ROLAND].clues;

describe("Laboratory Assistant", () => {
  it("draws 2 cards when it enters play and raises the hand size by 2", () => {
    let r = game([ROLAND], (x) => {
      hand(x, ROLAND, "02020");
      inv(x, ROLAND).resources = 5;
    });
    const before = r.state.invs[ROLAND].deck.length;
    r = pick(r, /^Play Laboratory Assistant/);
    r = pick(r, /Laboratory Assistant: draw 2/);
    expect(r.state.invs[ROLAND].deck.length).toBe(before - 2);
    expect(handLimit(g(r), ROLAND)).toBe(10);
  });
});

describe("Lucky Cigarette Case", () => {
  it("draws 1 card after a test succeeded by 2 or more", () => {
    // Roland intellect 3 with a +1 token against the Study's shroud 2: succeeds by 2
    let r = game([ROLAND], (x) => void inPlay(x, ROLAND, "04107"), ["+1"]);
    const before = r.state.invs[ROLAND].hand.length;
    r = commitDone(pick(r, /^Investigate/));
    r = pick(r, /Lucky Cigarette Case/);
    expect(r.state.invs[ROLAND].hand.length).toBe(before + 1);
  });

  it("is not offered when the test succeeds by only 1", () => {
    let r = game([ROLAND], (x) => void inPlay(x, ROLAND, "04107"));
    r = commitDone(pick(r, /^Investigate/));
    expect(options(r).some((o) => /Lucky Cigarette Case/.test(o))).toBe(false);
  });
});

describe("Thieves' Kit", () => {
  it("investigates with agility, spending a supply, and gains 1 resource on success", () => {
    let id = "";
    let r = game([ROLAND], (x) => (id = inPlay(x, ROLAND, "09064")));
    const res = r.state.invs[ROLAND].resources;
    expect(options(r).filter((o) => o.startsWith("Thieves' Kit"))).toHaveLength(2);
    r = commitDone(pick(r, /^Thieves' Kit: investigate with agility/));
    // Roland agility 2 vs shroud 2 with a 0 token: success
    expect(clues(r)).toBe(1);
    expect(r.state.invs[ROLAND].resources).toBe(res + 1);
    expect(r.state.cards[id].uses).toBe(5);
  });
});

describe("Breaking and Entering", () => {
  it("adds agility to the investigation and may evade an enemy here on a success by 2", () => {
    let enemy = "";
    let r = game([ROLAND], (x) => {
      hand(x, ROLAND, "07114");
      inv(x, ROLAND).resources = 5;
      enemy = enemyHere(x, ROLAND);
    });
    r = commitDone(pick(r, /^Play Breaking and Entering/));
    r = pick(r, /Automatically evade/);
    if (r.state.pending?.options.some((o) => /Ghoul/.test(o.label))) r = pick(r, /Ghoul/);
    expect(clues(r)).toBe(1);
    expect(r.state.cards[enemy].engagedWith).toBeNull();
    expect(r.state.cards[enemy].exhausted).toBe(true);
    // no attack of opportunity from the engaged Ghoul
    expect(r.state.invs[ROLAND].damage).toBe(0);
  });
});

describe("Scene of the Crime", () => {
  const scene = (enemy: boolean) =>
    game([ROLAND], (x) => {
      hand(x, ROLAND, "04103");
      inv(x, ROLAND).resources = 5;
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
    let r = game([ROLAND], (x) => {
      const id = hand(x, ROLAND, "03040");
      const me = inv(x, ROLAND);
      me.hand = me.hand.filter((h) => h !== id);
      card(x, id).zone = "deck";
      me.deck.unshift(id);
    });
    const from = r.state.log.length;
    r = toTurn(pick(r, "Draw 1 card"));
    expect(r.state.log.slice(from).filter((e) => e.type === "encounter")).toHaveLength(2);
  });
});

describe("Steadfast and Curiosity", () => {
  const icons = (code: string, skill: Skill, prep: (x: G) => void) => {
    const x = g(game([ROLAND]));
    const id = hand(x, ROLAND, code);
    prep(x);
    return iconsFor(x, id, skill);
  };

  it("Steadfast gains willpower and combat by total remaining health and sanity (Roland: 9 + 5)", () => {
    expect(icons("05022", "combat", () => {})).toBe(3);
    expect(icons("05022", "combat", (x) => (inv(x, ROLAND).damage = 6))).toBe(2);
    expect(icons("05022", "willpower", (x) => (inv(x, ROLAND).damage = 8))).toBe(2);
    expect(
      icons("05022", "willpower", (x) => {
        inv(x, ROLAND).damage = 8;
        inv(x, ROLAND).horror = 2;
      }),
    ).toBe(1);
  });

  it("Curiosity gains willpower and intellect by cards in hand", () => {
    const handOf = (n: number) => (x: G) => {
      const me = inv(x, ROLAND);
      while (me.hand.length < n + 1) hand(x, ROLAND, "01088");
      me.hand = [
        ...me.hand.filter((h) => x.s.cards[h].code !== "05026").slice(0, n),
        ...me.hand.filter((h) => x.s.cards[h].code === "05026"),
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
    let r = game([ROLAND], (x) => {
      hand(x, ROLAND, "05020");
      inv(x, ROLAND).resources = 5;
      enemyHere(x, ROLAND, ACOLYTE, false); // Humanoid, 1 damage: difficulty 4
      hall = addLocation(x, HALLWAY, [[STUDY, HALLWAY]]);
      card(x, hall).clues = 2;
    });
    r = commitDone(pick(r, /^Play Interrogate/));
    expect(clues(r)).toBe(2); // Roland combat 4 with a 0 token
    expect(r.state.cards[hall].clues).toBe(1);
  });

  it("can't be played without a Humanoid enemy at your location", () => {
    const r = game([ROLAND], (x) => {
      hand(x, ROLAND, "05020");
      inv(x, ROLAND).resources = 5;
      enemyHere(x, ROLAND, "01159", false); // Swarm of Rats: a Creature
    });
    expect(options(r).some((o) => /Interrogate/.test(o))).toBe(false);
  });
});

describe("Connect the Dots", () => {
  it("after the last clue here is discovered, discovers 2 clues at a location with a lower printed shroud", () => {
    let low = "";
    let r = game([ROLAND], (x) => {
      hand(x, ROLAND, "05025");
      inv(x, ROLAND).resources = 5;
      card(x, inv(x, ROLAND).location!).clues = 1;
      low = addLocation(x, HALLWAY, [[STUDY, HALLWAY]]); // Hallway: shroud 1, the Study: 2
      card(x, low).clues = 3;
    });
    r = commitDone(pick(r, /^Investigate/));
    r = pick(r, /Connect the Dots/);
    expect(clues(r)).toBe(3);
    expect(r.state.cards[low].clues).toBe(1);
  });
});

describe("Delay the Inevitable", () => {
  const delayed = () => {
    let r = game([ROLAND], (x) => {
      hand(x, ROLAND, "05021");
      inv(x, ROLAND).resources = 5;
    });
    r = pick(r, /^Play Delay the Inevitable/);
    return r;
  };
  const delay = (r: Result) => Object.values(r.state.cards).find((c) => c.code === "05021")!;

  it("attaches to an investigator at your location, under their control", () => {
    const d = delay(delayed());
    expect(d.zone).toBe("play");
    expect(d.controller).toBe(ROLAND);
  });

  it("is discarded to cancel all the damage and horror an attack just dealt", () => {
    let r = mutate(delayed(), (x) => void enemyHere(x, ROLAND));
    r = pick(r, /^Gain 1 resource/); // provokes the Ghoul's attack of opportunity
    r = pick(r, /Delay the Inevitable: cancel/);
    expect(r.state.invs[ROLAND].damage).toBe(0);
    expect(r.state.invs[ROLAND].horror).toBe(0);
    expect(delay(r).zone).toBe("discard");
  });

  it("when the mythos phase ends, costs 2 resources or is discarded", () => {
    let r = delayed();
    const res = r.state.invs[ROLAND].resources;
    r = toTurn(
      pick(r, /^End turn/),
      (x) => !!x.state.pending?.options.some((o) => /Spend 2 resources/.test(o.label)),
    );
    r = pick(r, /Spend 2 resources/);
    // the upkeep phase gave 1 resource before the mythos phase
    expect(r.state.invs[ROLAND].resources).toBe(res + 1 - 2);
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
  const hunchOf = (r: Result) => (r.state.flags[`hunch:${JOE}`] as string[]) ?? [];
  const revealedOf = (r: Result) => r.state.flags[`hunchRevealed:${JOE}`] as string | undefined;

  it("builds an 11-card hunch deck of Insight events with Unsolved Case, outside his deck", () => {
    const r = joe();
    const all = [...hunchOf(r), revealedOf(r)].filter(Boolean) as string[];
    expect(all).toHaveLength(11);
    const x = g(r);
    for (const id of all) {
      expect(def(x, id).traits).toContain("Insight");
      expect(r.state.invs[JOE].deck).not.toContain(id);
    }
    expect(all.some((id) => r.state.cards[id].code === "05010")).toBe(true);
  });

  it("reveals the top hunch card as the investigation phase begins, playable at -2 cost", () => {
    const r = joe();
    const top = revealedOf(r)!;
    expect(top).toBeDefined();
    const x = g(r);
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
    const zone = r.state.cards[top].zone;
    if (r.state.cards[top].code === "05010") expect(zone).toBe("threat");
    else expect([...hunchOf(r), revealedOf(r)]).toContain(top);
  });
});

describe("Unsolved Case", () => {
  it("places one of your clues on the location with the highest shroud and is removed from the game", () => {
    let id = "";
    let hall = "";
    let r = game([ROLAND], (x) => {
      id = hand(x, ROLAND, "05010");
      inv(x, ROLAND).resources = 5;
      inv(x, ROLAND).clues = 2;
      hall = addLocation(x, HALLWAY, [[STUDY, HALLWAY]]); // shroud 1, below the Study's 2
    });
    const study = r.state.invs[ROLAND].location!;
    const before = r.state.cards[study].clues;
    r = pick(r, /^Play Unsolved Case/);
    expect(r.state.invs[ROLAND].clues).toBe(1);
    expect(r.state.cards[study].clues).toBe(before + 1);
    expect(r.state.cards[hall].clues).toBe(0);
    expect(r.state.cards[id].zone).toBe("removed");
  });
});

describe("Detective's Colt 1911s", () => {
  it("fights at +1 combat for +1 damage, and lets 2 Tool assets take no hand slot", () => {
    let enemy = "";
    let r = game([ROLAND], (x) => {
      inPlay(x, ROLAND, "05009");
      inPlay(x, ROLAND, "05024");
      inPlay(x, ROLAND, "05024");
      enemy = enemyHere(x, ROLAND);
    });
    expect(overfullSlot(g(r), ROLAND, null)).toBeNull();
    r = commitDone(pick(r, /^Detective's Colt 1911s: fight/));
    if (r.state.pending?.options.some((o) => /Ghoul/.test(o.label))) r = pick(r, /Ghoul/);
    // Roland combat 4 + 1 vs Ghoul Minion fight 2; 2 damage defeats its 2 health
    expect(r.state.cards[enemy].zone).not.toBe("enemy");
  });
});

describe("Carolyn Fern, Hypnotic Therapy and Rational Thought", () => {
  const CAROLYN = "05001";
  const carolyn = (prep: (x: G) => void) =>
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
        inv(x, CAROLYN).horror = 3;
        prep(x);
      },
    );
  const me = (r: Result) => r.state.invs[CAROLYN];

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
      const m = inv(x, CAROLYN);
      m.hand = m.hand.filter((h) => h !== rt);
      card(x, rt).zone = "deck";
      m.deck.unshift(rt);
    });
    r = pick(r, "Draw 1 card");
    expect(r.state.cards[rt].zone).toBe("threat");
    expect(r.state.cards[rt].horror).toBe(4);
    r = pick(r, /^Clarity of Mind/);
    expect(me(r).horror).toBe(3);
    expect(r.state.cards[rt].horror).toBe(3);
    expect(options(r).some((o) => /Carolyn Fern:/.test(o))).toBe(false);
  });
});
