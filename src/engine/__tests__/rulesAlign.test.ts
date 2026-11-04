/** the engine against the Arkham Grimoire (ADR-0015): one describe per rule of the rules-alignment change */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { addTempMod } from "../queries";
import { card } from "../context";
import { createCard, moveCard } from "../movement";
import type { Ability } from "../../content/schema";
import type { Result } from "../index";
import {
  ACOLYTE,
  DAISY,
  MINION,
  NATHANIEL,
  ROLAND,
  attacks,
  enemyIn,
  nathaniel,
} from "../kits/natkit";
import {
  addLocation,
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  neutral,
  offered,
  toTurn,
} from "../kits/driver";
import { STEP } from "../steps/step";

const N = NATHANIEL;

import { db, mutate, options, pick } from "../kits/testkit";
import { allCardRecsIn, cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";

beforeAll(async () => {
  await loadPack("nat");
});

const dmg = (r: Result, i: string) => invStateIn(r.state, i).damage;

describe("a failed attack on an enemy engaged with another investigator", () => {
  it("deals the enemy's damage to that investigator", () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (game) => enemyHere(game, DAISY),
      bag: ["-4"],
    });
    r = toTurn(pick(r, /^Fight/));
    expect(dmg(r, DAISY)).toBe(1);
    expect(dmg(r, ROLAND)).toBe(0);
  });
  it("is not dealt when the enemy is engaged with the attacker", () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (game) => enemyHere(game, ROLAND),
      bag: ["-4"],
    });
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
      const r = game({
        investigators: [ROLAND],
        prep: (game) => enemyHere(game, ROLAND, MINION, false),
        bag: ["0"],
      });
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
      let r = game({
        investigators: ["01005"],
        prep: (game) => {
          inPlay(game, "01005", "01020");
          inPlay(game, "01005", "01046"); // Pickpocketing: after an enemy is evaded
          hand(game, "01005", "01078"); // Cunning Distraction
          enemyHere(game, "01005", MINION);
          invStateIn(game.s, "01005").resources = 9;
        },
        bag: ["0"],
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
      let r = game({
        investigators: ["01005"],
        prep: (game) => {
          inPlay(game, "01005", "01020");
          enemyHere(game, "01005", MINION);
        },
        bag: ["0"],
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
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (game) => {
        hand(game, DAISY, "01025");
        hand(game, DAISY, "01025"); // two Vicious Blows
        enemyHere(game, ROLAND, MINION, false);
      },
      bag: ["0"],
    });
    r = pick(r, /^Fight/);
    while (r.state.pending?.kind === "commit" && r.state.pending.inv === ROLAND)
      r = pick(r, "done"); // Roland commits nothing
    expect(r.state.pending?.inv).toBe(DAISY);
    expect(r.state.pending?.kind).toBe("commit");
    r = pick(r, /^Commit Vicious Blow/);
    expect(r.state.pending?.inv).toBe(DAISY);
    expect(options(r).some((o) => o.startsWith("Commit"))).toBe(false);
    expect(options(r).some((o) => o.startsWith("Take back"))).toBe(true);
  });
});

