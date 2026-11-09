/** Every exploration location reaches a start location by connection symbols (ADR-0052, task 1.7). */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "./index";
import type { CardDef, ScenarioDef } from "./schema";
import { db } from "../engine/kits/testkit";
import { explorationReach } from "./loader";

const CAMP = "04050";
const THORNS = "04069";
const TRAIL = "04073";
const saved = new Map<string, CardDef>();
const patch = (code: string, fields: Partial<CardDef>) => {
  if (!saved.has(code)) saved.set(code, db.cards[code]);
  db.cards[code] = { ...db.cards[code], ...fields };
};
beforeAll(async () => {
  await loadPack("tfa");
});
afterEach(() => {
  for (const [code, d] of saved) db.cards[code] = d;
  saved.clear();
});

const scenario: ScenarioDef = {
  ...db.scenarios["the-gathering"],
  setup: [
    { do: "putIntoPlay", codes: [CAMP] },
    { do: "buildExploration", cards: [THORNS, TRAIL] },
  ],
};
const messages = () => explorationReach(db, scenario, "x.json").map((e) => e.message);

describe("exploration reach", () => {
  it("passes when each location is reached through a chain of symbols", () => {
    patch(CAMP, { symbol: "circle", connectsTo: ["square"] });
    patch(THORNS, { symbol: "square", connectsTo: ["circle", "diamond"] });
    patch(TRAIL, { symbol: "diamond", connectsTo: ["square"] });
    expect(messages()).toEqual([]);
  });

  it("fails a location whose symbol no reached location connects to", () => {
    patch(CAMP, { symbol: "circle", connectsTo: ["square"] });
    patch(THORNS, { symbol: "square", connectsTo: ["circle"] });
    patch(TRAIL, { symbol: "diamond", connectsTo: ["square"] });
    expect(messages()).toEqual([
      `${TRAIL} in the exploration deck is reached from no start location by connection symbols`,
    ]);
  });
});
