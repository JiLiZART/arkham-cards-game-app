/** the engine against the Arkham Grimoire (ADR-0015): one describe per rule of the rules-alignment change */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { addTempMod, card, createCard, inv, moveCard } from "./core";
import type { Ability } from "../content/schema";
import type { Result } from "./engine";
import {
  ACOLYTE,
  DAISY,
  MINION,
  NATHANIEL,
  ROLAND,
  attacks,
  enemyHere,
  enemyIn,
  game,
  hand,
  inPlay,
  nathaniel,
  neutral,
  toTurn,
} from "./natkit";

const N = NATHANIEL;

import { db, mutate, options, pick } from "./testkit";

beforeAll(async () => {
  await loadPack("investigator");
});

const offered = (name: RegExp) => (x: Result) => options(x).some((o) => name.test(o));
const dmg = (r: Result, i: string) => r.state.invs[i].damage;

describe("a failed attack on an enemy engaged with another investigator", () => {
  it("deals the enemy's damage to that investigator", () => {
    let r = game([ROLAND, DAISY], (g) => enemyHere(g, DAISY), ["-4"]);
    r = toTurn(pick(r, /^Fight/));
    expect(dmg(r, DAISY)).toBe(1);
    expect(dmg(r, ROLAND)).toBe(0);
  });
  it("is not dealt when the enemy is engaged with the attacker", () => {
    let r = game([ROLAND, DAISY], (g) => enemyHere(g, ROLAND), ["-4"]);
    r = toTurn(pick(r, /^Fight/));
    expect(dmg(r, ROLAND)).toBe(0);
    expect(dmg(r, DAISY)).toBe(0);
  });
});

describe("an unengaged aloof enemy", () => {
  const saved = db.cards[MINION].keywords;
  it("can be engaged but not fought", () => {
    db.cards[MINION].keywords = ["aloof"];
    try {
      const r = game([ROLAND], (g) => enemyHere(g, ROLAND, MINION, false));
      expect(offered(/^Engage/)(r)).toBe(true);
      expect(offered(/^Fight/)(r)).toBe(false);
    } finally {
      db.cards[MINION].keywords = saved;
    }
  });
});

describe("successful evasion", () => {
  const savedAbilities = db.cards["01020"].abilities;
  const onSuccess = (): Ability =>
    ({
      kind: "reaction",
      trigger: "successfulEvade",
      label: "Slick",
      effects: [{ op: "gainResources", amount: 1 }],
    }) as never;
  it("automatic evasion triggers 'evaded' but not 'successfully evaded'", () => {
    db.cards["01020"].abilities = [onSuccess()];
    try {
      let r = game(["01005"], (g) => {
        inPlay(g, "01005", "01020");
        inPlay(g, "01005", "01046"); // Pickpocketing: after an enemy is evaded
        hand(g, "01005", "01078"); // Cunning Distraction
        enemyHere(g, "01005", MINION);
        inv(g, "01005").resources = 9;
      });
      r = toTurn(pick(r, /^Play Cunning Distraction/), offered(/^Pickpocketing/));
      expect(offered(/^Slick/)(r)).toBe(false);
      expect(offered(/^Pickpocketing/)(r)).toBe(true);
    } finally {
      db.cards["01020"].abilities = savedAbilities;
    }
  });
  it("a tested evasion triggers both", () => {
    db.cards["01020"].abilities = [onSuccess()];
    try {
      let r = game(["01005"], (g) => {
        inPlay(g, "01005", "01020");
        enemyHere(g, "01005", MINION);
      });
      r = toTurn(pick(r, /^Evade/), offered(/^Slick/));
      expect(offered(/^Slick/)(r)).toBe(true);
    } finally {
      db.cards["01020"].abilities = savedAbilities;
    }
  });
});

describe("a helper's commit", () => {
  it("is one card; the window then offers only Done and taking it back", () => {
    let r = game([ROLAND, DAISY], (g) => {
      hand(g, DAISY, "01025");
      hand(g, DAISY, "01025"); // two Vicious Blows
      enemyHere(g, ROLAND, MINION, false);
    });
    r = pick(r, /^Fight/);
    while (r.state.pending?.kind === "commit" && r.state.pending.inv === ROLAND)
      r = pick(r, "done"); // Roland commits nothing
    expect(r.state.pending?.inv).toBe(DAISY);
    expect(r.state.pending?.kind).toBe("commit");
    r = pick(r, /^Commit Vicious Blow/);
    expect(r.state.pending?.inv).toBe(DAISY);
    expect(options(r).some((o) => /^Commit/.test(o))).toBe(false);
    expect(options(r).some((o) => /^Take back/.test(o))).toBe(true);
  });
});

