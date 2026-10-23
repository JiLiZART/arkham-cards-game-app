import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { createCard, inv, moveCard } from "./core";
import type { Ability } from "../content/schema";
import type { Result } from "./engine";
import { toTurn } from "./natkit";
import { checkCondition } from "./core";
import {
  db,
  giveCard,
  gOf,
  mutate,
  options,
  pick,
  putEnemy,
  skipMulligans,
  start,
} from "./testkit";

const ROLAND = "01001";
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, 1 damage, 1 horror

beforeAll(async () => {
  await loadPack("nat");
});

/** Roland (plus whoever) at the start of a turn, a token bag of zeros, with `setup` applied to the state */
function turn(
  setup: (g: ReturnType<typeof gOf>) => void = () => {},
  invs = [ROLAND],
  bag = ["0"],
): Result {
  const r = toTurn(skipMulligans(start("the-gathering", invs, 1, { chaosBag: bag as never })));
  return mutate(r, (g) => {
    setup(g);
  });
}

const attacksSoFar = (r: Result) => r.state.log.filter((e) => e.type === "attack").length;

describe("an event's designator", () => {
  it("a Fight event provokes no attack of opportunity; Draw still does", () => {
    const set = (g: ReturnType<typeof gOf>) => {
      giveCard(g, ROLAND, "01051"); // Backstab
      putEnemy(g, MINION, inv(g, ROLAND).location!, ROLAND);
    };
    const fight = pick(turn(set), /^Play Backstab/);
    expect(attacksSoFar(fight)).toBe(0);
    expect(fight.state.skillTest?.kind).toBe("fight");
    const draw = pick(turn(set), /^Draw/);
    expect(attacksSoFar(draw)).toBe(1);
  });

  it("firstAction holds before the first action of a turn and not after", () => {
    let r = turn();
    const holds = (x: Result) => checkFirst(x);
    expect(holds(r)).toBe(true);
    r = pick(r, /^Gain 1 resource|^Take resource/i);
    expect(holds(r)).toBe(false);
  });
});

function checkFirst(r: Result) {
  return checkCondition(gOf(r), { firstAction: true }, { you: ROLAND });
}

describe("player windows", () => {
  const CACHE = "01088"; // Emergency Cache, here standing in for a fast "any window" event
  const saved = { abilities: db.cards[CACHE].abilities, keywords: db.cards[CACHE].keywords };
  afterEach(() => Object.assign(db.cards[CACHE], saved));
  const fastCache = () => {
    db.cards[CACHE].keywords = ["fast"];
    db.cards[CACHE].abilities = [
      { kind: "onPlay", anyWindow: true, effects: [{ op: "gainResources", amount: 3 }] },
    ];
  };
  const windows = (r: Result) => r.state.pending?.promptKey === "playerWindow";

  it("a round with no such card asks nothing new", () => {
    let r = turn();
    r = pick(r, "End turn");
    for (let k = 0; k < 120 && r.state.pending && r.state.pending.kind !== "turn"; k++) {
      expect(windows(r)).toBe(false);
      const p = r.state.pending;
      r = pick(
        r,
        p.options.some((o) => o.id === "pass")
          ? "pass"
          : /^Done/.test(p.options[0].label) || p.kind === "commit"
            ? /^Done/
            : /./,
      );
    }
    expect(r.state.round).toBeGreaterThan(1);
  });

  it("a fast any-window event is offered when the enemy phase begins, and played", () => {
    fastCache();
    let r = turn((g) => {
      giveCard(g, ROLAND, CACHE);
    });
    const before = r.state.invs[ROLAND].resources;
    // the window of the turn's beginning has passed; end the turn: the enemy phase's window is next
    r = pick(r, "End turn");
    for (let k = 0; k < 40 && !windows(r); k++)
      r = pick(r, r.state.pending!.options.some((o) => o.id === "pass") ? "pass" : /./);
    expect(windows(r)).toBe(true);
    expect(options(r)).toContain("Emergency Cache (play)");
    expect(r.state.pending?.step).toMatchObject({
      trigger: "playerWindow",
      data: { phase: "enemy" },
    });
    r = pick(r, /^Emergency Cache/);
    expect(r.state.invs[ROLAND].resources).toBe(before + 3);
    expect(
      r.state.cards[
        Object.keys(r.state.cards).find(
          (id) => r.state.cards[id].code === CACHE && r.state.cards[id].zone === "discard",
        )!
      ],
    ).toBeTruthy();
  });

  it("is not offered a card it cannot pay for", () => {
    fastCache();
    db.cards[CACHE].cost = 9;
    try {
      let r = turn((g) => giveCard(g, ROLAND, CACHE));
      r = pick(r, "End turn");
      for (let k = 0; k < 120 && r.state.pending && r.state.pending.kind !== "turn"; k++) {
        expect(windows(r)).toBe(false);
        const p = r.state.pending;
        r = pick(
          r,
          p.options.some((o) => o.id === "pass")
            ? "pass"
            : /^Done/.test(p.options[0].label) || p.kind === "commit"
              ? /^Done/
              : /./,
        );
      }
    } finally {
      db.cards[CACHE].cost = 0;
    }
  });
});

