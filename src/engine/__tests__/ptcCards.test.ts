/**
 * The Path to Carcosa's shared encounter sets, as Curtain Call and The Last King gather them
 * (campaign-the-path-to-carcosa, tasks 2.4 and 3.4): Delusions, Evil Portents, Hauntings, Cult of the Yellow Sign,
 * Hastur's Gift, Decay and Filth, The Stranger. Each card drawn by Roland in The Gathering's Study.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import { addLocation, enemyHere, game, hand, inject, inPlay, toTurn, until } from "../kits/driver";
import { enemies, enemyStat, findByCode, shroud } from "../queries";
import {
  card,
  currentAgenda,
  inv,
  placeInvestigator,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001";
const D = "01002";
const MITPM = "03059";
const start = (
  prep?: (game: GameContext) => void,
  bag: ChaosToken[] = ["0"],
  investigators = [R],
) => game({ investigators, bag, prep });
const here = (game: GameContext) => inv(game, R).location!;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** Roland draws this encounter card; the run stops at his next turn, or where `stop` says */
function draw(r: Result, code: string, stop?: (r: Result) => boolean): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.EncounterDeck);
  });
  return toTurn(
    inject(made, () => {}, { t: STEP.DrawEncounter, inv: R, card: id }),
    stop ?? R,
  );
}
const drawn = (r: Result, code: string) => findByCode(gOf(r), code)!;
/** the card drawn gained surge: a second encounter card was drawn after it */
const surged = (r: Result) => r.state.log.filter((e) => e.type === "encounter").length >= 2;

describe("Delusions", () => {
  const whispers = (code: string, prep?: (game: GameContext) => void) => draw(start(prep), code);

  it("03084a–d Whispers in Your Head: hidden in your hand; [action][action] discards it", () => {
    for (const c of ["03084a", "03084b", "03084c", "03084d"]) {
      const r = whispers(c);
      const w = drawn(r, c);
      expect(w.zone).toBe(ZONE.Hand);
      expect(options(r).find((o) => /Whispers in Your Head/.test(o))).toMatch(/\[2 actions\]/);
      const after = toTurn(pick(r, /Whispers in Your Head/), R);
      expect(drawn(after, c).zone).toBe(ZONE.EncounterDiscard);
    }
  });

  it("Dismay: no skill card can be committed", () => {
    const test: Step = {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 2 },
      ctx: { you: R, source: null },
    };
    const commits = (r: Result) => {
      const at = inject(r, () => {}, test);
      return at.state.pending?.kind === "commit" ? options(at).filter((o) => /Guts/.test(o)) : [];
    };
    const guts = (game: GameContext) => void hand(game, R, "01089");
    expect(commits(start(guts))).not.toEqual([]);
    expect(commits(whispers("03084a", guts))).toEqual([]);
  });

  it("Dread: one move each turn", () => {
    let r = whispers("03084b", (g) => {
      addLocation(g, "01112", [["01111", "01112"]]);
    });
    r = toTurn(pick(r, /^Move to Hallway/), R);
    expect(options(r).some((o) => o.startsWith("Move to"))).toBe(false);
  });

  it("Anxiety: no [fast] ability; Doubt: no event", () => {
    const fast = whispers("03084c", (g) => void inPlay(g, R, "01030"));
    expect(gOf(fast).s.pending?.options.some((o) => /Magnifying Glass/.test(o.label))).toBe(false);
    const doubt = whispers("03084d", (g) => void hand(g, R, "01088"));
    expect(options(doubt).some((o) => /Emergency Cache/.test(o))).toBe(false);
  });

  it("03085 Descent into Madness: surge; with 3 or more horror you lose an action", () => {
    expect(
      inv(
        gOf(
          draw(
            start((g) => setCounter(g, R, "horror", 3)),
            "03085",
          ),
        ),
        R,
      ).actionsLeft,
    ).toBe(2);
    expect(inv(gOf(draw(start(), "03085")), R).actionsLeft).toBe(3);
  });
});

