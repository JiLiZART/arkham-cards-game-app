import type { ChaosToken } from "../../../content/schema";
import { currentTest } from "../../context";
import { describe, expect, it } from "vitest";

import { createCard, moveCard } from "../../movement";
import { testParts, testValue } from "../skillTest";
import {
  commitDone,
  gOf,
  giveCard,
  locId,
  mutate,
  pick,
  putEnemy,
  skipMulligans,
  start,
} from "../../kits/testkit";
import { cardRecIn, invStateIn } from "../../world/store";
import { ZONE } from "../../world/constants";

const ROLAND = "01001";
const DAISY = "01002";
function gathering(invs = [ROLAND], bag: ChaosToken[] = ["0"], seed = 1) {
  const r = start("the-gathering", invs, seed, { chaosBag: bag });
  return skipMulligans(r);
}

describe("skill tests", () => {
  it("investigate success discovers a clue", () => {
    let r = gathering([ROLAND], ["-1"]);
    r = pick(r, "Investigate Study");
    r = commitDone(r); // commit window
    expect(
      r.state.log.some((e) => e.type === "testResult" && /= 2 vs 2 → Success/.test(e.text)),
    ).toBe(true);
    expect(invStateIn(r.state, ROLAND).clues).toBe(1);
  });

  it("auto-fail fails regardless of skill", () => {
    let r = gathering([ROLAND], ["autoFail"]);
    r = mutate(r, (game) => {
      cardRecIn(game.s, locId(game, "01111")).clues = 2;
    });
    r = pick(r, "Investigate Study");
    r = commitDone(r);
    expect(
      r.state.log.some((e) => e.type === "testResult" && /Fail \(auto-fail\)/.test(e.text)),
    ).toBe(true);
    expect(invStateIn(r.state, ROLAND).clues).toBe(0);
  });

  it("committed icons add to the skill value", () => {
    let r = gathering([ROLAND], ["-4"]);
    r = mutate(r, (game) => {
      giveCard(game, ROLAND, "01039"); // Deduction: 1 intellect icon
      giveCard(game, ROLAND, "01093"); // Unexpected Courage: 2 wild
    });
    r = pick(r, "Investigate Study");
    r = pick(r, /Commit Unexpected Courage \(\+2\)/);
    r = pick(r, /Commit Deduction \(\+1\)/);
    r = commitDone(r);
    // 3 + 2 + 1 - 4 = 2 vs shroud 2 → success; Deduction discovers 1 extra clue
    expect(
      r.state.log.some(
        (e) =>
          e.type === "testResult" &&
          /3 \+ 3 \(committed\) − 4 \(-4\) = 2 vs 2 → Success/.test(e.text),
      ),
    ).toBe(true);
    expect(invStateIn(r.state, ROLAND).clues).toBe(2);
  });

  it("skull in The Gathering counts Ghouls at your location", () => {
    let r = gathering([ROLAND], ["skull"]);
    r = mutate(r, (game) => {
      const study = locId(game, "01111");
      putEnemy(game, "01160", study, ROLAND);
      putEnemy(game, "01160", study, ROLAND);
    });
    r = pick(r, /^Fight Ghoul Minion/);
    r = commitDone(r);
    // combat 4, skull -2 (two ghouls) → 2 vs fight 2 → success
    const res = r.state.log.find((e) => e.type === "testResult")!;
    expect(res.data?.tokenTotal).toBe(-2);
    expect(res.data?.tokenMods).toEqual([-2]);
  });
});

describe("chaos bag", () => {
  it("returns revealed tokens after the test", () => {
    let r = gathering([ROLAND], ["0", "-1", "skull"]);
    r = pick(r, "Investigate Study");
    r = commitDone(r);
    expect([...r.state.chaosBag].sort()).toEqual(["-1", "0", "skull"]);
  });
});

