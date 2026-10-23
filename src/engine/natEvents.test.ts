import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { card, inv, type G } from "./core";
import type { Result } from "./engine";
import {
  ACOLYTE,
  ATTIC,
  DAISY,
  HALLWAY,
  MINION,
  NATHANIEL,
  PRIEST,
  ROLAND,
  STUDY,
  addLocation,
  attacks,
  enemyHere,
  enemyIn,
  game,
  hand,
  inPlay,
  nathaniel,
  toTurn,
} from "./natkit";
import { gOf, locId, options, pick, putEnemy } from "./testkit";

beforeAll(async () => {
  await loadPack("nat");
});

const N = NATHANIEL;
const res = (r: Result, i = N) => r.state.invs[i].resources;
/** the Nathaniel reaction window is passed, everything else neutral, until it is a turn again */
const finish = (r: Result) => toTurn(r);
const offered = (name: RegExp) => (x: Result) => options(x).some((o) => name.test(o));

describe("Clean Them Out", () => {
  it("gains 2 resources as the action begins, then fights, with no attack of opportunity", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60111");
      enemyHere(g, N);
      inv(g, N).resources = 0;
    });
    r = pick(r, /^Play Clean Them Out/);
    expect(res(r)).toBe(2);
    expect(r.state.skillTest?.kind).toBe("fight");
    expect(attacks(r)).toBe(0);
  });
  it("is not offered with no enemy at the location", () => {
    const r = nathaniel((g) => hand(g, N, "60111"));
    expect(options(r).some((o) => /Clean Them Out/.test(o))).toBe(false);
  });
});

describe("Monster Slayer", () => {
  it("deals +1 damage; with Nathaniel's reaction a Priest takes 3", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60116");
      enemyHere(g, N, PRIEST);
    });
    r = pick(r, /^Play Monster Slayer/);
    r = toTurn(
      r,
      (x) =>
        x.state.pending?.step.t === "Window" &&
        (x.state.pending.step as { trigger?: string }).trigger === "dealDamage",
    );
    expect((r.state.pending?.step as { data: { amount: number } }).data.amount).toBe(2); // 1 + 1
    r = pick(r, /^Nathaniel Cho/);
    r = finish(r);
    expect(enemyIn(r, PRIEST)!.damage).toBe(3);
  });
});

describe("Glory", () => {
  it("draws 2 cards after an enemy is defeated", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60115");
      enemyHere(g, N, ACOLYTE);
      inv(g, N).resources = 3;
    });
    const draws = (x: Result) =>
      x.state.log.filter((e) => e.type === "draw" || e.type === "weakness").length;
    const before = draws(r);
    r = pick(r, /^Fight/);
    r = toTurn(
      r,
      (x) =>
        x.state.pending?.step.t === "Window" &&
        (x.state.pending.step as { trigger?: string }).trigger === "enemyDefeated" &&
        options(x).some((o) => /Glory/.test(o)),
    );
    r = pick(r, /^Glory/);
    expect(draws(r) - before).toBe(2);
  });
});

describe("Counterpunch", () => {
  const endTurnIntoAttack = (r: Result, name: RegExp) => toTurn(pick(r, "End turn"), offered(name));
  it("(0) fights the attacker after its attack, even a cancelled one", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60112");
      hand(g, N, "01023"); // Dodge
      enemyHere(g, N);
    });
    r = endTurnIntoAttack(r, /^Dodge/);
    r = pick(r, /^Dodge/);
    expect(attacks(r)).toBe(0);
    r = toTurn(r, offered(/^Counterpunch/));
    r = pick(r, /^Counterpunch/);
    r = finish(r);
    expect(enemyIn(r, MINION)!.damage).toBe(1);
  });
  it("(2) fights the attacker before its attack with +2 combat and +1 damage, defeating it", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60122");
      enemyHere(g, N);
    });
    r = endTurnIntoAttack(r, /^Counterpunch/);
    r = pick(r, /^Counterpunch/);
    r = finish(r);
    expect(enemyIn(r, MINION)).toBeUndefined();
    expect(attacks(r)).toBe(0);
  });
});