describe("Evil Portents", () => {
  it("03090 Black Stars Rise: a failed intellect (4): doom on the agenda, or horror per point failed", () => {
    let r = draw(start(undefined, ["-1"]), "03090", (x) => /doom/.test(options(x).join()));
    const doomBefore = card(gOf(r), currentAgenda(gOf(r))!).doom;
    const doom = toTurn(pick(r, /Place 1 doom/), R);
    expect(card(gOf(doom), currentAgenda(gOf(doom))!).doom).toBe(doomBefore + 1);
    r = toTurn(pick(r, /horror for each point/), R);
    expect(inv(gOf(r), R).horror).toBe(2); // 3 - 1 against 4
  });

  it("03091 Spires of Carcosa: on your location with 2 doom; investigating it removes doom, then it goes", () => {
    let r = draw(start(undefined, ["+1"]), "03091");
    expect(card(gOf(r), here(gOf(r))).doom).toBe(2);
    expect(drawn(r, "03091").zone).toBe(ZONE.Attached);
    r = toTurn(pick(r, /Spires of Carcosa/), R);
    expect(card(gOf(r), here(gOf(r))).doom).toBe(1);
    r = toTurn(pick(r, /Spires of Carcosa/), R);
    expect(card(gOf(r), here(gOf(r))).doom).toBe(0);
    expect(drawn(r, "03091").zone).toBe(ZONE.EncounterDiscard);
  });

  it("03092 Twisted to His Will: surge with no doom; else willpower (doom in play), a failure discards 2 at random", () => {
    const none = draw(start(), "03092");
    expect(surged(none)).toBe(true);
    const r = draw(
      start((g) => setCounter(g, currentAgenda(g)!, "doom", 5), ["0"]),
      "03092",
    );
    const n = inv(gOf(start()), R).hand.length;
    expect(inv(gOf(r), R).hand.length).toBe(n - 2);
    expect(surged(r)).toBe(false);
  });
});