describe("automatic results", () => {
  it("an auto-fail counts the skill value as 0: Rotting Remains fails by its whole difficulty", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (game) => {
        moveCard(game, createCard(game, "01163", ZONE.Limbo, null), ZONE.EncounterDeck, {
          top: true,
        }); // the next mythos phase draws it
      },
      bag: ["autoFail"],
    });
    r = toTurn(pick(r, "End turn"), (x) => x.state.round === 2 && x.state.pending?.kind === "turn");
    expect(invStateIn(r.state, ROLAND).horror).toBe(3);
  });
  it("a known automatic success reveals no token and counts the difficulty as 0", () => {
    let r = nathaniel((game) => {
      hand(game, N, "60132"); // One-Two Punch (5): automatically succeeds
      hand(game, N, "60126"); // Overpower (2): draws 2 when it succeeds by 2 or more
      enemyHere(game, N, ACOLYTE);
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
    let r = game({
      investigators: [ROLAND],
      prep: (game) => {
        invStateIn(game.s, ROLAND).deck = [];
        invStateIn(game.s, ROLAND).discard = [];
      },
      bag: ["0"],
    });
    r = pick(r, /^Draw/);
    expect(invStateIn(r.state, ROLAND).status).toBe("defeated");
    expect(invStateIn(r.state, ROLAND).mentalTrauma).toBe(1);
    expect(invStateIn(r.state, ROLAND).horror).toBe(0);
  });
  it("an eliminated investigator's Cover Up resolves its 'when the game ends' ability", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (game) => {
        const id = createCard(game, "01007", ZONE.Limbo, ROLAND);
        moveCard(game, id, ZONE.Threat);
        cardRecIn(game.s, id).controller = ROLAND;
        cardRecIn(game.s, id).clues = 2;
        invStateIn(game.s, ROLAND).damage = 8;
        enemyHere(game, ROLAND);
      },
      bag: ["0"],
    });
    r = toTurn(pick(r, "End turn"));
    expect(invStateIn(r.state, ROLAND).status).toBe("defeated");
    expect(invStateIn(r.state, ROLAND).physicalTrauma).toBe(1);
    expect(invStateIn(r.state, ROLAND).mentalTrauma).toBe(1); // Cover Up, with clues left
    expect(allCardRecsIn(r.state).find((c) => c.code === "01007")!.zone).toBe("removed");
  });
});

describe("unique cards, limits and victory", () => {
  it("a second copy of a unique card is not offered", () => {
    const r = nathaniel((game) => {
      inPlay(game, N, "60107"); // Grete Wagner
      hand(game, N, "60128"); // Grete Wagner (3)
      invStateIn(game.s, N).resources = 9;
    });
    expect(offered(/^Play Grete Wagner/)(r)).toBe(false);
  });
  it("a unique encounter enemy entering play discards the player card with its title", () => {
    const saved = { unique: db.cards[ACOLYTE].unique, name: db.cards[ACOLYTE].name };
    db.cards[ACOLYTE].unique = true;
    db.cards[ACOLYTE].name = "Grete Wagner";
    try {
      let r = nathaniel((game) => {
        inPlay(game, N, "60107");
        moveCard(game, createCard(game, ACOLYTE, ZONE.Limbo, null), ZONE.EncounterDeck, {
          top: true,
        });
      });
      r = toTurn(
        pick(r, "End turn"),
        (x) => x.state.round === 2 && x.state.pending?.kind === "turn",
      );
      const grete = allCardRecsIn(r.state).find((c) => c.code === "60107")!;
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
      let r = game({
        investigators: [ROLAND],
        prep: (game) => {
          inPlay(game, ROLAND, "01020");
        },
        bag: ["0"],
      });
      r = pick(r, /^Once/);
      expect(offered(/^Once/)(r)).toBe(false);
      r = mutate(r, (game) => {
        const id = allCardRecsIn(game.s).find((c) => c.code === "01020")!.id;
        moveCard(game, id, ZONE.Hand);
        moveCard(game, id, ZONE.Play);
      });
      expect(offered(/^Once/)(r)).toBe(true);
    } finally {
      db.cards["01020"].abilities = saved;
    }
  });
  it("a resolved treachery with Victory X goes to the victory display", () => {
    db.cards["01163"].victory = 1;
    try {
      let r = game({
        investigators: [ROLAND],
        prep: (game) => {
          moveCard(game, createCard(game, "01163", ZONE.Limbo, null), ZONE.EncounterDeck, {
            top: true,
          });
        },
        bag: ["0"],
      });
      r = toTurn(
        pick(r, "End turn"),
        (x) => x.state.round === 2 && x.state.pending?.kind === "turn",
      );
      expect(
        allCardRecsIn(r.state).filter((c) => c.code === "01163" && c.zone === "victory").length,
      ).toBe(1);
    } finally {
      delete db.cards["01163"].victory;
    }
  });
});

