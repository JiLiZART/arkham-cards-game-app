import { describe, expect, it } from "vitest";
import { mutate, putEnemy, skipMulligans, start } from "../../engine/kits/testkit";
import { intentOf } from "./intent";
import { cardRecIn, invStateIn } from "../../engine/world/store";

describe("intentOf", () => {
  const base = skipMulligans(start("the-gathering", ["01001"], 1));
  const study = invStateIn(base.state, "01001").location!;

  it("an engaged, ready enemy attacks with its damage and horror; evaded it rests; engaged again it attacks", () => {
    let ghoul = "";
    const r = mutate(base, (game) => (ghoul = putEnemy(game, "01160", study, "01001")));
    expect(intentOf(r.state, ghoul)).toEqual({ kind: "attack", damage: 1, horror: 1 });
    // an evade exhausts and disengages
    const evaded = mutate(r, (game) =>
      Object.assign(cardRecIn(game.s, ghoul), { exhausted: true, engagedWith: null }),
    );
    expect(intentOf(evaded.state, ghoul)).toEqual({ kind: "rest" });
    // ready and engaged again
    const engaged = mutate(evaded, (game) =>
      Object.assign(cardRecIn(game.s, ghoul), { exhausted: false, engagedWith: "01001" }),
    );
    expect(intentOf(engaged.state, ghoul).kind).toBe("attack");
  });

  it("a ready hunter with nobody at its location hunts; at an investigator's location it waits", () => {
    let rats = "";
    const here = mutate(base, (game) => (rats = putEnemy(game, "01159", study))).state;
    expect(intentOf(here, rats)).toEqual({ kind: "wait" });
    // Roland elsewhere: nobody at the Study
    const away = structuredClone(here);
    invStateIn(away, "01001").location = "elsewhere";
    expect(intentOf(away, rats)).toEqual({ kind: "hunt" });
  });

  it("an unengaged non-hunter waits", () => {
    let ghoul = "";
    const r = mutate(base, (game) => (ghoul = putEnemy(game, "01160", study)));
    expect(intentOf(r.state, ghoul)).toEqual({ kind: "wait" });
  });
});
