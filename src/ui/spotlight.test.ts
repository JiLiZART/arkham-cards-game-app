import { describe, expect, it } from "vitest";
import { skipMulligans, start } from "../engine/testkit";
import type { GameEvent } from "../engine/types";
import { spotlightOf } from "./spotlight";

describe("spotlight", () => {
  const game = skipMulligans(start("the-gathering", ["01001"], 1)).state;
  const study = game.invs["01001"].location!;
  const inHand = game.invs["01001"].hand[0];
  const ev = (type: string, inv: string | null, card: string | null): GameEvent => ({ type, text: type, inv, card, data: {} });

  it("lights the map card and the investigator's portrait an event is about", () => {
    expect(spotlightOf(ev("damage", "01001", study), game)).toEqual({ cards: [study], invs: ["01001"] });
  });

  it("drops what isn't on the map; nothing on the map means no spotlight", () => {
    expect(spotlightOf(ev("doom", null, inHand), game)).toBeNull();
    expect(spotlightOf(ev("agendaAdvance", null, null), game)).toBeNull();
    expect(spotlightOf(ev("testResult", "01001", null), game)).toBeNull();
  });
});
