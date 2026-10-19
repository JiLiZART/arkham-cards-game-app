import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { card, createCard, inv, moveCard } from "./core";
import { db, mutate, options, pick, skipMulligans, start } from "./testkit";
import type { Ability } from "../content/schema";
import type { Result } from "./engine";

const ROLAND = "01001";
const DAISY = "01002";
const MACHETE = "01020";
const BEAT_COP = "01028"; // an Ally, health 2

/** the Machete, for these tests, carries this ability (the real cards come with their packs) */
let saved: Ability[];
beforeEach(() => {
  saved = db.cards[MACHETE].abilities;
});
afterEach(() => {
  db.cards[MACHETE].abilities = saved;
});

const turn = (ability: Ability, extra: (g: Parameters<Parameters<typeof mutate>[1]>[0]) => void = () => {}, invs = [ROLAND]): Result => {
  db.cards[MACHETE].abilities = [ability];
  let r = skipMulligans(start("the-gathering", invs, 1, { chaosBag: ["0"] as never }));
  while (r.state.pending && r.state.pending.kind !== "turn") r = pick(r, r.state.pending.options.some((o) => o.id === "pass") ? "pass" : /^Done/.test(r.state.pending.options[0].label) ? /^Done/ : /./);
  return mutate(r, (g) => {
    moveCard(g, createCard(g, MACHETE, "limbo", ROLAND), "play");
    extra(g);
  });
};
const beatCop = (g: Parameters<Parameters<typeof mutate>[1]>[0], damage = 0, horror = 0, owner = ROLAND) => {
  const id = createCard(g, BEAT_COP, "limbo", owner);
  moveCard(g, id, "play");
  g.s.cards[id].damage = damage;
  g.s.cards[id].horror = horror;
  return id;
};

describe("an ability's cost can take damage", () => {
  const ab: Ability = { kind: "action", label: "Patch up", cost: { takeDamage: 1 }, effects: [{ op: "heal", horror: 1 }] } as never;

  it("the controller takes it, then the ability resolves", () => {
    let r = turn(ab, (g) => {
      inv(g, ROLAND).horror = 2;
    });
    r = pick(r, "Patch up");
    while (r.state.pending && r.state.pending.kind !== "turn") r = pick(r, /./);
    expect(r.state.invs[ROLAND].damage).toBe(1);
    expect(r.state.invs[ROLAND].horror).toBe(1);
  });
});

describe("a heal can target an Ally asset", () => {
  const atLocation: Ability = { kind: "action", label: "Mend", effects: [{ op: "heal", damage: 1, horror: 1, target: "chooseAtLocation", targetAlly: "atLocation" }] } as never;

  it("the investigators at the location and the Ally assets there are offered; choosing the Ally heals it", () => {
    let cop = "";
    let r = turn(atLocation, (g) => {
      cop = beatCop(g, 1, 1);
      inv(g, ROLAND).damage = 1;
    });
    r = pick(r, "Mend");
    expect(options(r)).toEqual(["Roland Banks", "Beat Cop"]);
    r = pick(r, "Beat Cop");
    expect(card({ s: r.state, db, events: [] }, cop)).toMatchObject({ damage: 0, horror: 0 });
    expect(r.state.invs[ROLAND].damage).toBe(1); // not Roland
  });

  it("choosing the investigator heals them as before", () => {
    let r = turn(atLocation, (g) => {
      beatCop(g, 1, 0);
      inv(g, ROLAND).damage = 2;
    });
    r = pick(r, "Mend");
    r = pick(r, "Roland Banks");
    expect(r.state.invs[ROLAND].damage).toBe(1);
  });

  it("an Ally at another location is not offered; a card that is not an Ally never is", () => {
    let r = turn(atLocation, (g) => {
      beatCop(g, 1, 0, DAISY);
      inv(g, DAISY).location = null;
    }, [ROLAND, DAISY]);
    r = pick(r, "Mend");
    expect(options(r)).not.toContain("Machete");
    expect(options(r)).not.toContain("Beat Cop");
  });

  it("'controlled': you, or an Ally asset you control", () => {
    const mine: Ability = { kind: "action", label: "Mend mine", effects: [{ op: "heal", damage: 1, target: "you", targetAlly: "controlled" }] } as never;
    let cop = "";
    let r = turn(mine, (g) => {
      cop = beatCop(g, 1);
    });
    r = pick(r, "Mend mine");
    expect(options(r)).toEqual(["Roland Banks", "Beat Cop"]);
    r = pick(r, "Beat Cop");
    expect(card({ s: r.state, db, events: [] }, cop).damage).toBe(0);
  });
});
