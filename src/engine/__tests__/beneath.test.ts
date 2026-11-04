import { describe, expect, it } from "vitest";
import * as flags from "../world/flags";
import { card, cardsBeneath, currentAct, currentAgenda, inv } from "../context";
import { game, inject, toTurn } from "../kits/driver";
import { db, gOf } from "../kits/testkit";
import { createCard, moveCard, putBeneath } from "../movement";
import { tokenX } from "../rules/tokens";
import { STEP } from "../steps/step";
import { SCENARIO_CARD, ZONE } from "../world/constants";

const ROLAND = "01001";
const MINION = "01160"; // Ghoul Minion
const RATS = "01159"; // Swarm of Rats
const ID = "zz-beneath";

describe("cards beneath cards", () => {
  it("cards put beneath the agenda lie there in order, out of play, and a token X counts them", () => {
    const ids: string[] = [];
    const r = game({
      investigators: [ROLAND],
      prep: (g) => {
        for (let k = 0; k < 3; k++) {
          ids.push(createCard(g, MINION, ZONE.SetAside));
          putBeneath(g, ids[k], currentAgenda(g)!);
        }
      },
    });
    const g = gOf(r);
    expect(cardsBeneath(g, currentAgenda(g)!)).toEqual(ids);
    expect(ids.map((id) => card(g, id).zone)).toEqual([ZONE.Beneath, ZONE.Beneath, ZONE.Beneath]);
    expect(tokenX(g, "beneathAgenda", ROLAND)).toBe(3);
  });

  it("the pile beneath an act passes to the next act when it advances", () => {
    let id = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => putBeneath(g, (id = createCard(g, MINION, ZONE.SetAside)), currentAct(g)!),
    });
    r = toTurn(inject(r, () => {}, { t: STEP.AdvanceAct }));
    expect(cardsBeneath(gOf(r), currentAct(gOf(r))!)).toEqual([id]);
    expect(tokenX(gOf(r), "elitesInVictoryOrUnderAct", ROLAND)).toBe(1);
  });

  it("drawing the card beneath your location draws it as an encounter card and empties the pile", () => {
    let id = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) =>
        putBeneath(g, (id = createCard(g, MINION, ZONE.SetAside)), inv(g, ROLAND).location!),
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "drawBeneath", from: "yourLocation" },
        ctx: { you: ROLAND },
      }),
    );
    expect(cardsBeneath(gOf(r), inv(gOf(r), ROLAND).location!)).toEqual([]);
    expect(card(gOf(r), id).zone).toBe(ZONE.Enemy);
  });

  it("an enemy beneath the scenario card is out of play, and a random draw from there spawns it", () => {
    let id = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => putBeneath(g, (id = createCard(g, MINION, ZONE.SetAside)), SCENARIO_CARD),
    });
    expect(card(gOf(r), id).zone).toBe(ZONE.Beneath);
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "drawBeneath", from: "scenario", random: true },
        ctx: { you: ROLAND },
      }),
    );
    expect(card(gOf(r), id).zone).toBe(ZONE.Enemy);
  });

  it("the pile beneath a card is discarded when that card leaves play", () => {
    let holder = "";
    let id = "";
    const r = game({
      investigators: [ROLAND],
      prep: (g) => {
        holder = createCard(g, RATS, ZONE.Enemy);
        moveCard(g, holder, ZONE.Enemy, { location: inv(g, ROLAND).location });
        putBeneath(g, (id = createCard(g, MINION, ZONE.SetAside)), holder);
        moveCard(g, holder, ZONE.EncounterDiscard);
      },
    });
    expect(card(gOf(r), id).zone).toBe(ZONE.EncounterDiscard);
    expect(cardsBeneath(gOf(r), holder)).toEqual([]);
  });

  it("a card whose data says so keeps its pile when it leaves play", () => {
    db.cards[RATS] = { ...db.cards[RATS], beneathOnLeave: "stay" };
    let holder = "";
    let id = "";
    const r = game({
      investigators: [ROLAND],
      prep: (g) => {
        holder = createCard(g, RATS, ZONE.Enemy);
        moveCard(g, holder, ZONE.Enemy, { location: inv(g, ROLAND).location });
        putBeneath(g, (id = createCard(g, MINION, ZONE.SetAside)), holder);
        moveCard(g, holder, ZONE.EncounterDiscard);
      },
    });
    delete db.cards[RATS].beneathOnLeave;
    expect(cardsBeneath(gOf(r), holder)).toEqual([id]);
  });

  it("a setup step puts cards beneath the scenario card", () => {
    const base = db.scenarios["the-gathering"];
    db.scenarios[ID] = {
      ...base,
      id: ID,
      setup: [...base.setup, { do: "putBeneath", codes: [MINION, MINION], under: "scenario" }],
    };
    const r = game({ scenario: ID, investigators: [ROLAND] });
    delete db.scenarios[ID];
    expect(cardsBeneath(gOf(r), SCENARIO_CARD).map((id) => card(gOf(r), id).code)).toEqual([
      MINION,
      MINION,
    ]);
  });

  it("the old one-card beneath flag and the under-act list are gone", () => {
    expect("beneath" in flags).toBe(false);
    expect("underAct" in flags).toBe(false);
  });
});