describe("fast abilities during the commit window", () => {
  it("Physical Training adds its bonus and spends its resource before the commit prompt asks again", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      const pt = createCard(game, "01017", ZONE.Limbo, ROLAND);
      moveCard(game, pt, ZONE.Play);
      cardRecIn(game.s, pt).controller = ROLAND;
      putEnemy(game, "01160", locId(game, "01111"), ROLAND);
    });
    r = pick(r, /^Fight Ghoul Minion/);
    const resources = invStateIn(r.state, ROLAND).resources;
    expect(testValue(gOf(r), currentTest(gOf(r))!)).toBe(4);
    r = pick(r, /Physical Training: \+1 combat/);
    expect(testValue(gOf(r), currentTest(gOf(r))!)).toBe(5);
    expect(invStateIn(r.state, ROLAND).resources).toBe(resources - 1);
    expect(r.state.pending?.kind).toBe("commit");
  });
});

describe("taking back committed cards", () => {
  const fightSetup = (invs = [ROLAND]) => {
    let r = gathering(invs, ["0"]);
    // two investigators: Roland takes the first turn
    if (r.state.pending?.options.some((o) => o.label === "Roland Banks"))
      r = pick(r, "Roland Banks");
    r = mutate(r, (game) => {
      giveCard(game, ROLAND, "01025"); // Vicious Blow: 1 combat icon
      if (invs.includes(DAISY)) giveCard(game, DAISY, "01093"); // Unexpected Courage: 2 wild
      putEnemy(game, "01160", locId(game, "01111"), ROLAND);
    });
    return pick(r, /^Fight Ghoul Minion/);
  };
  const value = (r: ReturnType<typeof gathering>) => testValue(gOf(r), currentTest(gOf(r))!);

  it("returns the card to hand, drops its icon and asks again", () => {
    let r = fightSetup();
    expect(value(r)).toBe(4);
    r = pick(r, /^Commit Vicious Blow/);
    expect(value(r)).toBe(5);
    const blow = currentTest(gOf(r))!.committed[0];
    r = pick(r, "Take back Vicious Blow");
    expect(invStateIn(r.state, ROLAND).hand).toContain(blow);
    expect(cardRecIn(r.state, blow).zone).toBe("hand");
    expect(currentTest(gOf(r))!.committed).toEqual([]);
    expect(value(r)).toBe(4);
    expect(r.state.pending?.kind).toBe("commit");
    expect(r.state.pending?.options.some((o) => o.label.startsWith("Commit Vicious Blow"))).toBe(
      true,
    );
    expect(r.state.log.at(-1)?.type).toBe("uncommit");
  });

  it("the token event names the tested card, skill, value and difficulty", () => {
    let r = fightSetup();
    const ghoul = currentTest(gOf(r))!.target;
    r = pick(r, /^Commit Vicious Blow/);
    r = commitDone(r);
    const tok = r.state.log.find((e) => e.type === "token")!;
    expect(tok.card).toBe(ghoul);
    expect(tok.data).toMatchObject({ skill: "combat", kind: "fight", value: 5, difficulty: 2 });
  });

  it("the value breakdown adds up", () => {
    let r = fightSetup();
    r = pick(r, /^Commit Vicious Blow/);
    const p = testParts(gOf(r), currentTest(gOf(r))!);
    expect(p).toMatchObject({ base: 4, mods: 0, total: 5, difficulty: 2 });
    expect(p.icons).toEqual([{ card: currentTest(gOf(r))!.committed[0], n: 1 }]);
    expect(p.base + p.icons.reduce((n, i) => n + i.n, 0) + p.mods).toBe(value(r));
  });

  it("is not offered once Done is chosen, nor for another investigator's card", () => {
    let r = fightSetup([ROLAND, DAISY]);
    r = pick(r, /^Commit Vicious Blow/);
    r = pick(r, "done");
    expect(r.state.pending?.inv).toBe(DAISY);
    expect(r.state.pending?.kind).toBe("commit");
    expect(r.state.pending?.options.some((o) => o.id.startsWith("un:"))).toBe(false);
  });
});