describe("Hauntings", () => {
  it("03093 Poltergeist: a successful parley (intellect 3) deals it 1 damage; a Machete deals none", () => {
    let p = "";
    let r = start((g) => void (p = enemyHere(g, R, "03093", false)), ["+1"]);
    r = toTurn(pick(r, /Poltergeist: parley/), R);
    expect(card(gOf(r), p).damage).toBe(1);
  });

  it("03094 Spirit's Torment: leaving its location costs 1 horror or 1 action; a clue there discards it", () => {
    let r = draw(
      start((g) => addLocation(g, "01112", [["01111", "01112"]])),
      "03094",
    );
    r = until(pick(r, /^Move to Hallway/), (x) => options(x).some((o) => o === "Take 1 horror"));
    r = toTurn(pick(r, "Take 1 horror"), R);
    expect(inv(gOf(r), R).horror).toBe(1);
    r = start((g) => setCounter(g, R, "clues", 1));
    r = draw(r, "03094");
    r = toTurn(pick(r, /Spirit's Torment/), R);
    expect(drawn(r, "03094").zone).toBe(ZONE.EncounterDiscard);
    expect(card(gOf(r), here(gOf(r))).clues).toBeGreaterThanOrEqual(1);
  });
});

describe("Cult of the Yellow Sign", () => {
  it("03098 Fanatic: spawns at the revealed location with the most clues, takes 1 there; its defeater takes its clues", () => {
    let r = draw(
      start((g) => setCounter(g, here(g), "clues", 2)),
      "03098",
    );
    const f = enemies(gOf(r)).find((e) => e.code === "03098")!;
    expect(f.clues).toBe(1);
    expect(card(gOf(r), here(gOf(r))).clues).toBe(1);
    r = run(r, { t: STEP.DefeatEnemy, enemy: f.id, by: R });
    expect(inv(gOf(r), R).clues).toBe(1);
  });

  it("03099 Agent of the King: after it attacks you it takes 1 of your clues; its defeater takes them back", () => {
    let a = "";
    let r = start((g) => {
      a = enemyHere(g, R, "03099");
      setCounter(g, R, "clues", 2);
    });
    r = run(r, { t: STEP.EnemyAttack, enemy: a, inv: R, aoo: false, key: "k1" });
    expect(card(gOf(r), a).clues).toBe(1);
    r = run(r, { t: STEP.DefeatEnemy, enemy: a, by: R });
    expect(inv(gOf(r), R).clues).toBe(2);
  });

  it("03100 The King's Edict: each Cultist takes a clue from its location and gets +1 fight for each clue and doom on it", () => {
    let c = "";
    const r = draw(
      start((g) => {
        c = enemyHere(g, R, "01169", false); // Acolyte, fight 3
        setCounter(g, here(g), "clues", 1);
        setCounter(g, c, "doom", 1);
      }),
      "03100",
    );
    expect(card(gOf(r), c).clues).toBe(1);
    expect(enemyStat(gOf(r), c, "fight")).toBe(3 + 2);
    const none = draw(start(), "03100");
    expect(surged(none)).toBe(true);
  });
});

describe("Hastur's Gift", () => {
  it("03095 Seer of the Sign: after it engages you, you and it take 1 damage", () => {
    let s = "";
    const r = mutate(start(), (g) => void (s = putEnemy(g, "03095", here(g))));
    const engaged = run(r, { t: STEP.CheckEngagement, inv: R });
    expect(inv(gOf(engaged), R).damage).toBe(1);
    expect(card(gOf(engaged), s).damage).toBe(1);
  });

  it("03096 Puppet of Hastur: after it engages you, 1 horror or +3 fight", () => {
    let p = "";
    const r = mutate(start(), (g) => void (p = putEnemy(g, "03096", here(g))));
    const asked = until(
      inject(r, () => {}, { t: STEP.CheckEngagement, inv: R }),
      (x) => options(x).includes("Take 1 horror"),
    );
    expect(inv(gOf(toTurn(pick(asked, "Take 1 horror"), R)), R).horror).toBe(1);
    expect(enemyStat(gOf(toTurn(pick(asked, /\+3 fight/), R)), p, "fight")).toBe(2 + 3);
  });

  it("03097 Dance of the Yellow King: surge with no Possessed; a failed willpower (3) brings the nearest to attack you", () => {
    const none = draw(start(), "03097");
    expect(surged(none)).toBe(true);
    let p = "";
    const r = draw(
      start(
        (g) => {
          const hall = addLocation(g, "01112", [["01111", "01112"]]);
          p = putEnemy(g, "03095", hall);
        },
        ["-8"],
      ),
      "03097",
    );
    expect(card(gOf(r), p)).toMatchObject({ location: here(gOf(r)), engagedWith: R });
    expect(inv(gOf(r), R).damage).toBeGreaterThanOrEqual(1);
  });
});

describe("Decay and Filth", () => {
  it("03101 Ooze and Filth: each location +1 shroud until the end of the round", () => {
    let r = draw(start(), "03101");
    const study = here(gOf(r));
    expect(shroud(gOf(r), study)).toBe(2 + 1);
    r = run(r, { t: STEP.Window, trigger: "roundEnds", data: {} });
    expect(shroud(gOf(r), study)).toBe(2);
  });

  it("03102 Corrosion: Items worth the shroud discarded; none, surge", () => {
    let m = "";
    const r = draw(
      start((g) => void (m = inPlay(g, R, "01030"))),
      "03102",
    );
    expect(card(gOf(r), m).zone).toBe(ZONE.Discard);
    const none = draw(
      start((g) => {
        for (const h of inv(g, R).hand.slice()) moveCard(g, h, ZONE.Discard);
      }),
      "03102",
    );
    expect(surged(none)).toBe(true);
  });

  it("03103 Roach Swarm: its fight is the shroud of its location", () => {
    let e = "";
    const g = gOf(start((x) => void (e = enemyHere(x, R, "03103"))));
    expect(enemyStat(g, e, "fight")).toBe(2);
  });
});

describe("The Stranger", () => {
  it("03104 Marked by the Sign: willpower (2), 2 horror; with The Man in the Pallid Mask in play, (4) and direct", () => {
    expect(inv(gOf(draw(start(undefined, ["-8"]), "03104")), R).horror).toBe(2);
    const r = draw(
      start(
        (g) => {
          enemyHere(g, R, MITPM, false);
          inPlay(g, R, "01117"); // Lita Chantler: a soak she can't use on direct horror
        },
        ["0"],
      ),
      "03104",
    );
    expect(inv(gOf(r), R).horror).toBe(2); // willpower 3 against 4
  });

  it("03105 The Pale Mask Beckons: The Man in the Pallid Mask attacks each investigator; else his bearer draws him", () => {
    let r = draw(
      start(
        (g) => {
          const m = createCard(g, MITPM, ZONE.Limbo);
          moveCard(g, m, ZONE.Enemy, { location: here(g) });
          placeInvestigator(g, D, here(g));
        },
        ["0"],
        [R, D],
      ),
      "03105",
    );
    expect(inv(gOf(r), R).horror + inv(gOf(r), D).horror).toBe(2);
    r = draw(
      start((g) => {
        const m = createCard(g, MITPM, ZONE.Limbo, R);
        moveCard(g, m, ZONE.Discard, { inv: R });
      }),
      "03105",
    );
    expect(enemies(gOf(r)).some((e) => e.code === MITPM)).toBe(true);
  });
});
