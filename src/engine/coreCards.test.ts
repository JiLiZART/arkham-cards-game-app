import { describe, expect, it } from "vitest";
import { card, createCard, inv, type G } from "./core";
import type { Result } from "./engine";
import {
  ACOLYTE,
  DAISY,
  HALLWAY,
  MINION,
  PRIEST,
  ROLAND,
  STUDY,
  addLocation,
  enemyHere,
  enemyIn,
  game,
  hand,
  inPlay,
  toTurn,
  zoneOf,
} from "./natkit";
import { gOf, options, pick } from "./testkit";

const R = ROLAND;
const roland = (prep: (g: G) => void = () => {}, bag?: string[]) => game([R], prep, bag);
const lastResult = (r: Result) =>
  r.state.log.filter((e) => e.type === "testResult").at(-1)!.data as {
    value: number;
    tokens: string[];
    success: boolean;
  };
const damageOn = (r: Result, code: string) => enemyIn(r, code)?.damage;

describe("Guardian", () => {
  it("Extra Ammunition puts 3 ammo on a Firearm", () => {
    let id = "";
    let r = roland((g) => {
      id = inPlay(g, R, "01016");
      hand(g, R, "01026");
    });
    r = toTurn(pick(r, /^Play Extra Ammunition/));
    expect(card(gOf(r), id).uses).toBe(7);
  });

  it("Police Badge gives +1 willpower and, discarded, 2 more actions", () => {
    let r = roland((g) => inPlay(g, R, "01027"));
    const before = r.state.invs[R].actionsLeft;
    r = pick(r, /^Police Badge/);
    expect(r.state.invs[R].actionsLeft).toBe(before + 2);
    expect(zoneOf(r, "01027")).toEqual(["discard"]);
  });

  it("Beat Cop (2) takes a damage to deal 1 damage, and stays", () => {
    let r = roland((g) => {
      inPlay(g, R, "01028");
      enemyHere(g, R, MINION);
    });
    r = toTurn(pick(r, /^Beat Cop/));
    expect(damageOn(r, MINION)).toBe(1);
    const cop = Object.values(r.state.cards).find((c) => c.code === "01028")!;
    expect(cop).toMatchObject({ zone: "play", damage: 1, exhausted: true });
  });

  it("Shotgun deals 1 damage per point it succeeds by, at most 5", () => {
    let r = roland((g) => {
      inPlay(g, R, "01029");
      enemyHere(g, R, PRIEST);
    });
    r = toTurn(pick(r, /^Shotgun/));
    // combat 4 + 3 vs fight 4: succeeds by 3
    expect(damageOn(r, PRIEST)).toBe(3);
  });
});

describe("Seeker", () => {
  it("Magnifying Glass returns to the hand when the location has no clues", () => {
    let r = roland((g) => {
      inPlay(g, R, "01040");
      card(g, inv(g, R).location!).clues = 0;
    });
    r = pick(r, /^Magnifying Glass/);
    expect(zoneOf(r, "01040")).toEqual(["hand"]);
  });

  it("Disc of Itzamna discards a non-Elite enemy spawning at your location", () => {
    let r = roland((g) => {
      inPlay(g, R, "01041");
      const id = createCard(g, ACOLYTE, "limbo");
      g.s.queue.push({ t: "Spawn", enemy: id, inv: R });
    });
    // the spawn resolves once the turn ends
    r = toTurn(pick(r, "End turn"), (x) => options(x).some((o) => o.startsWith("Disc of Itzamna")));
    r = toTurn(pick(r, /^Disc of Itzamna/));
    expect(zoneOf(r, ACOLYTE)).toEqual(["encounterDiscard"]);
    expect(zoneOf(r, "01041")).toEqual(["discard"]);
  });

  it("Encyclopedia gives an investigator at your location +2 to a skill for the phase", () => {
    let r = roland((g) => inPlay(g, R, "01042"));
    r = pick(pick(r, /^Encyclopedia/), "+2 agility");
    const g = gOf(r);
    expect(g.s.tempMods.some((t) => t.target === R && t.mod.stat === "agility")).toBe(true);
  });

  it("Cryptic Research: the chosen investigator draws 3", () => {
    let r = game([R, DAISY], (g) => {
      hand(g, R, "01043");
      inv(g, DAISY).location = inv(g, R).location;
    });
    const n = r.state.invs[DAISY].hand.length;
    r = pick(pick(r, /^Play Cryptic Research/), "Daisy Walker");
    expect(r.state.invs[DAISY].hand.length).toBe(n + 3);
  });
});

describe("Rogue", () => {
  it("Leo De Luca gives an action at once and one each turn", () => {
    let r = roland((g) => {
      hand(g, R, "01054");
      inv(g, R).resources = 6;
    });
    const before = r.state.invs[R].actionsLeft;
    r = pick(r, /^Play Leo De Luca/);
    expect(r.state.invs[R].actionsLeft).toBe(before);
  });

  it("Cat Burglar disengages and moves without an attack of opportunity", () => {
    let r = roland((g) => {
      inPlay(g, R, "01055");
      enemyHere(g, R, MINION);
      addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
    });
    r = toTurn(pick(r, /^Cat Burglar/));
    expect(r.state.log.some((e) => e.type === "attack")).toBe(false);
    expect(card(gOf(r), r.state.invs[R].location!).code).toBe(HALLWAY);
    expect(enemyIn(r, MINION)!.engagedWith).toBe(null);
  });

  it("Sure Gamble turns the -2 into +2", () => {
    let r = roland(
      (g) => {
        hand(g, R, "01056");
        enemyHere(g, R, PRIEST);
      },
      ["-2"],
    );
    r = toTurn(pick(r, /^Fight Ghoul Priest/), (x) =>
      options(x).some((o) => o.startsWith("Sure Gamble")),
    );
    r = toTurn(pick(r, /^Sure Gamble/));
    // combat 4 + 2 vs 4
    expect(lastResult(r).success).toBe(true);
  });

  it("Hot Streak gains 10 resources", () => {
    let r = roland((g) => {
      hand(g, R, "01057");
      inv(g, R).resources = 5;
    });
    r = pick(r, /^Play Hot Streak/);
    expect(r.state.invs[R].resources).toBe(12); // 5 - 3 + 10
  });
});