describe('"Get over here!"', () => {
  const far = (g: G, code: string, at: string) => putEnemy(g, code, locId(g, at), null);
  it("(0) pulls a non-Elite enemy from a connecting location, engages it and fights it", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60114");
      addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
      far(g, MINION, HALLWAY);
    });
    r = pick(r, /^Play .Get over here/);
    const e = enemyIn(r, MINION)!;
    expect(e.location).toBe(r.state.invs[N].location);
    expect(r.state.skillTest?.kind).toBe("fight");
    expect(attacks(r)).toBe(0);
    expect(e.engagedWith).toBe(N);
  });
  it("(0) is not offered for an Elite enemy, or one two locations away", () => {
    const r = nathaniel((g) => {
      hand(g, N, "60114");
      addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
      addLocation(g, ATTIC, [[HALLWAY, ATTIC]]);
      far(g, PRIEST, HALLWAY);
      far(g, MINION, ATTIC);
    });
    expect(options(r).some((o) => /Get over here/.test(o))).toBe(false);
  });
  it("(2) reaches two locations away, as a fast event", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60123");
      addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
      addLocation(g, ATTIC, [[HALLWAY, ATTIC]]);
      far(g, MINION, ATTIC);
    });
    r = pick(r, /^Play .Get over here.*\(fast\)/);
    expect(enemyIn(r, MINION)!.engagedWith).toBe(N);
    expect(r.state.invs[N].actionsLeft).toBe(3);
  });
});

describe("One-Two Punch", () => {
  const punch = (code: string) => {
    let r = nathaniel(
      (g) => {
        hand(g, N, code);
        enemyHere(g, N, PRIEST);
      },
      [],
      ["0", "0", "0", "0"],
    );
    r = pick(r, /^Play One-Two Punch/);
    return toTurn(r, offered(/^Fight that enemy again/));
  };
  it("(0) may fight again at +2 combat for +1 damage", () => {
    let r = punch("60117");
    expect(options(r)).toEqual(["Fight that enemy again", "Stop"]);
    r = finish(pick(r, /^Fight that enemy again/));
    expect(enemyIn(r, PRIEST)!.damage).toBe(1 + 2);
  });
  it("(0) may stop after the first attack", () => {
    const r = finish(pick(punch("60117"), "Stop"));
    expect(enemyIn(r, PRIEST)!.damage).toBe(1);
  });
  it("(5) succeeds automatically for +1 damage, then again for +2", () => {
    const r = finish(pick(punch("60132"), /^Fight that enemy again/));
    expect(enemyIn(r, PRIEST)).toBeUndefined(); // 2 + 3 = the Priest's 5 health
  });
});

describe("Stand Together", () => {
  it("gives 2 resources to the player and to the other investigator at the location, nobody else", () => {
    let r = game([N, DAISY, ROLAND], (g) => {
      hand(g, N, "60118");
      inv(g, ROLAND).location = null; // elsewhere
    });
    const before = [N, DAISY, ROLAND].map((i) => res(r, i));
    r = pick(r, /^Play Stand Together/);
    expect([N, DAISY, ROLAND].map((i) => res(r, i))).toEqual([
      before[0] + 2,
      before[1] + 2,
      before[2],
    ]);
  });
});

describe("Evidence! (1)", () => {
  const fightFor = (healthBefore: number) => {
    let r = nathaniel((g) => {
      hand(g, N, "60120");
      enemyHere(g, N, ACOLYTE);
      inv(g, N).defeatedHealth = healthBefore;
    });
    const clues = card(gOf(r), inv(gOf(r), N).location!).clues;
    r = toTurn(pick(r, /^Fight/), offered(/^Evidence!/));
    r = pick(r, /^Evidence!/);
    return { r, taken: inv(gOf(r), N).clues, clues };
  };
  it("discovers 1 clue", () => {
    expect(fightFor(0).taken).toBe(1);
  });
  it("discovers 2 clues when the enemies defeated this turn had 4 or more printed health", () => {
    expect(fightFor(3).taken).toBe(2);
  });
});

