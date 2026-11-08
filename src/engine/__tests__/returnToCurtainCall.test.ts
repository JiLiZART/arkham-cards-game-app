/** Return to Curtain Call (campaign-return-to-the-path-to-carcosa, group 2): setup card 52014 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import {
  game,
  hand,
  inject,
  inPlay,
  lastTest,
  offered,
  rigBag,
  toTurn,
  until,
} from "../kits/driver";
import { connections, enemies, enemyStat, findByCode, isHidden } from "../queries";
import { handLimit } from "../rules/investigators";
import {
  addCounter,
  allCards,
  card,
  currentAct,
  currentAgenda,
  deckCards,
  inv,
  placeInvestigator,
  reveal,
  setCode,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { campaignTokens } from "../world/flags";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4; .38 Special is an Item
const D = "01002";
const THEATRE = "03049";
const LOBBY = "03050";
const BALCONY = "03051";
const BACKSTAGE = "03052";
const MITPM = "03059";
const EMISSARY = "03060";
const LOUNGE = "52018";
const PROP_SHOP = "52019";
const COMTESSE = "52020";
const VERSIONS = ["03047a", "03047b", "03047c", "52015", "52016", "52017"];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  prep?: (game: GameContext) => void;
}
const rtcc = ({ invs = [R], bag = ["0"], seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "return-to-curtain-call",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-path-to-carcosa", campaignLog: {} },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const place = (game: GameContext, code: string) => {
  const c = findByCode(game, code, [ZONE.SetAside])!;
  moveCard(game, c.id, ZONE.Location);
  reveal(game, c.id);
  setCounter(game, c.id, "clues", 0);
  return c.id;
};
const goTo = (game: GameContext, code: string, who = R) => {
  const id = loc(game, code) ?? place(game, code);
  reveal(game, id);
  placeInvestigator(game, who, id);
  return id;
};
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const code = (r: Result, id: string | null | undefined) => (id ? card(gOf(r), id).code : null);
const at = (r: Result, who = R) => code(r, inv(gOf(r), who).location);
const him = (r: Result) => enemies(gOf(r)).find((e) => e.code === MITPM);
const reference = (game: GameContext) => allCards(game).find((c) => c.code === "52014")!;
/** act 1 advanced with act 2 the given version: The Man in the Pallid Mask in play, act 2 current */
const toAct2 = (v: string, opts: Opts = {}) =>
  run(
    rtcc({
      ...opts,
      prep: (g) => (setCode(g, deckCards(g, "act")[0], v), opts.prep?.(g)),
    }),
    { t: STEP.AdvanceAct, by: "objective" },
  );
/** act 3 with the given version's spreading horror (the bag as given: the back's two tokens left out) */
const act3 = (v: string, opts: Opts = {}) => {
  const r = toAct2(v, opts);
  return rigBag(run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R }), opts.bag ?? ["0"]);
};

describe("setup", () => {
  it("act 2 is one of the six versions at random, between acts 1 and 3; the others are out of the game", () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const g = gOf(rtcc({ seed }));
      expect(card(g, currentAct(g)!).code).toBe("03046");
      const deck = deckCards(g, "act").map((id) => card(g, id).code);
      expect(deck).toHaveLength(2);
      expect(VERSIONS).toContain(deck[0]);
      expect(deck[1]).toBe("03048");
      expect(VERSIONS.filter((c) => findByCode(g, c))).toHaveLength(1);
      seen.add(deck[0]);
    }
    expect([...seen].some((c) => c.startsWith("52"))).toBe(true);
  });

  it("52014 is attached to the set-aside Royal Emissary; Theatre Lounge and Prop Shop set aside with the Doorways", () => {
    const g = gOf(rtcc());
    const emissary = findByCode(g, EMISSARY)!;
    expect(emissary.zone).toBe(ZONE.SetAside);
    expect(reference(g)).toMatchObject({ zone: ZONE.Attached, attachedTo: emissary.id });
    for (const c of [LOUNGE, PROP_SHOP, "03053", "03058"])
      expect(findByCode(g, c)?.zone).toBe(ZONE.SetAside);
    expect(findByCode(g, COMTESSE)?.zone).toBe(ZONE.EncounterDeck);
  });

  it("connections: the base's, Theatre Lounge to the Lobby, Prop Shop to Backstage", () => {
    const g = gOf(rtcc({ prep: (x) => (place(x, LOUNGE), place(x, PROP_SHOP)) }));
    const links = (c: string) => connections(g, loc(g, c)!).map((id) => card(g, id).code);
    expect(links(LOUNGE)).toEqual([LOBBY]);
    expect(links(PROP_SHOP)).toEqual([BACKSTAGE]);
    expect(links(LOBBY)).toContain(LOUNGE);
  });

  it("the Lobby's revealed side puts 2 of its 4 Doorways into play, Theatre Lounge among them on some seeds", () => {
    const pool = ["03053", "03054", "03055", LOUNGE];
    let lounge = false;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      let r = rtcc({ seed });
      r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! });
      const g = gOf(r);
      expect(pool.filter((c) => loc(g, c))).toHaveLength(2);
      lounge ||= !!loc(g, LOUNGE);
    }
    expect(lounge).toBe(true);
  });
});