describe("Mystic", () => {
  it("Blinding Light evades with willpower and deals 2 damage", () => {
    let r = roland(
      (g) => {
        hand(g, R, "01069");
        enemyHere(g, R, PRIEST);
        inv(g, R).resources = 5;
      },
      ["+1"],
    );
    r = toTurn(pick(r, /^Play Blinding Light/));
    expect(damageOn(r, PRIEST)).toBe(2);
    expect(enemyIn(r, PRIEST)!.exhausted).toBe(true);
  });

  it("Mind Wipe blanks a non-Elite enemy for the phase", () => {
    let r = roland((g) => {
      hand(g, R, "01068");
      enemyHere(g, R, MINION);
      inv(g, R).resources = 5;
    });
    r = toTurn(pick(r, "End turn"), (x) => options(x).some((o) => o.startsWith("Mind Wipe")));
    r = pick(r, /^Mind Wipe/);
    const minion = enemyIn(r, MINION)!.id;
    expect(r.state.log.some((e) => e.type === "blank" && e.card === minion)).toBe(true);
  });

  it("Book of Shadows adds a charge to a Spell", () => {
    let id = "";
    let r = roland((g) => {
      inPlay(g, R, "01070");
      id = inPlay(g, R, "01060");
    });
    r = toTurn(pick(r, /^Book of Shadows/));
    expect(card(gOf(r), id).uses).toBe(5);
  });

  it("Grotesque Statue reveals 2 tokens and resolves the one chosen", () => {
    let r = roland(
      (g) => {
        inPlay(g, R, "01071");
        enemyHere(g, R, PRIEST);
        g.s.chaosBag = ["-4", "+1"];
      },
      ["-4", "+1"],
    );
    r = toTurn(pick(r, /^Fight Ghoul Priest/), (x) =>
      options(x).some((o) => o.startsWith("Grotesque Statue")),
    );
    r = pick(r, /^Grotesque Statue/);
    r = pick(r, "Resolve +1");
    r = toTurn(r);
    expect(lastResult(r).tokens).toEqual(["+1"]);
    expect(r.state.chaosBag.sort()).toEqual(["+1", "-4"]);
    expect(Object.values(r.state.cards).find((c) => c.code === "01071")!.uses).toBe(3);
  });
});

describe("Survivor", () => {
  it("Aquinnah sends the attack's damage to another enemy", () => {
    let r = roland((g) => {
      inPlay(g, R, "01082");
      enemyHere(g, R, MINION);
      enemyHere(g, R, PRIEST, false);
      card(g, enemyIn({ state: g.s, events: [] }, PRIEST)!.id).exhausted = true;
    });
    // the Ghoul Minion's attack of opportunity on drawing
    r = toTurn(pick(r, /^Draw/), (x) => options(x).some((o) => o.startsWith("Aquinnah")));
    r = toTurn(pick(r, /^Aquinnah/));
    expect(damageOn(r, PRIEST)).toBe(1);
    expect(r.state.invs[R].damage).toBe(0);
    expect(r.state.invs[R].horror).toBe(1);
  });

  it("Close Call shuffles the evaded enemy into the encounter deck", () => {
    let r = roland((g) => {
      hand(g, R, "01083");
      enemyHere(g, R, ACOLYTE);
      inv(g, R).resources = 5;
    });
    r = toTurn(pick(r, /^Evade Acolyte/), (x) =>
      options(x).some((o) => o.startsWith("Close Call")),
    );
    r = toTurn(pick(r, /^Close Call/));
    expect(zoneOf(r, ACOLYTE)).toContain("encounterDeck");
  });

  it("Lucky! (2) adds 2 and draws a card", () => {
    let r = roland(
      (g) => {
        hand(g, R, "01084");
        enemyHere(g, R, PRIEST);
      },
      ["-1"],
    );
    const n = r.state.invs[R].hand.length;
    r = toTurn(pick(r, /^Fight Ghoul Priest/), (x) =>
      options(x).some((o) => o.startsWith("Lucky")),
    );
    r = toTurn(pick(r, /^Lucky/));
    expect(lastResult(r).success).toBe(true);
    expect(r.state.invs[R].hand.length).toBe(n);
  });

  it("Will to Survive: no chaos token for the rest of the turn", () => {
    let r = roland(
      (g) => {
        hand(g, R, "01085");
        enemyHere(g, R, PRIEST);
        inv(g, R).resources = 5;
      },
      ["autoFail"],
    );
    r = pick(r, /^Play Will to Survive/);
    r = toTurn(pick(r, /^Fight Ghoul Priest/));
    expect(lastResult(r)).toMatchObject({ tokens: [], success: true });
  });
});