describe("automatic results", () => {
  it("an auto-fail counts the skill value as 0: Rotting Remains fails by its whole difficulty", () => {
    let r = game(
      [ROLAND],
      (g) => {
        moveCard(g, createCard(g, "01163", "limbo", null), "encounterDeck", { top: true }); // the next mythos phase draws it
      },
      ["autoFail"],
    );
    r = toTurn(pick(r, "End turn"), (x) => x.state.round === 2 && x.state.pending?.kind === "turn");
    expect(r.state.invs[ROLAND].horror).toBe(3);
  });
  it("a known automatic success reveals no token and counts the difficulty as 0", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60132"); // One-Two Punch (5): automatically succeeds
      hand(g, N, "60126"); // Overpower (2): draws 2 when it succeeds by 2 or more
      enemyHere(g, N, ACOLYTE);
    });
    const draws = (x: Result) =>
      x.state.log.filter((e) => e.type === "draw" || e.type === "weakness").length;
    const before = draws(r);
    r = pick(r, /^Play One-Two Punch/);
    r = pick(r, /^Commit Overpower/);
    r = toTurn(pick(r, "done"));
    expect(r.state.log.some((e) => e.type === "token")).toBe(false);
    expect(draws(r) - before).toBe(2);
  });
});

describe("elimination and the empty deck", () => {
  it("drawing with no deck and no discard pile defeats at once, with 1 mental trauma and no horror first", () => {
    let r = game([ROLAND], (g) => {
      inv(g, ROLAND).deck = [];
      inv(g, ROLAND).discard = [];
    });
    r = pick(r, /^Draw/);
    expect(r.state.invs[ROLAND].status).toBe("defeated");
    expect(r.state.invs[ROLAND].mentalTrauma).toBe(1);
    expect(r.state.invs[ROLAND].horror).toBe(0);
  });
  it("an eliminated investigator's Cover Up resolves its 'when the game ends' ability", () => {
    let r = game([ROLAND], (g) => {
      const id = createCard(g, "01007", "limbo", ROLAND);
      moveCard(g, id, "threat");
      card(g, id).controller = ROLAND;
      card(g, id).clues = 2;
      inv(g, ROLAND).damage = 8;
      enemyHere(g, ROLAND);
    });
    r = toTurn(pick(r, "End turn"));
    expect(r.state.invs[ROLAND].status).toBe("defeated");
    expect(r.state.invs[ROLAND].physicalTrauma).toBe(1);
    expect(r.state.invs[ROLAND].mentalTrauma).toBe(1); // Cover Up, with clues left
    expect(Object.values(r.state.cards).find((c) => c.code === "01007")!.zone).toBe("removed");
  });
});

describe("unique cards, limits and victory", () => {
  it("a second copy of a unique card is not offered", () => {
    const r = nathaniel((g) => {
      inPlay(g, N, "60107"); // Grete Wagner
      hand(g, N, "60128"); // Grete Wagner (3)
      inv(g, N).resources = 9;
    });
    expect(offered(/^Play Grete Wagner/)(r)).toBe(false);
  });
  it("a unique encounter enemy entering play discards the player card with its title", () => {
    const saved = { unique: db.cards[ACOLYTE].unique, name: db.cards[ACOLYTE].name };
    db.cards[ACOLYTE].unique = true;
    db.cards[ACOLYTE].name = "Grete Wagner";
    try {
      let r = nathaniel((g) => {
        inPlay(g, N, "60107");
        moveCard(g, createCard(g, ACOLYTE, "limbo", null), "encounterDeck", { top: true });
      });
      r = toTurn(
        pick(r, "End turn"),
        (x) => x.state.round === 2 && x.state.pending?.kind === "turn",
      );
      const grete = Object.values(r.state.cards).find((c) => c.code === "60107")!;
      expect(grete.zone).toBe("discard");
    } finally {
      Object.assign(db.cards[ACOLYTE], saved);
    }
  });
  it("a card that leaves play and returns has its limit unused", () => {
    const saved = db.cards["01020"].abilities;
    db.cards["01020"].abilities = [
      {
        kind: "fast",
        label: "Once",
        limit: { per: "round", count: 1 },
        effects: [{ op: "gainResources", amount: 1 }],
      },
    ] as never;
    try {
      let r = game([ROLAND], (g) => {
        inPlay(g, ROLAND, "01020");
      });
      r = pick(r, /^Once/);
      expect(offered(/^Once/)(r)).toBe(false);
      r = mutate(r, (g) => {
        const id = Object.values(g.s.cards).find((c) => c.code === "01020")!.id;
        moveCard(g, id, "hand");
        moveCard(g, id, "play");
      });
      expect(offered(/^Once/)(r)).toBe(true);
    } finally {
      db.cards["01020"].abilities = saved;
    }
  });
  it("a resolved treachery with Victory X goes to the victory display", () => {
    db.cards["01163"].victory = 1;
    try {
      let r = game(
        [ROLAND],
        (g) => {
          moveCard(g, createCard(g, "01163", "limbo", null), "encounterDeck", { top: true });
        },
        ["0"],
      );
      r = toTurn(
        pick(r, "End turn"),
        (x) => x.state.round === 2 && x.state.pending?.kind === "turn",
      );
      expect(
        Object.values(r.state.cards).filter((c) => c.code === "01163" && c.zone === "victory")
          .length,
      ).toBe(1);
    } finally {
      delete db.cards["01163"].victory;
    }
  });
});

