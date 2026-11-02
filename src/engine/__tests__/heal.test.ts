import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { card } from "../context";
import { createCard, moveCard } from "../movement";
import { db, mutate, options, pick, skipMulligans, start } from "../kits/testkit";
import type { Ability } from "../../content/schema";
import type { Result } from "../index";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";

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

const turn = (
  ability: Ability,
  extra: (game: Parameters<Parameters<typeof mutate>[1]>[0]) => void = () => {},
  invs = [ROLAND],
): Result => {
  db.cards[MACHETE].abilities = [ability];
  let r = skipMulligans(start("the-gathering", invs, 1, { chaosBag: ["0"] as never }));
  while (r.state.pending && r.state.pending.kind !== "turn")
    r = pick(
      r,
      r.state.pending.options.some((o) => o.id === "pass")
        ? "pass"
        : r.state.pending.options[0].label.startsWith("Done")
          ? /^Done/
          : /./,
    );
  return mutate(r, (game) => {
    moveCard(game, createCard(game, MACHETE, ZONE.Limbo, ROLAND), ZONE.Play);
    extra(game);
  });
};
const beatCop = (
  game: Parameters<Parameters<typeof mutate>[1]>[0],
  damage = 0,
  horror = 0,
  owner = ROLAND,
) => {
  const id = createCard(game, BEAT_COP, ZONE.Limbo, owner);
  moveCard(game, id, ZONE.Play);
  cardRecIn(game.s, id).damage = damage;
  cardRecIn(game.s, id).horror = horror;
  return id;
};

describe("an ability's cost can take damage", () => {
  const ab: Ability = {
    kind: "action",
    label: "Patch up",
    cost: { takeDamage: 1 },
    effects: [{ op: "heal", horror: 1 }],
  } as never;

  it("the controller takes it, then the ability resolves", () => {
    let r = turn(ab, (game) => {
      invStateIn(game.s, ROLAND).horror = 2;
    });
    r = pick(r, "Patch up");
    while (r.state.pending && r.state.pending.kind !== "turn") r = pick(r, /./);
    expect(invStateIn(r.state, ROLAND).damage).toBe(1);
    expect(invStateIn(r.state, ROLAND).horror).toBe(1);
  });
});

describe("a heal can target an Ally asset", () => {
  const atLocation: Ability = {
    kind: "action",
    label: "Mend",
    effects: [
      { op: "heal", damage: 1, horror: 1, target: "chooseAtLocation", targetAlly: "atLocation" },
    ],
  } as never;

  it("the investigators at the location and the Ally assets there are offered; choosing the Ally heals it", () => {
    let cop = "";
    let r = turn(atLocation, (game) => {
      cop = beatCop(game, 1, 1);
      invStateIn(game.s, ROLAND).damage = 1;
    });
    r = pick(r, "Mend");
    expect(options(r)).toEqual(["Roland Banks", "Beat Cop"]);
    r = pick(r, "Beat Cop");
    expect(card({ s: r.state, db, events: [] }, cop)).toMatchObject({ damage: 0, horror: 0 });
    expect(invStateIn(r.state, ROLAND).damage).toBe(1); // not Roland
  });

  it("choosing the investigator heals them as before", () => {
    let r = turn(atLocation, (game) => {
      beatCop(game, 1, 0);
      invStateIn(game.s, ROLAND).damage = 2;
    });
    r = pick(r, "Mend");
    r = pick(r, "Roland Banks");
    expect(invStateIn(r.state, ROLAND).damage).toBe(1);
  });

  it("an Ally at another location is not offered; a card that is not an Ally never is", () => {
    let r = turn(
      atLocation,
      (game) => {
        beatCop(game, 1, 0, DAISY);
        invStateIn(game.s, DAISY).location = null;
      },
      [ROLAND, DAISY],
    );
    r = pick(r, "Mend");
    expect(options(r)).not.toContain("Machete");
    expect(options(r)).not.toContain("Beat Cop");
  });

  it("'controlled': you, or an Ally asset you control", () => {
    const mine: Ability = {
      kind: "action",
      label: "Mend mine",
      effects: [{ op: "heal", damage: 1, target: "you", targetAlly: "controlled" }],
    } as never;
    let cop = "";
    let r = turn(mine, (game) => {
      cop = beatCop(game, 1);
    });
    r = pick(r, "Mend mine");
    expect(options(r)).toEqual(["Roland Banks", "Beat Cop"]);
    r = pick(r, "Beat Cop");
    expect(card({ s: r.state, db, events: [] }, cop).damage).toBe(0);
  });
});