describe("the enemy phase, upkeep and round end follow the chart", () => {
  it("patrols move, then hunters, then enemies attack, then predators", () => {
    const RATS = "01159"; // Swarm of Rats: Hunter; prey for the predator
    const saved = {
      minion: db.cards[MINION].keywords,
      acolyte: db.cards[ACOLYTE].keywords,
      rats: db.cards[RATS].keywords,
    };
    db.cards[MINION].keywords = [{ patrol: { name: "Southside" } }];
    db.cards[ACOLYTE].keywords = ["predator"];
    try {
      let patroller = "";
      let predator = "";
      let rats = "";
      const r0 = game({
        investigators: [ROLAND],
        prep: (game) => {
          const study = invStateIn(game.s, ROLAND).location!;
          const hall = addLocation(game, "01128", [["01111", "01128"]]);
          const south = addLocation(game, "01126", [["01128", "01126"]]);
          const at = (code: string, loc: string) => {
            const id = createCard(game, code, ZONE.Enemy);
            moveCard(game, id, ZONE.Enemy, { location: loc });
            return id;
          };
          patroller = at(MINION, hall);
          rats = at(RATS, hall); // hunts Roland in the Study
          enemyHere(game, ROLAND, "01160");
          predator = at(ACOLYTE, south);
          at("01159", south); // the predator's prey
          void study;
        },
      });
      const r = inject(r0, () => {}, { t: STEP.EnemyPhase });
      const log = r.state.log.slice(r0.state.log.length);
      const first = (pred: (e: (typeof log)[number]) => boolean) => log.findIndex(pred);
      const patrol = first((e) => e.type === "enemyMove" && e.card === patroller);
      const hunt = first((e) => e.type === "enemyMove" && e.card === rats);
      const attack = first((e) => e.type === "attack" && e.card !== predator);
      const prey = first((e) => e.type === "attack" && e.card === predator);
      expect([patrol, hunt, attack, prey].every((k) => k >= 0)).toBe(true);
      expect(patrol < hunt && hunt < attack && attack < prey).toBe(true);
    } finally {
      db.cards[MINION].keywords = saved.minion;
      db.cards[ACOLYTE].keywords = saved.acolyte;
      db.cards[RATS].keywords = saved.rats;
    }
  });

  it("an enemy exhausts after its own attack, before the next enemy attacks", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (game) => {
        inPlay(game, ROLAND, "01028"); // Beat Cop: an asset that can soak, so each attack asks who takes it
        enemyHere(game, ROLAND, MINION);
        enemyHere(game, ROLAND, ACOLYTE);
      },
      bag: ["0"],
    });
    r = toTurn(pick(r, "End turn"), (x) => attacks(x) === 2 && x.state.pending?.kind === "assign");
    const exhausted = allCardRecsIn(r.state).filter(
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
      let r = game({
        investigators: [ROLAND],
        prep: (game) => {
          cardRecIn(game.s, inPlay(game, ROLAND, "01020")).exhausted = true; // Machete
          hand(game, ROLAND, "01088");
        },
        bag: ["0"],
      });
      r = toTurn(
        pick(r, "End turn"),
        (x) => x.state.phase === "upkeep" && x.state.pending?.promptKey === "playerWindow",
      );
      expect(r.state.pending?.promptKey).toBe("playerWindow");
      const machete = () =>
        allCardRecsIn(r.state).find((c) => c.code === "01020" && c.zone === "play")!;
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
      let r = game({
        investigators: [ROLAND],
        prep: (game) => {
          inPlay(game, ROLAND, "01020");
          addTempMod(game, { flag: "nonEliteCannotAttack" }, ROLAND, "round");
        },
        bag: ["0"],
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
  it("opens no window for it alone: it waits for the next turn", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (game) => {
        invStateIn(game.s, ROLAND).clues = 2;
      },
      bag: ["0"],
    });
    r = pick(r, "End turn");
    for (let k = 0; k < 100 && r.state.pending && r.state.pending.kind !== "turn"; k++) {
      expect(r.state.pending.promptKey).not.toBe("playerWindow");
      r = neutral(r);
    }
    expect(offered(/^Advance act/)(r)).toBe(true);
    const act = r.state.acts.a;
    r = pick(r, /^Advance act/);
    expect(r.state.acts.a).not.toBe(act);
    expect(invStateIn(r.state, ROLAND).clues).toBe(0);
  });
  it("is not offered without the clues", () => {
    let r = game({ investigators: [ROLAND], bag: ["0"] });
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
