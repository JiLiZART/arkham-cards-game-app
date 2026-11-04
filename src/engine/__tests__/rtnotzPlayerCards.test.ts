import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { addCounter, card, def, inv } from "../context";
import { addLocation, enemyHere, game, hand, inject, inPlay, toTurn } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const MINION = "01160"; // Ghoul Minion
const RATS = "01159"; // Swarm of Rats
const FLESH_EATER = "01118"; // Flesh-Eater: non-Elite, 1 damage, 2 horror
const SOUTHSIDE = "01126";

beforeAll(() => loadPack("return"));

const attacksOn = (r: ReturnType<typeof game>, from: number) =>
  r.state.log.slice(from).filter((e) => e.type === "attack" && e.inv === ROLAND).length;

describe("the Return to the Night of the Zealot player cards", () => {
  it("Dynamite Blast (2) provokes no attack of opportunity and deals 3 damage at the chosen location", () => {
    let rats = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "50002");
        addCounter(g, ROLAND, "resources", 5);
        enemyHere(g, ROLAND, MINION);
        const south = addLocation(g, SOUTHSIDE, [["01111", SOUTHSIDE]]);
        rats = createCard(g, RATS, ZONE.Limbo);
        moveCard(g, rats, ZONE.Enemy, { location: south });
      },
    });
    const from = r.state.log.length;
    r = pick(r, /^Play Dynamite Blast/);
    r = pick(r, "Southside");
    r = toTurn(r);
    expect(attacksOn(r, from)).toBe(0);
    expect(card(gOf(r), rats).zone).not.toBe(ZONE.Enemy);
  });

  it("Mind Wipe (3): the chosen enemy deals 1 less damage and horror, its text blank, until the phase ends", () => {
    let eater = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "50008");
        addCounter(g, ROLAND, "resources", 5);
        eater = enemyHere(g, ROLAND, FLESH_EATER);
      },
    });
    const before = { damage: inv(gOf(r), ROLAND).damage, horror: inv(gOf(r), ROLAND).horror };
    r = inject(r, () => {}, { t: STEP.Window, trigger: "phaseBegins", data: { phase: "enemy" } });
    r = pick(r, /Mind Wipe/);
    r = inject(r, () => {}, {
      t: STEP.EnemyAttack,
      enemy: eater,
      inv: ROLAND,
      aoo: false,
      key: "zz",
    });
    while (r.state.pending?.kind === "assign") r = pick(r, r.state.pending.options[0].label);
    const g = gOf(r);
    expect(inv(g, ROLAND).damage - before.damage).toBe(0);
    expect(inv(g, ROLAND).horror - before.horror).toBe(1);
  });

  it("Barricade (3) turns a non-Elite enemy's spawn away from its location", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "50004");
        addCounter(g, ROLAND, "resources", 5);
        addLocation(g, SOUTHSIDE, [["01111", SOUTHSIDE]]);
      },
    });
    // Roland's starter hand may hold the core Barricade: play this one by its code
    const play = r.state.pending!.options.find(
      (o) => o.card && card(gOf(r), o.card).code === "50004",
    )!;
    r = toTurn(pick(r, play.id));
    const here = inv(gOf(r), ROLAND).location!;
    let minion = "";
    r = inject(r, (g) => void (minion = createCard(g, MINION, ZONE.Limbo)));
    r = inject(r, () => {}, { t: STEP.Spawn, enemy: minion, inv: null, at: here });
    expect(def(gOf(r), card(gOf(r), minion).location!).name).toBe("Southside");
  });

  it("Rabbit's Foot (3) searches as many top cards as the test was failed by", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => void inPlay(g, ROLAND, "50010"),
    });
    r = inject(r, () => {}, {
      t: STEP.Window,
      trigger: "skillTestFailed",
      data: { inv: ROLAND, margin: -3 },
    });
    expect(options(r).some((o) => /Rabbit's Foot/.test(o))).toBe(true);
    r = pick(r, /Rabbit's Foot/);
    expect(r.state.pending?.promptKey).toBe("searchTop");
    expect(r.state.pending?.promptVars?.n).toBe(3);
  });

  it("the level-2 trainers and Hot Streak (2) work as the core cards", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "50006");
        addCounter(g, ROLAND, "resources", 5);
      },
    });
    const res = inv(gOf(r), ROLAND).resources;
    r = toTurn(pick(r, /^Play Hot Streak/));
    expect(inv(gOf(r), ROLAND).resources).toBe(res - 5 + 10);
    for (const [high, core] of [
      ["50001", "01017"],
      ["50003", "01034"],
      ["50005", "01049"],
      ["50007", "01062"],
      ["50009", "01077"],
    ])
      expect(db.cards[high].abilities).toEqual(db.cards[core].abilities);
  });
});
