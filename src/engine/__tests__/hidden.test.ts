import { afterEach, describe, expect, it } from "vitest";
import type { CardDef } from "../../content/schema";
import { card, inv } from "../context";
import { game, inject, toTurn } from "../kits/driver";
import { skillValue } from "../queries";
import { db, gOf, options, pick } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { handCount } from "../rules/investigators";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const WHISPERS = "01163"; // Rotting Remains, a Hidden card for the test (Whispers in Your Head's shape)
const STUDY = "01111";
const saved = new Map<string, Partial<CardDef>>();
function patch(code: string, p: Partial<CardDef>) {
  if (!saved.has(code))
    saved.set(code, { keywords: db.cards[code].keywords, abilities: db.cards[code].abilities });
  Object.assign(db.cards[code], p);
}
afterEach(() => {
  for (const [code, p] of saved) Object.assign(db.cards[code], p);
  saved.clear();
});

function drawWhispers() {
  patch(WHISPERS, {
    keywords: ["hidden"],
    abilities: [
      { kind: "constant", modifiers: [{ stat: "willpower", value: -1, scope: "controller" }] },
      { kind: "action", label: "Shake off the whispers", effects: [{ op: "discardSelf" }] },
      {
        kind: "forced",
        trigger: "phaseBegins",
        effects: [{ op: "takeHorror", amount: 1, direct: true }],
      },
    ],
  });
  let id = "";
  const r0 = game({
    investigators: [ROLAND],
    prep: (g) => void (id = createCard(g, WHISPERS, ZONE.Limbo)),
  });
  const r = toTurn(
    inject(r0, (g) => moveCard(g, id, ZONE.EncounterDeck, { top: true }), {
      t: STEP.DrawEncounter,
      inv: ROLAND,
    }),
  );
  return { r, id };
}

describe("Hidden", () => {
  it("goes into the drawer's hand; its constant ability applies; the hand size counts it", () => {
    const { r, id } = drawWhispers();
    const g = gOf(r);
    expect(inv(g, ROLAND).hand).toContain(id);
    expect(skillValue(g, ROLAND, "willpower")).toBe(db.cards[ROLAND].skills!.willpower - 1);
    expect(handCount(g, ROLAND)).toBe(inv(g, ROLAND).hand.length);
  });

  it("counts three times where the location says so (Backstage)", () => {
    patch(STUDY, {
      abilities: [
        {
          kind: "constant",
          modifiers: [{ stat: "hiddenHandWeight", value: 2, scope: "investigatorsAtLocation" }],
        },
      ],
    });
    const { r } = drawWhispers();
    const g = gOf(r);
    expect(handCount(g, ROLAND)).toBe(inv(g, ROLAND).hand.length + 2);
  });

  it("a discard-from-hand effect doesn't take it", () => {
    const { r, id } = drawWhispers();
    const r1 = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "discardFromHand", amount: 1, random: true, target: "you" },
      ctx: { you: ROLAND },
    });
    expect(inv(gOf(r1), ROLAND).hand).toContain(id);
  });

  it("its own action discards it to the encounter discard", () => {
    const { r, id } = drawWhispers();
    expect(options(r)).toContain("Shake off the whispers");
    const r1 = pick(r, "Shake off the whispers");
    expect(card(gOf(r1), id).zone).toBe(ZONE.EncounterDiscard);
  });

  it("its forced ability triggers from the hand", () => {
    const { r } = drawWhispers();
    const before = inv(gOf(r), ROLAND).horror;
    const r1 = inject(r, () => {}, {
      t: STEP.Window,
      trigger: "phaseBegins",
      data: { phase: "upkeep" },
    });
    expect(inv(gOf(r1), ROLAND).horror).toBe(before + 1);
  });
});
