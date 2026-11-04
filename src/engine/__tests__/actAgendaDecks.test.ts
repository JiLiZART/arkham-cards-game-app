import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ScenarioDef } from "../../content/schema";
import {
  card,
  cardsOf,
  currentAct,
  currentActs,
  currentAgenda,
  currentAgendas,
  deckCards,
  def,
  setCounter,
} from "../context";
import { game, inject, toTurn } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";
import { STEP } from "../steps/step";

const ROLAND = "01001";
const ID = "zz-decks";
// Extracurricular Activity's agendas and acts: no written backs, so advancing only moves the decks
const QUIET_HALLS = "02042"; // doom 7
const DEAD_OF_NIGHT = "02043"; // doom 3
const BEAST = "02044"; // doom 2
const AFTER_HOURS = "02045"; // 3 clues
const WHEREABOUTS = "02046";
const SAFETY = "02047";

function scenario(decks: Pick<ScenarioDef, "acts" | "agendas">, seed = 1) {
  db.scenarios[ID] = { ...db.scenarios["the-gathering"], id: ID, ...decks };
  return game({ scenario: ID, investigators: [ROLAND], seed });
}
beforeAll(() => loadPack("dwl"));
afterEach(() => {
  delete db.scenarios[ID];
});
const codeOf = (r: ReturnType<typeof game>, id: string | null) =>
  id ? card(gOf(r), id).code : null;
const codes = (r: ReturnType<typeof game>, decks: Record<string, string | null>) =>
  Object.fromEntries(Object.entries(decks).map(([k, id]) => [k, codeOf(r, id)]));

describe("act and agenda decks", () => {
  it("a one-deck scenario keeps its act and agenda as deck a", () => {
    const r = game({ investigators: [ROLAND] });
    expect(codeOf(r, currentAct(gOf(r)))).toBe("01108");
    expect(codeOf(r, currentAgenda(gOf(r)))).toBe("01105");
    expect(codes(r, currentAgendas(gOf(r)))).toEqual({ a: "01105" });
  });

  it("with two agenda decks, doom on the agenda asks the lead which one takes it", () => {
    let r = scenario({
      acts: [AFTER_HOURS],
      agendas: { a: [DEAD_OF_NIGHT], c: [QUIET_HALLS, BEAST] },
    });
    expect(codes(r, currentAgendas(gOf(r)))).toEqual({ a: DEAD_OF_NIGHT, c: QUIET_HALLS });
    r = inject(r, () => {}, { t: STEP.PlaceDoom, card: "agenda", n: 1 });
    expect(r.state.pending?.promptKey).toBe("doomOnWhichAgenda");
    expect(options(r)).toHaveLength(2);
    r = pick(r, def(gOf(r), currentAgendas(gOf(r)).c!).name);
    expect(card(gOf(r), currentAgendas(gOf(r)).c!).doom).toBe(1);
    expect(card(gOf(r), currentAgendas(gOf(r)).a!).doom).toBe(0);
  });

  it("only the deck whose agenda reaches its threshold advances; the other agenda's doom isn't counted", () => {
    let r = scenario({
      acts: [AFTER_HOURS],
      agendas: { a: [DEAD_OF_NIGHT], c: [QUIET_HALLS, BEAST] },
    });
    const a = currentAgendas(gOf(r)).a!;
    r = inject(
      r,
      (g) => {
        setCounter(g, a, "doom", 2); // under Dead of Night's 3
        setCounter(g, currentAgendas(g).c!, "doom", 7); // Quiet Halls' 7
      },
      { t: STEP.CheckDoom },
    );
    r = toTurn(r);
    expect(codes(r, currentAgendas(gOf(r)))).toEqual({ a: DEAD_OF_NIGHT, c: BEAST });
    expect(currentAgendas(gOf(r)).a).toBe(a);
  });

  it("three act decks each advance on their own, and each is offered", () => {
    let r = scenario({
      acts: { a: [AFTER_HOURS], b: [AFTER_HOURS, WHEREABOUTS], c: [SAFETY] },
      agendas: [QUIET_HALLS],
    });
    const before = currentActs(gOf(r));
    r = inject(r, (g) => (g.s.world.tables.investigator[ROLAND].clues = 3));
    expect(options(r).filter((o) => /Advance act/.test(o))).toHaveLength(2); // the two After Hours
    r = inject(r, () => {}, { t: STEP.AdvanceAct, deck: "b", spend: true });
    r = toTurn(r);
    expect(codes(r, currentActs(gOf(r)))).toEqual({ a: AFTER_HOURS, b: WHEREABOUTS, c: SAFETY });
    expect(currentActs(gOf(r)).a).toBe(before.a);
  });

  it("a version is chosen by the log, else at random by the seed, and the other isn't created", () => {
    const versions = { oneOf: [DEAD_OF_NIGHT, BEAST], when: { not: { logHas: "zzBeast" } } };
    let r = scenario({ acts: [AFTER_HOURS], agendas: [versions] });
    expect(codeOf(r, currentAgenda(gOf(r)))).toBe(DEAD_OF_NIGHT);
    expect(cardsOf(r.state).filter((c) => c.code === BEAST)).toHaveLength(0);
    const random = (seed: number) =>
      codeOf(
        (r = scenario({ acts: [AFTER_HOURS], agendas: [{ oneOf: [DEAD_OF_NIGHT, BEAST] }] }, seed)),
        currentAgenda(gOf(r)),
      );
    const picks = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(random));
    expect(picks).toEqual(new Set([DEAD_OF_NIGHT, BEAST]));
    expect(random(3)).toBe(random(3));
  });

  it("resetDeck puts an act deck back to its first card, in order", () => {
    let r = scenario({ acts: [AFTER_HOURS, WHEREABOUTS, SAFETY], agendas: [QUIET_HALLS] });
    r = toTurn(inject(r, () => {}, { t: STEP.AdvanceAct }));
    expect(codeOf(r, currentAct(gOf(r)))).toBe(WHEREABOUTS);
    r = toTurn(
      inject(r, () => {}, { t: STEP.Eff, effect: { op: "resetDeck", kind: "act" }, ctx: {} }),
    );
    expect(codeOf(r, currentAct(gOf(r)))).toBe(AFTER_HOURS);
    expect(deckCards(gOf(r), "act").map((id) => card(gOf(r), id).code)).toEqual([
      WHEREABOUTS,
      SAFETY,
    ]);
  });

  it("the scenario reference card is an instance of its own", () => {
    const r = game({ investigators: [ROLAND] });
    const scen = cardsOf(r.state).filter((c) => c.zone === "scenario");
    expect(scen).toHaveLength(1);
    expect(db.cards[scen[0].code].type).toBe("scenario");
  });
});
