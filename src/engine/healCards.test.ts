import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { card, createCard, inv, moveCard } from "./core";
import type { G } from "./core";
import type { Result } from "./engine";
import { db, gOf, mutate, options, pick, skipMulligans, start } from "./testkit";

const ROLAND = "01001";
const DAISY = "01002";
const BEAT_COP = "01028"; // an Ally

beforeAll(async () => {
  await Promise.all(["dwl", "return", "ptc", "tde", "eoe", "mig"].map(loadPack));
});

type Setup = (g: G, asset: string) => void;
/** Roland (and Daisy, if asked) at the start of a turn with `code` in play with `uses`, 2 damage and 2 horror on Roland */
function turn(code: string, setup: Setup = () => {}, invs = [ROLAND]): { r: Result; id: string } {
  let r = skipMulligans(start("the-gathering", invs, 1, { chaosBag: ["0"] as never }));
  while (r.state.pending && r.state.pending.kind !== "turn")
    r = pick(
      r,
      r.state.pending.options.some((o) => o.id === "pass")
        ? "pass"
        : /^Done/.test(r.state.pending.options[0].label)
          ? /^Done/
          : /./,
    );
  let id = "";
  r = mutate(r, (g) => {
    id = createCard(g, code, "limbo", ROLAND);
    moveCard(g, id, "play");
    g.s.cards[id].uses = db.cards[code].uses!.count;
    inv(g, ROLAND).damage = 2;
    inv(g, ROLAND).horror = 2;
    setup(g, id);
  });
  return { r, id };
}
const use = (r: Result, name: string) => pick(r, new RegExp(`^${name}`));
const state = (r: Result) => gOf(r);
const hurt = (r: Result, i = ROLAND) => ({
  damage: r.state.invs[i].damage,
  horror: r.state.invs[i].horror,
});

describe("Clarity of Mind", () => {
  it("level 0 heals 1 horror and spends a charge", () => {
    const { r: r0, id } = turn("02030");
    const r = use(r0, "Clarity of Mind");
    expect(hurt(r)).toEqual({ damage: 2, horror: 1 });
    expect(card(state(r), id).uses).toBe(2);
  });

  it("level 3 heals 2 horror from among the investigators, a point at a time", () => {
    const { r: r0, id } = turn(
      "51008",
      (g) => {
        inv(g, DAISY).horror = 1;
        inv(g, DAISY).location = inv(g, ROLAND).location;
      },
      [ROLAND, DAISY],
    );
    let r = use(r0, "Clarity of Mind");
    expect(options(r)).toEqual(["Roland Banks", "Daisy Walker"]);
    r = pick(r, "Daisy Walker");
    r = pick(r, "Roland Banks");
    expect(hurt(r)).toEqual({ damage: 2, horror: 1 });
    expect(hurt(r, DAISY)).toEqual({ damage: 0, horror: 0 });
    expect(card(state(r), id).uses).toBe(3);
  });
});

describe("the heals that cost something", () => {
  it("Smoking Pipe: take 1 damage, exhaust, spend a supply, heal 1 horror", () => {
    const { r: r0, id } = turn("02116");
    const r = use(r0, "Smoking Pipe");
    expect(hurt(r)).toEqual({ damage: 3, horror: 1 });
    expect(card(state(r), id)).toMatchObject({ exhausted: true, uses: 2 });
  });

  it("Painkillers: take 1 horror, exhaust, spend a supply, heal 1 damage", () => {
    const { r: r0, id } = turn("02117");
    const r = use(r0, "Painkillers");
    expect(hurt(r)).toEqual({ damage: 1, horror: 3 });
    expect(card(state(r), id)).toMatchObject({ exhausted: true, uses: 2 });
  });
});

describe("healing damage", () => {
  it("Strange Solution heals 2 damage", () => {
    const { r: r0, id } = turn("02262");
    const r = use(r0, "Strange Solution");
    expect(hurt(r)).toEqual({ damage: 0, horror: 2 });
    expect(card(state(r), id).uses).toBe(3);
  });

  it("Healing Words level 0 heals 1 damage", () => {
    const { r: r0 } = turn("06163");
    expect(hurt(use(r0, "Healing Words"))).toEqual({ damage: 1, horror: 2 });
  });

  it("Healing Words level 3 heals 2 damage from among the investigators, placed point by point", () => {
    const { r: r0 } = turn(
      "08068",
      (g) => {
        inv(g, DAISY).damage = 1;
        inv(g, DAISY).location = inv(g, ROLAND).location;
      },
      [ROLAND, DAISY],
    );
    let r = use(r0, "Healing Words");
    r = pick(r, "Daisy Walker");
    r = pick(r, "Roland Banks");
    expect(hurt(r)).toEqual({ damage: 1, horror: 2 });
    expect(hurt(r, DAISY)).toEqual({ damage: 0, horror: 0 });
  });
});

describe("healing an Ally too", () => {
  const cop = (g: G) => {
    const id = createCard(g, BEAT_COP, "limbo", ROLAND);
    moveCard(g, id, "play");
    g.s.cards[id].damage = 1;
    g.s.cards[id].horror = 1;
    return id;
  };

  it("First Aid level 3 heals 1 damage and 1 horror from an Ally, and is discarded with its last supply", () => {
    let ally = "";
    const { r: r0, id } = turn("03230", (g, aid) => {
      ally = cop(g);
      g.s.cards[aid].uses = 1;
    });
    let r = use(r0, "First Aid");
    expect(options(r)).toEqual(["Roland Banks", "Beat Cop"]);
    r = pick(r, "Beat Cop");
    expect(card(state(r), ally)).toMatchObject({ damage: 0, horror: 0 });
    expect(card(state(r), id).zone).toBe("discard");
  });

  it("Sinha's Medical Kit heals 1 damage or 1 horror, from an investigator or an Ally", () => {
    let ally = "";
    const { r: r0, id } = turn("08736", (g) => {
      ally = cop(g);
    });
    let r = use(r0, "Sinha's Medical Kit");
    r = pick(r, /horror/i);
    r = pick(r, "Beat Cop");
    expect(card(state(r), ally)).toMatchObject({ damage: 1, horror: 0 });
    expect(card(state(r), id)).toMatchObject({ exhausted: true, uses: 2 });
  });

  it("Extra Rations heals 1 damage from you or an Ally you control, and is discarded with its last supply", () => {
    let ally = "";
    const { r: r0, id } = turn("60570", (g, aid) => {
      ally = cop(g);
      g.s.cards[aid].uses = 1;
    });
    let r = use(r0, "Extra Rations");
    r = pick(r, "Beat Cop");
    expect(card(state(r), ally).damage).toBe(0);
    expect(card(state(r), id).zone).toBe("discard");
  });
});

describe("Canteen", () => {
  it("heals 2 horror, exhausting and spending a supply", () => {
    const { r: r0, id } = turn("60573");
    const r = use(r0, "Canteen");
    expect(hurt(r)).toEqual({ damage: 2, horror: 0 });
    expect(card(state(r), id)).toMatchObject({ exhausted: true, uses: 2 });
  });
});