describe("52014: Royal Emissary's warnings", () => {
  it("added to the victory display, he leaves 52014 a warning; back in play he has +1 health per investigator", () => {
    let r = run(rtcc({ invs: [R, D] }), { t: STEP.AdvanceAgenda });
    const emissary = enemies(gOf(r)).find((e) => e.code === EMISSARY)!;
    expect(enemyStat(gOf(r), emissary.id, "health")).toBe(4);
    r = run(r, { t: STEP.DefeatEnemy, enemy: emissary.id, by: R });
    let g = gOf(r);
    expect(card(g, emissary.id).zone).toBe(ZONE.Victory);
    expect(reference(g)).toMatchObject({
      zone: ZONE.Attached,
      attachedTo: emissary.id,
      resources: 1,
    });
    r = run(r, { t: STEP.AdvanceAgenda });
    g = gOf(r);
    expect(card(g, emissary.id).zone).toBe(ZONE.Enemy);
    expect(enemyStat(g, emissary.id, "health")).toBe(4 + 2);
    r = run(r, { t: STEP.DefeatEnemy, enemy: emissary.id, by: R });
    expect(reference(gOf(r)).resources).toBe(2);
  });
});

describe("act 2's Return versions", () => {
  const backs: [string, ChaosToken[], string][] = [
    ["52015", ["cultist", "tablet"], BACKSTAGE],
    ["52016", ["cultist", "elderThing"], BALCONY],
    ["52017", ["tablet", "elderThing"], LOBBY],
  ];
  it.each(backs)(
    "%s: he moves to the Lobby, its two tokens recorded for the campaign (the version's own pair), horror on its location",
    (v, tokens, where) => {
      let r = toAct2(v);
      r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
      const g = gOf(r);
      expect(code(r, currentAct(g))).toBe("03048");
      expect(code(r, him(r)!.location)).toBe(LOBBY);
      expect(campaignTokens.get(g)).toEqual(tokens);
      expect(card(g, loc(g, where)!).horror).toBe(1);
    },
  );

  it("mists: leaving a location with horror tests willpower (3); failed, cancel the move or lose your actions", () => {
    const leave = (choice: RegExp) => {
      let r = act3("52015", { bag: ["-8"] });
      r = mutate(
        r,
        (g) => (addCounter(g, loc(g, THEATRE)!, "horror", 1), setCounter(g, R, "actionsLeft", 3)),
      );
      r = until(
        inject(r, () => {}, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! }),
        offered(/Cancel the move/),
      );
      expect(lastTest(r)?.difficulty).toBe(3);
      return toTurn(pick(r, choice), R);
    };
    expect(at(leave(/Cancel the move/))).toBe(THEATRE);
    const lost = leave(/Lose all remaining actions/);
    expect(at(lost)).toBe(LOBBY);
    expect(inv(gOf(lost), R).actionsLeft).toBe(0);
  });

  it("overgrowth: after leaving a location with horror, a failed willpower (4) discards an Item or takes 2 damage", () => {
    let r = act3("52016", { bag: ["-8"] });
    let gun = "";
    r = mutate(r, (g) => {
      addCounter(g, loc(g, THEATRE)!, "horror", 1);
      gun = inPlay(g, R, "01006"); // Roland's .38 Special
    });
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! });
    expect(lastTest(r)?.difficulty).toBe(4);
    expect(card(gOf(r), gun).zone).toBe(ZONE.Discard);
    expect(inv(gOf(r), R).damage).toBe(0);
    let bare = act3("52016", { bag: ["-8"] });
    bare = mutate(bare, (g) => addCounter(g, loc(g, THEATRE)!, "horror", 1));
    bare = run(bare, { t: STEP.Move, inv: R, to: loc(gOf(bare), LOBBY)! });
    expect(inv(gOf(bare), R).damage).toBe(2);
  });

  it("screeching: entering a location with horror tests willpower (2) for 1 horror, once per round there", () => {
    let r = act3("52017", { bag: ["-8"] });
    r = mutate(r, (g) => goTo(g, THEATRE));
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! });
    expect(lastTest(r)?.difficulty).toBe(2);
    expect(inv(gOf(r), R).horror).toBe(1);
    r = mutate(r, (g) => placeInvestigator(g, R, loc(g, THEATRE)!));
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOBBY)! });
    expect(inv(gOf(r), R).horror).toBe(1);
  });
});

