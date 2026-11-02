import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { createCard, moveCard } from "../movement";
import { inv, type GameContext } from "../context";
import type { Result } from "../index";
import {
  ACOLYTE,
  HALLWAY,
  MINION,
  PRIEST,
  ROLAND,
  STUDY,
  addLocation,
  enemyHere,
  enemyIn,
  natGame,
  hand,
  inPlay,
  toTurn,
  zoneOf,
} from "../kits/natkit";
import { gOf, options, pick } from "../kits/testkit";
import { allCardRecsIn, cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";

beforeAll(async () => {
  await loadPack("core_2026");
});

const R = ROLAND;
const DANIELA = "12001";
const TRISH = "12007";
const roland = (prep: (game: GameContext) => void = () => {}, bag?: string[]) =>
  natGame([R], prep, bag);
const offered = (name: RegExp) => (x: Result) => options(x).some((o) => name.test(o));
const lastResult = (r: Result) =>
  r.state.log.filter((e) => e.type === "testResult").at(-1)!.data as {
    value: number;
    tokens: string[];
    success: boolean;
  };
const damageOn = (r: Result, code: string) => enemyIn(r, code)?.damage;
const cardOf = (r: Result, code: string) => allCardRecsIn(r.state).find((c) => c.code === code)!;
/** a card of `code` on top of the investigator's deck */
function onDeck(game: GameContext, i: string, code: string) {
  const id = createCard(game, code, ZONE.Limbo, i);
  moveCard(game, id, ZONE.Deck, { inv: i, top: true });
  return id;
}

describe("weapons", () => {
  it("Sledgehammer's two-action attack: exhausted after a success for +2 damage", () => {
    let r = roland((game) => {
      inPlay(game, R, "12028");
      enemyHere(game, R, PRIEST);
    });
    r = pick(r, /^Sledgehammer: fight \(\+3/);
    r = toTurn(r, offered(/^Use Sledgehammer/));
    r = toTurn(pick(r, /^Use Sledgehammer/));
    expect(damageOn(r, PRIEST)).toBe(3);
    expect(cardOf(r, "12028").exhausted).toBe(true);
  });

  it("Winchester Model 12 adds the margin, at most +4", () => {
    let r = roland((game) => {
      inPlay(game, R, "12029");
      enemyHere(game, R, PRIEST);
    });
    // combat 4 + 3 vs 4: succeeds by 3
    r = toTurn(pick(r, /^Winchester/));
    expect(damageOn(r, PRIEST)).toBe(4);
  });

  it("Decisive Strike gains 5 resources when it defeats the enemy", () => {
    let r = roland((game) => {
      hand(game, R, "12055");
      enemyHere(game, R, MINION);
      invStateIn(game.s, R).resources = 2;
    });
    r = toTurn(pick(r, /^Play Decisive Strike/));
    expect(zoneOf(r, MINION)).not.toContain("enemy");
    expect(invStateIn(r.state, R).resources).toBe(5);
  });

  it("Broken Bottle may be discarded after a success for +1 damage", () => {
    let r = roland((game) => {
      inPlay(game, R, "12086");
      enemyHere(game, R, PRIEST);
    });
    r = toTurn(pick(r, /^Broken Bottle/), offered(/^Use Broken Bottle/));
    r = toTurn(pick(r, /^Use Broken Bottle/));
    expect(damageOn(r, PRIEST)).toBe(2);
    expect(zoneOf(r, "12086")).toEqual(["discard"]);
  });

  it("Isabelle's Twin .45s follows its attack with a second, with agility", () => {
    let r = roland(
      (game) => {
        inPlay(game, R, "12014");
        enemyHere(game, R, PRIEST);
      },
      ["+1"],
    );
    r = toTurn(pick(r, /^Isabelle's Twin/), offered(/^Spend 1 ammo/));
    r = toTurn(pick(r, /^Spend 1 ammo/));
    expect(damageOn(r, PRIEST)).toBe(4);
    expect(cardOf(r, "12014")).toMatchObject({ uses: 4, exhausted: true });
  });
});

describe("investigation", () => {
  it("Second Sight spends a charge after a success for 1 more clue", () => {
    let r = roland((game) => {
      inPlay(game, R, "12062");
      cardRecIn(game.s, inv(game, R).location!).clues = 3;
    });
    r = toTurn(pick(r, /^Second Sight/), offered(/^Use Second Sight/));
    r = toTurn(pick(r, /^Use Second Sight/));
    expect(invStateIn(r.state, R).clues).toBe(2);
    expect(cardOf(r, "12062").uses).toBe(2);
  });

  it("Local Map investigates a connecting location and may move there", () => {
    let hall = "";
    let r = roland((game) => {
      inPlay(game, R, "12033");
      hall = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
      cardRecIn(game.s, hall).clues = 1;
    });
    r = toTurn(pick(r, /^Local Map/), offered(/^Exhaust Local Map/));
    r = toTurn(pick(r, /^Exhaust Local Map/));
    expect(invStateIn(r.state, R).clues).toBe(1);
    expect(invStateIn(r.state, R).location).toBe(hall);
  });
});

describe("evasion", () => {
  it("Through the Cracks gets +1 per clue you control", () => {
    let r = roland(
      (game) => {
        hand(game, R, "12037");
        enemyHere(game, R, PRIEST);
        invStateIn(game.s, R).clues = 2;
        invStateIn(game.s, R).resources = 5;
      },
      ["0"],
    );
    r = toTurn(pick(r, /^Play Through the Cracks/), offered(/^Disengage/));
    // agility 2 + 2 vs 4
    expect(lastResult(r).success).toBe(true);
  });

  it('"Shove off!" returns to the hand at the end of the turn after a failure', () => {
    let r = roland(
      (game) => {
        hand(game, R, "12079");
        enemyHere(game, R, PRIEST);
        invStateIn(game.s, R).resources = 5;
      },
      ["-2"],
    );
    r = toTurn(pick(r, /^Play "Shove off!"/));
    expect(zoneOf(r, "12079")).toEqual(["discard"]);
    r = toTurn(pick(r, "End turn"), (x) => zoneOf(x, "12079")[0] === "hand");
    expect(zoneOf(r, "12079")).toEqual(["hand"]);
  });

  it("Slippery: the evaded enemy does not ready in the next upkeep", () => {
    let r = roland((game) => {
      hand(game, R, "12080");
      enemyHere(game, R, ACOLYTE);
    });
    r = pick(r, /^Evade Acolyte/);
    r = pick(r, /^Commit Slippery/);
    r = toTurn(pick(r, /^Done/));
    expect(r.state.world.tables.noReady[enemyIn(r, ACOLYTE)!.id]).toBe(true);
  });
});

describe("committing", () => {
  it("Soul Link costs 1 horror to commit", () => {
    let r = roland((game) => {
      hand(game, R, "12067");
      enemyHere(game, R, PRIEST);
    });
    r = pick(r, /^Fight Ghoul Priest/);
    r = toTurn(pick(r, /^Commit Soul Link/), (x) => x.state.pending?.kind === "commit");
    expect(invStateIn(r.state, R).horror).toBe(1);
  });

  it("Timely Intervention is committed after the reveal", () => {
    let r = roland(
      (game) => {
        hand(game, R, "12081");
        enemyHere(game, R, PRIEST);
      },
      ["-1"],
    );
    r = pick(r, /^Fight Ghoul Priest/);
    // not committed before the reveal: offered again after it
    r = toTurn(pick(r, /^Done/), offered(/^Commit Timely Intervention/));
    r = toTurn(pick(r, /^Commit Timely Intervention/));
    expect(lastResult(r).success).toBe(true);
  });

  it("Scrape By succeeds by 0 instead", () => {
    let r = roland(
      (game) => {
        hand(game, R, "12082");
        enemyHere(game, R, PRIEST);
        invStateIn(game.s, R).resources = 5;
      },
      ["-3"],
    );
    r = toTurn(pick(r, /^Fight Ghoul Priest/), offered(/^Scrape By/));
    r = toTurn(pick(r, /^Scrape By/));
    expect(lastResult(r).success).toBe(true);
  });
});

describe("allies and reactions", () => {
  it("Dr. Henry Armitage: the first action of the round provokes no attack of opportunity", () => {
    let r = roland((game) => {
      inPlay(game, R, "12115");
      enemyHere(game, R, MINION);
    });
    r = toTurn(pick(r, /^Gain 1 resource/));
    expect(r.state.log.some((e) => e.type === "attack")).toBe(false);
    r = toTurn(pick(r, /^Gain 1 resource/));
    expect(r.state.log.some((e) => e.type === "attack")).toBe(true);
  });

  it("Bodyguard takes another investigator's damage and, defeated, deals 1 damage", () => {
    let r = natGame([R, "01002"], (game) => {
      inPlay(game, R, "12016");
      invStateIn(game.s, "01002").location = inv(game, R).location;
      enemyHere(game, R, PRIEST, false);
      cardRecIn(game.s, enemyIn({ state: game.s, events: [] }, PRIEST)!.id).exhausted = true;
      game.s.queue.push({
        t: STEP.AssignDamage,
        inv: "01002",
        damage: 2,
        horror: 0,
        direct: false,
        source: null,
      });
    });
    r = pick(r, "End turn");
    for (let k = 0; k < 2; k++) r = pick(r, /Bodyguard/);
    r = toTurn(r, offered(/^Bodyguard/));
    r = toTurn(pick(r, /^Bodyguard/));
    expect(invStateIn(r.state, "01002").damage).toBe(0);
    expect(zoneOf(r, "12016")).toEqual(["discard"]);
    expect(damageOn(r, PRIEST)).toBe(1);
  });

  it("Detective's Intuition, drawn during your turn, draws 2 more", () => {
    let r = roland((game) => {
      onDeck(game, R, "01088");
      onDeck(game, R, "01088");
      onDeck(game, R, "12005");
    });
    const n = invStateIn(r.state, R).hand.length;
    r = toTurn(pick(r, /^Draw 1 card/), offered(/^Detective's Intuition/));
    r = toTurn(pick(r, /^Detective's Intuition/));
    expect(invStateIn(r.state, R).hand.length).toBe(n + 3);
    expect(zoneOf(r, "12005")).toEqual(["hand"]);
  });

  it("Gather Intel draws 2 when an enemy spawns at your location", () => {
    let r = roland((game) => {
      hand(game, R, "12036");
      invStateIn(game.s, R).resources = 5;
      game.s.queue.push({ t: STEP.Spawn, enemy: createCard(game, ACOLYTE, ZONE.Limbo), inv: R });
    });
    const n = invStateIn(r.state, R).hand.length;
    r = toTurn(pick(r, "End turn"), offered(/^Gather Intel/));
    r = toTurn(pick(r, /^Gather Intel/));
    expect(invStateIn(r.state, R).hand.length).toBe(n + 1);
  });
});

describe("investigators", () => {
  it("Daniela Reyes fights back after an enemy attacks", () => {
    let r = natGame([DANIELA], (game) => enemyHere(game, DANIELA, PRIEST));
    r = toTurn(pick(r, /^Draw 1 card/), offered(/^Daniela/));
    r = pick(r, /^Daniela/);
    r = toTurn(r);
    expect(r.state.log.some((e) => e.type === "testStart" && /Fight/.test(e.text))).toBe(true);
  });

  it("Trish Scarborough has an extra action for evading", () => {
    const r = natGame([TRISH], (game) => enemyHere(game, TRISH, MINION));
    expect(invStateIn(r.state, TRISH).restrictedActions).toEqual([
      { designator: "evade", left: 1 },
    ]);
  });
});

describe("weaknesses", () => {
  it("Dead Ends cancels a search and is drawn", () => {
    let r = roland((game) => {
      hand(game, R, "12023");
      onDeck(game, R, "12006");
      invStateIn(game.s, R).resources = 5;
    });
    r = toTurn(pick(r, /^Play Right Tool for the Job/));
    expect(zoneOf(r, "12006")).toEqual(["hand"]);
    expect(r.state.log.some((e) => e.type === "searchCancelled")).toBe(true);
  });

  it("Syndicate Obligations: 1 damage after spending resources", () => {
    let r = roland((game) => {
      const id = createCard(game, "12103", ZONE.Limbo, R);
      moveCard(game, id, ZONE.Threat);
      cardRecIn(game.s, id).controller = R;
      hand(game, R, "01088");
      invStateIn(game.s, R).resources = 5;
    });
    r = toTurn(pick(r, /^Play Emergency Cache/));
    expect(invStateIn(r.state, R).damage).toBe(0); // Emergency Cache costs nothing
    r = roland((game) => {
      const id = createCard(game, "12103", ZONE.Limbo, R);
      moveCard(game, id, ZONE.Threat);
      cardRecIn(game.s, id).controller = R;
      hand(game, R, "12019");
      invStateIn(game.s, R).resources = 5;
    });
    r = toTurn(pick(r, /^Play M1911/));
    expect(invStateIn(r.state, R).damage).toBe(1);
  });

  it("The Necronomicon blocks playing assets", () => {
    const r = roland((game) => {
      const id = createCard(game, "12012", ZONE.Limbo, R);
      moveCard(game, id, ZONE.Threat);
      cardRecIn(game.s, id).controller = R;
      hand(game, R, "12019");
      invStateIn(game.s, R).resources = 5;
    });
    expect(options(r).some((o) => o.startsWith("Play M1911"))).toBe(false);
    expect(options(r).some((o) => o.startsWith("The Necronomicon"))).toBe(true);
  });

  it("The Gold Bug: -1 health and -1 sanity in the threat area", () => {
    const r = roland((game) => {
      const id = createCard(game, "12098", ZONE.Limbo, R);
      moveCard(game, id, ZONE.Threat);
      cardRecIn(game.s, id).controller = R;
    });
    const game = gOf(r);
    expect(invStateIn(game.s, R)).toBeTruthy();
    expect(options(r).some((o) => o.startsWith("The Gold Bug"))).toBe(true);
  });
});
