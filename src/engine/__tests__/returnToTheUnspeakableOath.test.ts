/** Return to The Unspeakable Oath (campaign-return-to-the-path-to-carcosa, group 5): setup card 52034 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import { game, inject, lastTest, toTurn, until } from "../kits/driver";
import { enemies, enemyStat, findByCode } from "../queries";
import {
  allCards,
  attachTo,
  card,
  currentAct,
  currentAgenda,
  inv,
  placeInvestigator,
  reveal,
  setController,
  type GameContext,
} from "../context";
import { createCard, moveCard, putBeneath } from "../movement";
import { rememberedFact } from "../world/flags";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3
const D = "01002";
const CELL = "03178";
const INFIRMARY = "03174";
const GARDEN = "03176";
const DANIEL = "03182a";
const HOST = "52037";
const TREATMENT = "52038";
const CLASP = "03142";
const ESCAPE = [
  "knowTheGuardsPatrols",
  "setAFireInTheKitchen",
  "incitedAFightAmongstThePatients",
  "releasedADangerousPatient",
];

interface Opts {
  invs?: string[];
  bag?: ChaosToken[];
  seed?: number;
  log?: Record<string, unknown>;
  prep?: (game: GameContext) => void;
}
const rtuo = ({ invs = [R], bag = ["0"], seed = 1, log = {}, prep }: Opts = {}) =>
  game({
    scenario: "return-to-the-unspeakable-oath",
    investigators: invs,
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-path-to-carcosa", campaignLog: log },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const visit = (game: GameContext, code: string, who = R) => {
  const at = loc(game, code)!;
  reveal(game, at);
  placeInvestigator(game, who, at);
  return at;
};
function toAct2(game: GameContext) {
  moveCard(game, currentAct(game)!, ZONE.Removed);
  moveCard(game, allCards(game).find((c) => c.zone === ZONE.ActDeck)!.id, ZONE.Act, { deck: "a" });
}
const toEnd = (r: Result) => until(r, () => false, 400);
/** `who` draws this encounter card */
function draw(r: Result, code: string, who = R): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.EncounterDeck);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const actCodes = (game: GameContext) =>
  allCards(game)
    .filter((c) => c.zone === ZONE.ActDeck || c.zone === ZONE.Act)
    .map((c) => c.code);

describe("setup", () => {
  it("act 2 is v. III with as much Conviction as Doubt, else v. IV; neither base act 2 is in the game", () => {
    const tied = gOf(rtuo({ log: { conviction: 2, doubt: 2 } }));
    expect(actCodes(tied).sort()).toEqual(["03163", "03166", "03167", "52035"]);
    const doubt = gOf(rtuo({ log: { conviction: 2, doubt: 3 } }));
    expect(actCodes(doubt)).toContain("52036");
    for (const g of [tied, doubt])
      expect(allCards(g).some((c) => ["03164", "03165"].includes(c.code))).toBe(false);
  });

  it("Host of Insanity and Radical Treatment set aside; Preying Byakhee in the Monster pile", () => {
    const g = gOf(rtuo());
    for (const c of [HOST, TREATMENT, DANIEL]) expect(findByCode(g, c)?.zone).toBe(ZONE.SetAside);
    const byakhee = allCards(g).filter((c) => c.code === "52069");
    expect(byakhee.map((c) => c.zone)).toEqual([ZONE.SetAside, ZONE.SetAside]);
    expect(allCards(g).some((c) => c.code === "01175")).toBe(false);
  });
});

describe("act 2", () => {
  /** act 2 current, Roland in Daniel's Cell, a Monster beneath the act; the cell is then revealed */
  const atTheCell = (log: Record<string, unknown>) => {
    const r0 = rtuo({
      log,
      prep: (g) => {
        toAct2(g);
        const cell = findByCode(g, CELL, [ZONE.SetAside])!.id;
        moveCard(g, cell, ZONE.Location);
        placeInvestigator(g, R, cell);
        const m = allCards(g).find((c) => c.zone === ZONE.SetAside && c.code === "03183")!;
        moveCard(g, m.id, ZONE.Limbo);
        putBeneath(g, m.id, currentAct(g)!);
      },
    });
    return run(r0, { t: STEP.RevealLocation, location: loc(gOf(r0), CELL)! });
  };

  it("v. III: Daniel's Cell revealed advances it; the Host of Insanity spawns there; the enemies beneath are shuffled in", () => {
    const g = gOf(atTheCell({ conviction: 1 }));
    expect(codeOf(g, currentAct(g))).toBe("03166");
    const host = enemies(g).find((e) => e.code === HOST);
    expect(codeOf(g, host?.location)).toBe(CELL);
    expect(findByCode(g, "03183", [ZONE.EncounterDeck])).toBeDefined();
    expect(findByCode(g, DANIEL)?.zone).toBe(ZONE.SetAside);
  });

  it("v. IV: Daniel joins the investigator there with Radical Treatment attached", () => {
    const g = gOf(atTheCell({ doubt: 1 }));
    expect(codeOf(g, currentAct(g))).toBe("03166");
    const daniel = findByCode(g, DANIEL)!;
    expect(card(g, daniel.id)).toMatchObject({ zone: ZONE.Play, controller: R });
    expect(card(g, findByCode(g, TREATMENT)!.id)).toMatchObject({
      zone: ZONE.Attached,
      attachedTo: daniel.id,
    });
  });
});