describe("the box's locations and enemy", () => {
  it("52018 Theatre Lounge: revealed, the 2 topmost hidden encounter cards go secretly into your hand", () => {
    let r = rtcc({
      prep: (g) => {
        for (const c of ["52071", "52072", "52073"]) createCard(g, c, ZONE.EncounterDiscard);
        const lounge = findByCode(g, LOUNGE, [ZONE.SetAside])!;
        moveCard(g, lounge.id, ZONE.Location);
      },
    });
    r = run(r, { t: STEP.Move, inv: R, to: loc(gOf(r), LOUNGE)! });
    const g = gOf(r);
    const hidden = inv(g, R).hand.filter((h) => isHidden(g, h));
    expect(hidden).toHaveLength(2);
    expect(card(g, hidden[0]).controller).toBe(R);
  });

  it("52019 Prop Shop: -1 shroud per horror on you while investigating it; a failure there takes 1 horror", () => {
    let r = rtcc({
      bag: ["-8"],
      prep: (g) => {
        goTo(g, PROP_SHOP);
        setCounter(g, R, "horror", 2);
      },
    });
    r = toTurn(pick(r, /^Investigate/), R);
    expect(lastTest(r)?.difficulty).toBe(7 - 2);
    expect(inv(gOf(r), R).horror).toBe(3);
  });

  it("52020 La Comtesse: defeated, she goes into your hand hidden, counting as 4 cards; discarding down to hand size costs 1 horror", () => {
    let id = "";
    let r = rtcc({
      prep: (g) => {
        id = putEnemy(g, COMTESSE, loc(g, THEATRE)!);
      },
    });
    expect(handLimit(gOf(r), R)).toBe(8);
    r = run(r, { t: STEP.DefeatEnemy, enemy: id, by: R });
    let g = gOf(r);
    expect(card(g, id).zone).toBe(ZONE.Hand);
    expect(isHidden(g, id)).toBe(true);
    expect(handLimit(g, R)).toBe(5);
    r = mutate(r, (x) => {
      for (const c of ["01088", "01088", "01088", "01088", "01088", "01088"]) hand(x, R, c);
    });
    const over = inv(gOf(r), R).hand.length - 5;
    r = until(
      inject(r, () => {}, { t: STEP.HandSize, inv: R }),
      offered(/^(?!.*discard)/),
      40,
    );
    for (let k = 0; k < over && options(r).length; k++) r = pick(r, /Emergency Cache/);
    r = toTurn(r, R);
    g = gOf(r);
    expect(inv(g, R).hand.length).toBe(5);
    expect(inv(g, R).horror).toBe(1);
  });

  it("La Comtesse spawns at the Balcony", () => {
    expect(gOf(rtcc()).db.cards[COMTESSE].spawn).toBe("Balcony");
  });
});

describe("the resolutions, played", () => {
  const act3Gone = () => {
    let r = toAct2("52015");
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    r = run(r, { t: STEP.DefeatEnemy, enemy: him(r)!.id, by: R });
    return mutate(r, (g) => goTo(g, LOBBY));
  };
  it("act 3: resigned at the Lobby, the investigators decide (→R1) or (→R2)", () => {
    const decide = () => until(pick(act3Gone(), "Lobby: resign"), offered(/warn the police/));
    expect(until(pick(decide(), /warn the police/), () => false).state.resolution).toBe("R1");
    expect(until(pick(decide(), /solve this mystery/), () => false).state.resolution).toBe("R2");
  });

  it("everyone defeated: no resolution", () => {
    const r = until(
      inject(rtcc(), () => {}, { t: STEP.Defeated, inv: R, by: "effect" }),
      () => false,
    );
    expect(r.state.resolution).toBe("none");
  });

  it("agenda 2's back: each investigator takes 100 horror: no resolution", () => {
    let r = run(rtcc({ invs: [R, D] }), { t: STEP.AdvanceAgenda });
    expect(code(r, currentAgenda(gOf(r)))).toBe("03045");
    r = until(
      inject(r, () => {}, { t: STEP.AdvanceAgenda }),
      () => false,
      300,
    );
    expect(r.state.resolution).toBe("none");
  });
});