describe("Galvanize", () => {
  it("readies a Guardian asset and gives an extra action that can only fight", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60121");
      card(g, inPlay(g, N, "60105")).exhausted = true; // Boxing Gloves
      enemyHere(g, N, MINION, false);
    });
    r = pick(r, /^Play Galvanize/);
    expect(Object.values(r.state.cards).find((c) => c.code === "60105")!.exhausted).toBe(false);
    for (let k = 0; k < 3; k++) r = pick(r, /^Gain 1 resource/);
    expect(r.state.invs[N].actionsLeft).toBe(0);
    expect(options(r).some((o) => /^Fight/.test(o))).toBe(true);
    expect(options(r).some((o) => /^Gain 1 resource|^Draw/.test(o))).toBe(false);
  });
});

describe("Lesson Learned", () => {
  it("discovers 2 clues after damage from an enemy attack", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60124");
      enemyHere(g, N);
    });
    r = toTurn(pick(r, "End turn"), offered(/^Lesson Learned/));
    const clues = r.state.invs[N].clues;
    r = pick(r, /^Lesson Learned/);
    expect(r.state.invs[N].clues).toBe(clues + 2);
  });
});

describe("Mano a Mano", () => {
  it("deals 2 damage to an engaged enemy as the first action, with no attack of opportunity", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60125");
      enemyHere(g, N);
    });
    r = finish(pick(r, /^Play Mano a Mano/));
    expect(attacks(r)).toBe(0);
    expect(enemyIn(r, MINION)).toBeUndefined();
  });
  it("is not offered after another action", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60125");
      enemyHere(g, N);
    });
    r = toTurn(pick(r, /^Gain 1 resource/));
    expect(options(r).some((o) => /Mano a Mano/.test(o))).toBe(false);
  });
});

describe("Taunt (3)", () => {
  it("engages enemies one at a time, each taking 1 damage and drawing a card", () => {
    let r = game([N, DAISY], (g) => {
      hand(g, N, "60130");
      const a = enemyHere(g, DAISY);
      const b = enemyHere(g, DAISY);
      void a;
      void b;
      inv(g, N).resources = 5;
    });
    const draws = (x: Result) =>
      x.state.log.filter((e) => e.type === "draw" || e.type === "weakness").length;
    const before = draws(r);
    r = pick(r, /^Play Taunt/);
    r = pick(r, /^Ghoul Minion/);
    r = toTurn(r, offered(/^Ghoul Minion|^Done/));
    r = pick(r, /^Ghoul Minion/);
    r = toTurn(r);
    const minions = Object.values(r.state.cards).filter(
      (c) => c.code === MINION && c.zone === "enemy",
    );
    expect(minions.map((m) => m.engagedWith)).toEqual([N, N]);
    expect(minions.map((m) => m.damage)).toEqual([1, 1]);
    expect(draws(r) - before).toBe(2);
  });
  it("is offered in the enemy phase's player window, and the enemies then attack its player", () => {
    let r = game([N, DAISY], (g) => {
      hand(g, N, "60130");
      enemyHere(g, DAISY);
      enemyHere(g, DAISY);
    });
    r = toTurn(pick(r, "End turn"));
    r = toTurn(
      pick(r, "End turn"),
      (x) => x.state.phase === "enemy" && x.state.pending?.promptKey === "playerWindow",
    );
    expect(r.state.phase).toBe("enemy");
    expect(r.state.pending?.promptKey).toBe("playerWindow");
    r = pick(r, /^Taunt/);
    r = toTurn(r, offered(/^Ghoul Minion/));
    r = pick(r, /^Ghoul Minion/);
    r = toTurn(r, offered(/^Ghoul Minion|^Done/));
    r = pick(r, /^Ghoul Minion/);
    r = finish(r);
    const hits = r.state.log.filter((e) => e.type === "attack");
    expect(hits.length).toBe(2);
    expect(hits.every((e) => e.inv === N)).toBe(true);
  });
});

describe("Dynamite Blast (3)", () => {
  it("plays as a fast event using the core blast", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60129");
      enemyHere(g, N, MINION, false);
    });
    r = pick(r, /^Play Dynamite Blast.*\(fast\)/);
    r = pick(r, /Study/);
    r = finish(r);
    expect(enemyIn(r, MINION)).toBeUndefined();
    expect(r.state.invs[N].damage).toBe(3);
  });
});