describe("the window before an enemy takes damage", () => {
  const MACHETE = "01020";
  const PRIEST = "01116"; // Ghoul Priest: fight 4, health 5
  const savedM = db.cards[MACHETE].abilities;
  const savedMinion = db.cards[MINION].abilities;
  afterEach(() => {
    db.cards[MACHETE].abilities = savedM;
    db.cards[MINION].abilities = savedMinion;
  });
  /** the Machete in play, its own abilities replaced by `abs` */
  const withMachete = (abs: Ability[], enemy = MINION) => {
    db.cards[MACHETE].abilities = abs;
    return turn((g) => {
      moveCard(g, createCard(g, MACHETE, "limbo", ROLAND), "play");
      putEnemy(g, enemy, inv(g, ROLAND).location!, ROLAND);
    });
  };
  const react = (
    trigger: string,
    effects: Ability["effects"],
    extra: Partial<Ability> = {},
  ): Ability =>
    ({
      kind: "reaction",
      trigger,
      usableBy: "controller",
      label: "Ward",
      effects,
      ...extra,
    }) as never;
  const fight = (r: Result) => {
    r = pick(r, /^Fight/);
    return r.state.pending?.kind === "commit" ? pick(r, "done") : r;
  };
  const enemyDamage = (r: Result) =>
    Object.values(r.state.cards).find((c) => c.zone === "enemy")!.damage;

  it("asks nothing when no card answers it", () => {
    const r = fight(withMachete([]));
    expect(r.state.pending?.kind).not.toBe("reaction");
    expect(enemyDamage(r)).toBe(1);
  });

  it("an effect in the window adds to the damage", () => {
    let r = fight(withMachete([react("dealDamage", [{ op: "addDamage", amount: 2 }])], PRIEST));
    expect(r.state.pending?.kind).toBe("reaction");
    expect(r.state.pending?.step).toMatchObject({ trigger: "dealDamage", data: { amount: 1 } });
    r = pick(r, "Ward");
    expect(enemyDamage(r)).toBe(3);
  });

  it("the cap of 1 applies after the additions", () => {
    db.cards[PRIEST].abilities = [
      { kind: "constant", modifiers: [{ flag: "damageCapOne", scope: "self" }] },
    ];
    try {
      const r = pick(
        fight(withMachete([react("dealDamage", [{ op: "addDamage", amount: 2 }])], PRIEST)),
        "Ward",
      );
      expect(enemyDamage(r)).toBe(1);
    } finally {
      db.cards[PRIEST].abilities = [];
    }
  });

  it("damage past the enemy's health opens the excess window", () => {
    let r = fight(
      withMachete([
        react("excessDamage", [{ op: "gainResources", amount: 1 }]),
        react("dealDamage", [{ op: "addDamage", amount: 3 }]),
      ]),
    );
    r = pick(r, "Ward"); // dealDamage first: 1 + 3 on a Minion with 2 health
    expect(r.state.pending?.step).toMatchObject({ trigger: "excessDamage", data: { amount: 2 } });
    const before = r.state.invs[ROLAND].resources;
    r = pick(r, "Ward");
    expect(r.state.invs[ROLAND].resources).toBe(before + 1);
    expect(Object.values(r.state.cards).some((c) => c.code === MINION && c.zone === "enemy")).toBe(
      false,
    );
  });

  it("counts the printed health of the enemies defeated this turn", () => {
    const r = fight(withMachete([react("dealDamage", [{ op: "addDamage", amount: 1 }])]));
    const done = pick(r, "Ward");
    expect(done.state.invs[ROLAND].defeatedHealth).toBe(2);
  });

  it("the attacked window opens after a cancelled attack", () => {
    db.cards[MACHETE].abilities = [react("enemyAttacked", [{ op: "gainResources", amount: 1 }])];
    let r = turn((g) => {
      moveCard(g, createCard(g, MACHETE, "limbo", ROLAND), "play");
      putEnemy(g, MINION, inv(g, ROLAND).location!, ROLAND);
      giveCard(g, ROLAND, "01023"); // Dodge
    });
    r = pick(r, "End turn");
    for (let k = 0; k < 40 && r.state.pending && !options(r).some((o) => /^Dodge/.test(o)); k++)
      r = pick(r, r.state.pending.options.some((o) => o.id === "pass") ? "pass" : /./);
    r = pick(r, /^Dodge/);
    expect(r.state.pending?.step).toMatchObject({ trigger: "enemyAttacked" });
    expect(options(r)).toContain("Ward");
  });
});