describe("the enemy phase, upkeep and round end follow the chart", () => {
  it("an enemy exhausts after its own attack, before the next enemy attacks", () => {
    let r = game([ROLAND], (g) => {
      inPlay(g, ROLAND, "01028"); // Beat Cop: an asset that can soak, so each attack asks who takes it
      enemyHere(g, ROLAND, MINION);
      enemyHere(g, ROLAND, ACOLYTE);
    });
    r = toTurn(pick(r, "End turn"), (x) => attacks(x) === 2 && x.state.pending?.kind === "assign");
    const exhausted = Object.values(r.state.cards).filter(
      (c) => c.zone === "enemy" && c.exhausted,
    ).length;
    expect(exhausted).toBe(1); // the first attacker; the second is attacking now
  });

  const fastCache = () => {
    db.cards["01088"].keywords = ["fast"];
    db.cards["01088"].abilities = [
      { kind: "onPlay", anyWindow: true, effects: [{ op: "gainResources", amount: 1 }] },
    ];
  };
  const savedCache = {
    abilities: db.cards["01088"].abilities,
    keywords: db.cards["01088"].keywords,
  };
  it("the upkeep player window comes before cards ready", () => {
    fastCache();
    try {
      let r = game([ROLAND], (g) => {
        card(g, inPlay(g, ROLAND, "01020")).exhausted = true; // Machete
        hand(g, ROLAND, "01088");
      });
      r = toTurn(
        pick(r, "End turn"),
        (x) => x.state.phase === "upkeep" && x.state.pending?.promptKey === "playerWindow",
      );
      expect(r.state.pending?.promptKey).toBe("playerWindow");
      const machete = () =>
        Object.values(r.state.cards).find((c) => c.code === "01020" && c.zone === "play")!;
      expect(machete().exhausted).toBe(true);
      r = toTurn(pick(r, "pass"));
      expect(machete().exhausted).toBe(false);
    } finally {
      Object.assign(db.cards["01088"], savedCache);
    }
  });

  it("'until the end of the round' effects expire before the round-end window", () => {
    const saved = db.cards["01020"].abilities;
    db.cards["01020"].abilities = [
      {
        kind: "reaction",
        trigger: "roundEnds",
        label: "Slick",
        effects: [{ op: "gainResources", amount: 1 }],
      },
    ] as never;
    try {
      let r = game([ROLAND], (g) => {
        inPlay(g, ROLAND, "01020");
        addTempMod(g, { flag: "nonEliteCannotAttack" }, ROLAND, "round");
      });
      r = toTurn(pick(r, "End turn"), offered(/^Slick/));
      expect(offered(/^Slick/)(r)).toBe(true);
      expect(r.state.tempMods.filter((m) => m.until === "round")).toEqual([]);
    } finally {
      db.cards["01020"].abilities = saved;
    }
  });
});

describe("advancing the act in a player window", () => {
  it("is offered when the group holds the clues, in the enemy phase too", () => {
    let r = game([ROLAND], (g) => {
      inv(g, ROLAND).clues = 2;
    });
    r = toTurn(
      pick(r, "End turn"),
      (x) => x.state.phase === "enemy" && x.state.pending?.promptKey === "playerWindow",
    );
    expect(r.state.phase).toBe("enemy");
    expect(offered(/^Advance act/)(r)).toBe(true);
    const act = r.state.act;
    r = pick(r, /^Advance act/);
    expect(r.state.act).not.toBe(act);
    expect(r.state.invs[ROLAND].clues).toBe(0);
  });
  it("is not offered without the clues", () => {
    let r = game([ROLAND]);
    r = pick(r, "End turn");
    for (let k = 0; k < 100 && r.state.pending && r.state.pending.kind !== "turn"; k++) {
      expect(offered(/^Advance act/)(r)).toBe(false);
      r = neutral(r);
    }
  });
});

void card;
void createCard;
void moveCard;
void neutral;
void attacks;
void enemyIn;
void ACOLYTE;