describe("the box's cards", () => {
  it("52037 Host of Insanity: +2 health per investigator; a parley with the clasp evades it", () => {
    let host = "";
    const at = (clasp: boolean) =>
      rtuo({
        invs: [R, D],
        prep: (g) => {
          host = putEnemy(g, HOST, inv(g, R).location!, R);
          if (clasp) {
            const c = createCard(g, CLASP, ZONE.Play);
            setController(g, c, R);
          }
        },
      });
    expect(enemyStat(gOf(at(false)), host, "health")).toBe(4 + 4);
    expect(options(at(false)).some((o) => /Host of Insanity: parley/.test(o))).toBe(false);
    const r = toTurn(pick(at(true), /Host of Insanity: parley/), R);
    expect(card(gOf(r), host)).toMatchObject({ exhausted: true, engagedWith: null });
  });

  it("52038 Radical Treatment: 2 horror to Daniel's controller at the end of the round; at the Infirmary a test detaches it", () => {
    const withDaniel = (prep?: (game: GameContext) => void) =>
      rtuo({
        bag: ["+1"],
        prep: (g) => {
          const daniel = findByCode(g, DANIEL)!.id;
          moveCard(g, daniel, ZONE.Play);
          setController(g, daniel, R);
          const t = findByCode(g, TREATMENT)!.id;
          moveCard(g, t, ZONE.Attached);
          attachTo(g, t, daniel);
          prep?.(g);
        },
      });
    const horror = (game: GameContext) =>
      inv(game, R).horror + card(game, findByCode(game, DANIEL)!.id).horror;
    const r = toTurn(
      inject(withDaniel(), () => {}, { t: STEP.Window, trigger: "roundEnds", data: {} }),
      R,
    );
    expect(horror(gOf(r))).toBe(2);
    const cure = (clasp: boolean) =>
      toTurn(
        pick(
          pick(
            withDaniel((g) => {
              visit(g, INFIRMARY);
              if (clasp) setController(g, createCard(g, CLASP, ZONE.Play), R);
            }),
            /Radical Treatment: test/,
          ),
          /intellect/i,
        ),
        R,
      );
    const failed = cure(false); // intellect 3 + 1 against 6
    expect(lastTest(failed)?.difficulty).toBe(6);
    expect(findByCode(gOf(failed), TREATMENT)?.zone).toBe(ZONE.Attached);
    const cured = cure(true);
    expect(lastTest(cured)?.difficulty).toBe(3);
    expect(findByCode(gOf(cured), TREATMENT)?.zone).toBe(ZONE.Victory);
  });

  it("52039 Clouded Memory: forget a remembered plan and act 3's four-of-six count drops; else 1 horror and surge", () => {
    const r0 = rtuo({
      prep: (g) => {
        for (const f of ESCAPE.slice(0, 3)) rememberedFact.set(g, f, true);
        createCard(g, "01160", ZONE.EncounterDeck);
      },
    });
    let r = draw(r0, "52039");
    r = pick(r, /Forget something/);
    r = pick(r, /setAFireInTheKitchen|set a fire/i);
    const g = gOf(r);
    expect(rememberedFact.get(g, "setAFireInTheKitchen")).toBeFalsy();
    expect(ESCAPE.filter((f) => rememberedFact.get(g, f))).toHaveLength(2);
    // nothing remembered: only the horror and the surge
    const plain = draw(
      rtuo({ prep: (x) => void createCard(x, "01160", ZONE.EncounterDeck) }),
      "52039",
    );
    expect(options(plain).some((o) => /Forget/.test(o))).toBe(false);
  });
});

describe("the resolutions, played", () => {
  it("act 4: resigning from the Garden: R3, or R2 by force; everyone defeated: no resolution", () => {
    const at = (force: boolean) =>
      rtuo({
        prep: (g) => {
          moveCard(g, currentAct(g)!, ZONE.Removed);
          for (const c of allCards(g).filter((x) => x.zone === ZONE.ActDeck && x.code !== "03167"))
            moveCard(g, c.id, ZONE.Removed);
          moveCard(g, findByCode(g, "03167", [ZONE.ActDeck])!.id, ZONE.Act, { deck: "a" });
          visit(g, GARDEN);
          if (force) rememberedFact.set(g, "tookTheKeysByForce", true);
        },
      });
    expect(toEnd(pick(at(false), /Garden: resign/)).state.resolution).toBe("R3");
    expect(toEnd(pick(at(true), /Garden: resign/)).state.resolution).toBe("R2");
    expect(
      toEnd(inject(rtuo(), () => {}, { t: STEP.Defeated, inv: R, by: "effect" })).state.resolution,
    ).toBe("none");
    expect(codeOf(gOf(rtuo()), currentAgenda(gOf(rtuo())))).toBe("03160");
  });
});
