import { afterEach, describe, expect, it } from "vitest";
import {
  addTokens,
  cardsBeneath,
  cardsOf,
  inv,
  setController,
  setCounter,
  tokensOn,
} from "../../context";
import { createGame } from "../../index";
import { inject, toTurn } from "../../kits/driver";
import { db, gOf, skipMulligans } from "../../kits/testkit";
import { createCard, moveCard, putBeneath } from "../../movement";
import { STEP } from "../../steps/step";
import { SCENARIO_CARD, ZONE } from "../../world/constants";
import { applyScenarioEnd, scenarioSetup, startCampaign } from "../campaign";
import { flatLog } from "../log";

const ROLAND = "01001";
const LITA = "01117"; // a story asset
const MINION = "01160";
const NOTZ = "night-of-the-zealot";
const resolutions = db.scenarios["the-gathering"].resolutions;
const savedR1 = resolutions.R1;
afterEach(() => {
  resolutions.R1 = savedR1;
  delete db.scenarios["zz-part-2"];
});

describe("a checkpoint resolution", () => {
  it("records the table into the campaign log, awards no experience, and the next part's setup rebuilds it", () => {
    resolutions.R1 = {
      ...savedR1,
      checkpoint: true,
      effects: [{ do: "xp", bonus: 2, who: "each", victory: false }],
    };
    const c0 = startCampaign(db, {
      campaignId: NOTZ,
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: ROLAND, deckId: "roland-starter" }],
    });
    let study = "";
    let r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c0, 1))));
    r = inject(
      r,
      (g) => {
        study = inv(g, ROLAND).location!;
        setCounter(g, study, "clues", 1);
        addTokens(g, study, "ward", 2);
        const lita = cardsOf(g.s).find((x) => x.code === LITA)!.id;
        moveCard(g, lita, ZONE.Play);
        setController(g, lita, ROLAND);
        addTokens(g, ROLAND, "alarm", 3);
        putBeneath(g, createCard(g, MINION, ZONE.Limbo), SCENARIO_CARD);
      },
      { t: STEP.Resolution, id: "R1" },
    );
    const c = applyScenarioEnd(db, c0, r.state);
    const log = flatLog(c.log);
    expect(log["checkpoint:locations"]).toEqual(["01111"]);
    expect(log["checkpoint:clues:01111"]).toBe(1);
    expect(log["checkpoint:tokens:01111:ward"]).toBe(2);
    expect(log[`checkpoint:assets:${ROLAND}`]).toEqual([LITA]);
    expect(log[`checkpoint:tokens:${ROLAND}:alarm`]).toBe(3);
    expect(log["checkpoint:beneathScenario"]).toEqual([MINION]);
    expect(c.investigators[0].xp).toBe(0);

    // part II: its setup rebuilds the table from those entries
    db.scenarios["zz-part-2"] = {
      ...db.scenarios["the-gathering"],
      id: "zz-part-2",
      setup: [{ do: "fromCheckpoint" }, { do: "startAt", code: "01111" }],
    };
    const p2 = toTurn(
      skipMulligans(
        createGame(db, { ...scenarioSetup(db, c, 1), scenarioId: "zz-part-2", campaignLog: log }),
      ),
    );
    const g = gOf(p2);
    const at = inv(g, ROLAND).location!;
    expect(cardsOf(p2.state).find((x) => x.id === at)!.code).toBe("01111");
    expect(cardsOf(p2.state).find((x) => x.id === at)!.clues).toBe(1);
    expect(tokensOn(g, at, "ward")).toBe(2);
    expect(cardsOf(p2.state).find((x) => x.code === LITA)).toMatchObject({
      zone: ZONE.Play,
      controller: ROLAND,
    });
    expect(tokensOn(g, ROLAND, "alarm")).toBe(3);
    expect(
      cardsBeneath(g, SCENARIO_CARD).map((id) => cardsOf(p2.state).find((x) => x.id === id)!.code),
    ).toEqual([MINION]);
  });
});
